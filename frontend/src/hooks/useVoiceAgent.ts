"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  WS_URL,
  Endpoint,
  WS_CONFIG,
  WSClientMsg,
  WSServerMsg,
  LOADING_TEXT,
  ToolName,
} from "@/lib/constants";
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
  isConnecting: boolean;
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setNextPlayTime] = useState(0);

  const dispatch = useAppDispatch();
  const setMirraWebSocket = useCallback((socket?: WebSocket) => {
    (globalThis as typeof globalThis & { __mirraWS?: WebSocket }).__mirraWS = socket;
  }, []);

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

  async function playAudio(data: Blob | ArrayBuffer) {
    try {
      const ctx = audioCtxRef.current ?? new AudioContext({ sampleRate: 24000 });
      if (!audioCtxRef.current) audioCtxRef.current = ctx;

      const buffer = data instanceof Blob ? await data.arrayBuffer() : data;

      // Deepgram sends raw linear16 PCM (no WAV header when container="none")
      const pcmData = new Int16Array(buffer);
      const float32 = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32[i] = pcmData[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Schedule: play right after the previous chunk ends (gapless)
      const now = ctx.currentTime;
      setNextPlayTime((previousNextPlayTime) => {
        const startTime = Math.max(now, previousNextPlayTime);
        source.start(startTime);
        return startTime + audioBuffer.duration;
      });
    } catch {
      // Silently skip undecodable audio chunks
    }
  }

  // ── Handle incoming WS messages ─────────────────
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Binary = audio data → play it
      if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        void playAudio(event.data);
        return;
      }

      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "ConversationText":
            if (msg.role === "assistant" || msg.role === "agent") {
              dispatch({
                type: "ADD_MESSAGE",
                payload: createAgentMessage(msg.content),
              });
            } else if (msg.role === "user") {
              dispatch({
                type: "ADD_MESSAGE",
                payload: createUserMessage(msg.content),
              });
            }
            break;
          case "AgentStartedSpeaking":
            setNextPlayTime(0);
            break;
          case "SettingsApplied":
          case WSServerMsg.SESSION_READY:
            dispatch({ type: "SET_CONNECTED", payload: true });
            break;
          case WSServerMsg.VTO_RESULT:
            if (msg.status === "running") {
              const toolName = msg.tool as ToolName;
              const text = LOADING_TEXT[toolName] ?? "Processing…";
              dispatch({ type: "SET_PROCESSING", payload: true });
              dispatch({ type: "SET_CURRENT_TOOL", payload: toolName });
              dispatch({
                type: "ADD_MESSAGE",
                payload: createLoadingMessage(toolName, text),
              });
            } else if (msg.status === "complete") {
              dispatch({ type: "REMOVE_LOADING", payload: msg.tool });
              if (msg.image_url) {
                dispatch({
                  type: "SET_VTO_RESULT",
                  payload: {
                    imageUrl: msg.image_url,
                    toolName: msg.tool,
                    timestamp: Date.now(),
                  },
                });
              } else if (msg.scores || msg.data) {
                dispatch({
                  type: "ADD_MESSAGE",
                  payload: createToolResultMessage(msg.tool, msg.scores || msg.data || msg),
                });
              }
              dispatch({ type: "SET_PROCESSING", payload: false });
              dispatch({ type: "SET_CURRENT_TOOL", payload: null });
            }
            break;
          case WSServerMsg.ERROR:
            setError(msg.message ?? "Something went wrong");
            dispatch({ type: "SET_PROCESSING", payload: false });
            break;
          case WSServerMsg.GREETING:
          case WSServerMsg.AGENT_TEXT:
            dispatch({ type: "ADD_MESSAGE", payload: createAgentMessage(msg.text) });
            break;
          case WSServerMsg.USER_TEXT:
            dispatch({ type: "ADD_MESSAGE", payload: createUserMessage(msg.text) });
            break;
          default:
            break;
        }
      } catch {
        console.error("Failed to parse WS message");
      }
    },
    [dispatch]
  );

  // ── Start Listening (mic → WS) ──────────────────
  const startListening = useCallback(async () => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 24000 });
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

  // ── Connect ─────────────────────────────────────
  const connect = useCallback(
    function connectToVoice(selfie: string, autoStart: boolean = true) {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      setIsConnecting(true);
      setError(null);

      // Timeout: if WS doesn't open in 10s, give up
      connectTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          wsRef.current?.close();
          wsRef.current = null;
          setIsConnecting(false);
          setError("Backend unavailable. Try again later.");
          retryCountRef.current = WS_CONFIG.MAX_RETRIES; // stop retries
        }
      }, 10000);

      const ws = new WebSocket(`${WS_URL}${Endpoint.WS_VOICE}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
        }
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        retryCountRef.current = 0;

        // Expose WebSocket to window for feature menu access
        setMirraWebSocket(ws);

        // Send selfie as first message
        ws.send(
          JSON.stringify({
            type: WSClientMsg.SELFIE,
            data: selfie,
          })
        );

        if (autoStart) {
          // Need a slight delay to ensure backend has sent Settings to Deepgram
          setTimeout(() => {
             startListening();
          }, 500);
        }
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        cleanup();

        // Clear WebSocket reference
        setMirraWebSocket();

        // Reconnect with backoff (only if not timed out)
        if (retryCountRef.current < WS_CONFIG.MAX_RETRIES) {
          const delay =
            WS_CONFIG.RECONNECT_DELAYS[
              Math.min(retryCountRef.current, WS_CONFIG.RECONNECT_DELAYS.length - 1)
            ];
          retryCountRef.current++;
          setIsConnecting(true);
          setTimeout(() => connectToVoice(selfie), delay);
        } else {
          setError("Connection lost. Please refresh.");
        }
      };

      ws.onerror = () => {
        setError("Connection error");
      };
    },
    [cleanup, handleMessage, setMirraWebSocket, startListening]
  );

  // ── Disconnect ──────────────────────────────────
  const disconnect = useCallback(() => {
    retryCountRef.current = WS_CONFIG.MAX_RETRIES; // prevent reconnect
    wsRef.current?.close();
    wsRef.current = null;
    cleanup();
    setIsConnected(false);
    
    // Clear WebSocket reference
    setMirraWebSocket();
  }, [cleanup, setMirraWebSocket]);

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
    isConnecting,
    isListening,
    startListening,
    stopListening,
    error,
  };
}
