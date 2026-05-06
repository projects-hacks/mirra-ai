"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { SWRConfig } from "swr";
import type { AppState, AppAction, Message, VTOResult } from "@/types";
import { ToolName } from "@/lib/constants";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";

// ── Storage Keys ────────────────────────────────────
const STORAGE_KEYS = {
  MESSAGES: "mirra:messages",
  SELFIE: "mirra:selfie",
  VTO_RESULT: "mirra:vto_result",
  BODY_IMAGE: "mirra:body_tryon_image",
} as const;

const MAX_MESSAGES = 50;
const MAX_PERSISTED_IMAGE_CHARS = 4_500_000;

// ── Persistence helpers ──────────────────────────────
function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    if (
      (key === STORAGE_KEYS.SELFIE || key === STORAGE_KEYS.BODY_IMAGE)
      && typeof value === "string"
      && value.length > MAX_PERSISTED_IMAGE_CHARS
    ) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private mode — silently ignore
  }
}

function clearStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

// ── Initial State ────────────────────────────────────
const initialState: AppState = {
  selfie: null,
  isProcessing: false,
  isHydrated: false,
  messages: [],
  vtoResult: null,
  currentTool: null,
  user: null,
  closetItems: [],
};

// ── Reducer ──────────────────────────────────────────
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    // ── Hydration (19.1) ────────────────────────────
    case "HYDRATE":
      return {
        ...state,
        messages: action.payload.messages,
        selfie: action.payload.selfie,
        vtoResult: action.payload.vtoResult,
        isHydrated: true,
      };

    case "SET_SELFIE":
      return { ...state, selfie: action.payload };

    case "CLEAR_SELFIE":
      return { ...state, selfie: null };

    // ── Messages: cap at MAX_MESSAGES (19.3) ─────────
    case "ADD_MESSAGE": {
      const updated = [...state.messages, action.payload];
      const capped = updated.length > MAX_MESSAGES
        ? updated.slice(updated.length - MAX_MESSAGES)
        : updated;
      return { ...state, messages: capped };
    }

    case "REMOVE_LOADING":
      return {
        ...state,
        messages: state.messages.filter(
          (m) => !(m.type === "loading" && (m as { tool: ToolName }).tool === action.payload)
        ),
      };

    case "SET_VTO_RESULT":
      return { ...state, vtoResult: action.payload, isProcessing: false };

    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };

    case "SET_CURRENT_TOOL":
      return { ...state, currentTool: action.payload };

    case "SET_USER":
      return { ...state, user: action.payload };

    case "SET_CLOSET":
      return { ...state, closetItems: action.payload };

    case "CLEAR_VTO":
      return { ...state, vtoResult: null };

    case "RESET":
      clearStorage();
      return { ...initialState, user: state.user, isHydrated: true };

    default:
      return state;
  }
}

// ── Contexts ─────────────────────────────────────────
const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

// ── Provider ─────────────────────────────────────────
export function AppProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isFirstRender = useRef(true);

  // ── 19.1: Hydrate from localStorage on mount ──────
  useEffect(() => {
    try {
      const messages = loadFromStorage<Message[]>(STORAGE_KEYS.MESSAGES) ?? [];
      const selfie = loadFromStorage<string>(STORAGE_KEYS.SELFIE);
      const vtoResult = loadFromStorage<VTOResult>(STORAGE_KEYS.VTO_RESULT);

      // Only restore non-loading messages (loading states are transient)
      const restoredMessages = messages
        .filter((m) => m.type !== "loading" && m.type !== "tool_result")
        .slice(-MAX_MESSAGES);

      dispatch({
        type: "HYDRATE",
        payload: {
          messages: restoredMessages,
          selfie: selfie ?? null,
          vtoResult: vtoResult ?? null,
        },
      });
    } catch {
      // Hydration failed (e.g. cleared browser data) — mark done without restoring
      dispatch({
        type: "HYDRATE",
        payload: { messages: [], selfie: null, vtoResult: null },
      });
    }
  }, []);

  // ── 19.3: Persist messages on every change ────────
  useEffect(() => {
    // Skip the very first render — hydration will set state from storage
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state.isHydrated) return;

    // Only persist user/agent messages (not transient loading states)
    const persistable = state.messages
      .filter((m) => m.type === "user" || m.type === "agent")
      .slice(-MAX_MESSAGES);
    saveToStorage(STORAGE_KEYS.MESSAGES, persistable);
  }, [state.messages, state.isHydrated]);

  // ── Persist selfie on change ──────────────────────
  useEffect(() => {
    if (!state.isHydrated) return;
    if (state.selfie) {
      saveToStorage(STORAGE_KEYS.SELFIE, state.selfie);
    } else {
      try { localStorage.removeItem(STORAGE_KEYS.SELFIE); } catch { /* ignore */ }
    }
  }, [state.selfie, state.isHydrated]);

  // ── Persist VTO result on change ──────────────────
  useEffect(() => {
    if (!state.isHydrated) return;
    if (state.vtoResult) {
      saveToStorage(STORAGE_KEYS.VTO_RESULT, state.vtoResult);
    } else {
      try { localStorage.removeItem(STORAGE_KEYS.VTO_RESULT); } catch { /* ignore */ }
    }
  }, [state.vtoResult, state.isHydrated]);

  return (
    <ErrorBoundary>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          refreshWhenOffline: false,
          shouldRetryOnError: false,
          dedupingInterval: 30_000,
          focusThrottleInterval: 60_000,
        }}
      >
        <ToastProvider>
          <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
              {children}
            </AppDispatchContext.Provider>
          </AppStateContext.Provider>
        </ToastProvider>
      </SWRConfig>
    </ErrorBoundary>
  );
}

// ── Hooks ─────────────────────────────────────────────
export function useAppState(): AppState {
  return useContext(AppStateContext);
}

export function useAppDispatch(): Dispatch<AppAction> {
  return useContext(AppDispatchContext);
}

// ── Action Creators (DRY helpers) ─────────────────────
let _msgId = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++_msgId}`;
}

export function createUserMessage(text: string): Message {
  return { id: nextId(), type: "user", text, timestamp: Date.now() };
}

export function createAgentMessage(text: string): Message {
  return { id: nextId(), type: "agent", text, timestamp: Date.now() };
}

export function createToolResultMessage(tool: ToolName, data: unknown): Message {
  return { id: nextId(), type: "tool_result", tool, data, timestamp: Date.now() };
}

export function createLoadingMessage(tool: ToolName, text: string): Message {
  return { id: nextId(), type: "loading", tool, text, timestamp: Date.now() };
}
