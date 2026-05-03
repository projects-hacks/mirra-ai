"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { AppState, AppAction, Message } from "@/types";
import { ToolName } from "@/lib/constants";
import { ErrorBoundary } from "./ErrorBoundary";
import { ToastProvider } from "../ui/Toast";

// ── Initial State ───────────────────────────────────
const initialState: AppState = {
  selfie: null,
  isListening: false,
  isProcessing: false,
  isConnected: false,
  messages: [],
  vtoResult: null,
  currentTool: null,
  user: null,
  closetItems: [],
  menu: {
    isVisible: true,
    activeFeature: null,
    showParameterModal: false,
  },
};

// ── Reducer ─────────────────────────────────────────
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_SELFIE":
      return { ...state, selfie: action.payload };

    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };

    case "REMOVE_LOADING":
      return {
        ...state,
        messages: state.messages.filter(
          (m) => !(m.type === "loading" && (m as { tool: ToolName }).tool === action.payload)
        ),
      };

    case "SET_VTO_RESULT":
      return { ...state, vtoResult: action.payload, isProcessing: false };

    case "SET_LISTENING":
      return { ...state, isListening: action.payload };

    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };

    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload };

    case "SET_CURRENT_TOOL":
      return { ...state, currentTool: action.payload };

    case "SET_USER":
      return { ...state, user: action.payload };

    case "SET_CLOSET":
      return { ...state, closetItems: action.payload };

    case "CLEAR_VTO":
      return { ...state, vtoResult: null };

    case "RESET":
      return { ...initialState, user: state.user };

    case "TOGGLE_MENU":
      return {
        ...state,
        menu: { ...state.menu, isVisible: !state.menu.isVisible },
      };

    case "SET_MENU_VISIBLE":
      return {
        ...state,
        menu: { ...state.menu, isVisible: action.payload },
      };

    case "SET_ACTIVE_FEATURE":
      return {
        ...state,
        menu: { ...state.menu, activeFeature: action.payload },
      };

    case "SHOW_PARAMETER_MODAL":
      return {
        ...state,
        menu: { ...state.menu, showParameterModal: action.payload },
      };

    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────
const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

// ── Provider ────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppStateContext.Provider value={state}>
          <AppDispatchContext.Provider value={dispatch}>
            {children}
          </AppDispatchContext.Provider>
        </AppStateContext.Provider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

// ── Hooks ───────────────────────────────────────────
export function useAppState(): AppState {
  return useContext(AppStateContext);
}

export function useAppDispatch(): Dispatch<AppAction> {
  return useContext(AppDispatchContext);
}

// ── Action Creators (DRY helpers) ───────────────────
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
