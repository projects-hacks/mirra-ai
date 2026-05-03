"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { WS_URL, Endpoint, WS_CONFIG, WSClientMsg, WSServerMsg, LOADING_TEXT } from "@/lib/constants";
import { ToolName } from "@/lib/constants";
import {
  useAppDispatch,
  createAgentMessage,
  createUserMessage,
  createLoadingMessage,
  createToolResultMessage,
} from "@/components/providers/AppProvider";

interface UseVoiceAgentReturn {
  connect: (selfie: string) => void;
  disconnect: () => void;
  isConnected: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

/**
 * Hook: manages WebSocket voice agent connection.
 *
 * Flow:
 *  1. connect(selfie) → opens WS, sends selfie
 *  2. startListening() → captures mic via AudioWorklet, streams PCM
 *  3. WS receives: agent audio, transcripts, tool results
 *  4. disconnect() → cleans up WS + audio
 *
 * Reconnects with exponential backoff on disconnect.
 */
export function useVoiceAgent(): UseVoiceAgentReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const retryCountRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useAppDispatch();

  // ── Cleanup ─────────────────────────────────────
  const cleanup = useCallback(() => {
    workletRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    workletRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;

    setIsListening(false);
  }, []);

  // ── Handle incoming WS messages ─────────────────
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Binary = audio data → play it
      if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        playAudio(event.data);
        return;
      }

      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case WSServerMsg.SESSION_READY:
            dispatch({ type: "SET_CONNECTED", payload: true });
            break;

          case WSServerMsg.GREETING:
          case WSServerMsg.AGENT_TEXT:
            dispatch({
              type: "ADD_MESSAGE",
              payload: createAgentMessage(msg.text),
            });
            break;

          case WSServerMsg.USER_TEXT:
            dispatch({
              type: "ADD_MESSAGE",
              payload: createUserMessage(msg.text),
            });
            break;

          case WSServerMsg.TOOL_START: {
            const toolName = msg.tool as ToolName;
            const text = LOADING_TEXT[toolName] ?? "Processing…";
            dispatch({ type: "SET_PROCESSING", payload: true });
            dispatch({ type: "SET_CURRENT_TOOL", payload: toolName });
            dispatch({
              type: "ADD_MESSAGE",
              payload: createLoadingMessage(toolName, text),
            });
            break;
          }

          case WSServerMsg.VTO_RESULT:
            dispatch({ type: "REMOVE_LOADING", payload: msg.tool });
            dispatch({
              type: "SET_VTO_RESULT",
              payload: {
                imageUrl: msg.image_url,
                toolName: msg.tool,
                timestamp: Date.now(),
              },
            });
            dispatch({ type: "SET_PROCESSING", payload: false });
            dispatch({ type: "SET_CURRENT_TOOL", payload: null });
            break;

          case WSServerMsg.SKIN_RESULT:
          case WSServerMsg.PRODUCT_RESULT:
          case WSServerMsg.PROOF_CARD:
            dispatch({ type: "REMOVE_LOADING", payload: msg.tool });
            dispatch({
              type: "ADD_MESSAGE",
              payload: createToolResultMessage(msg.tool, msg.data),
            });
            dispatch({ type: "SET_PROCESSING", payload: false });
            dispatch({ type: "SET_CURRENT_TOOL", payload: null });
            break;

          case WSServerMsg.ERROR:
            setError(msg.message ?? "Something went wrong");
            dispatch({ type: "SET_PROCESSING", payload: false });
            break;
        }
      } catch {
        console.error("Failed to parse WS message");
      }
    },
    [dispatch]
  );

  // ── Play audio from WS ─────────────────────────
  async function playAudio(data: Blob | ArrayBuffer) {
    try {
      const ctx = audioCtxRef.current ?? new AudioContext();
      const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
      const audioBuffer = await ctx.decodeAudioData(buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      // Silently skip undecodable audio chunks
    }
  }

  // ── Connect ─────────────────────────────────────
  const connect = useCallback(
    (selfie: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(`${WS_URL}${Endpoint.WS_VOICE}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;

        // Send selfie as first message
        ws.send(
          JSON.stringify({
            type: WSClientMsg.SELFIE,
            image: selfie,
          })
        );
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setIsConnected(false);
        cleanup();

        // Reconnect with backoff
        if (retryCountRef.current < WS_CONFIG.MAX_RETRIES) {
          const delay =
            WS_CONFIG.RECONNECT_DELAYS[
              Math.min(retryCountRef.current, WS_CONFIG.RECONNECT_DELAYS.length - 1)
            ];
          retryCountRef.current++;
          setTimeout(() => connect(selfie), delay);
        } else {
          setError("Connection lost. Please refresh.");
        }
      };

      ws.onerror = () => {
        setError("Connection error");
      };
    },
    [handleMessage, cleanup]
  );

  // ── Disconnect ──────────────────────────────────
  const disconnect = useCallback(() => {
    retryCountRef.current = WS_CONFIG.MAX_RETRIES; // prevent reconnect
    wsRef.current?.close();
    wsRef.current = null;
    cleanup();
    setIsConnected(false);
  }, [cleanup]);

  // ── Start Listening (mic → WS) ──────────────────
  const startListening = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      // Load AudioWorklet processor
      await audioCtx.audioWorklet.addModule("/audio-processor.js");

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const worklet = new AudioWorkletNode(audioCtx, "audio-processor");
      workletRef.current = worklet;

      // Send PCM chunks to WS
      worklet.port.onmessage = (e: MessageEvent) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data as ArrayBuffer);
        }
      };

      source.connect(worklet);
      worklet.connect(audioCtx.destination);

      setIsListening(true);
      dispatch({ type: "SET_LISTENING", payload: true });

      // Notify server
      ws.send(JSON.stringify({ type: WSClientMsg.READY }));
    } catch (err) {
      setError("Microphone access denied");
      console.error("Mic error:", err);
    }
  }, [dispatch]);

  // ── Stop Listening ──────────────────────────────
  const stopListening = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: WSClientMsg.STOP }));
    }

    workletRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    workletRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;

    setIsListening(false);
    dispatch({ type: "SET_LISTENING", payload: false });
  }, [dispatch]);

  // ── Cleanup on unmount ──────────────────────────
  useEffect(() => {
    return () => {
      retryCountRef.current = WS_CONFIG.MAX_RETRIES;
      wsRef.current?.close();
      cleanup();
    };
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    isListening,
    startListening,
    stopListening,
    error,
  };
}
