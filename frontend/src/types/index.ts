/* ── Shared TypeScript Interfaces ── */

import { ToolName } from "@/lib/constants";

// ── Auth ────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  skinType?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredCurrency: string;
  voiceEnabled: boolean;
  createdAt: string;
}

// ── Messages ────────────────────────────────────────
export type MessageType = "user" | "agent" | "tool_result" | "loading";

export interface BaseMessage {
  id: string;
  timestamp: number;
}

export interface UserMessage extends BaseMessage {
  type: "user";
  text: string;
}

export interface AgentMessage extends BaseMessage {
  type: "agent";
  text: string;
}

export interface ToolResultMessage extends BaseMessage {
  type: "tool_result";
  tool: ToolName;
  data: unknown;
}

export interface LoadingMessage extends BaseMessage {
  type: "loading";
  text: string;
  tool: ToolName;
}

export type Message =
  | UserMessage
  | AgentMessage
  | ToolResultMessage
  | LoadingMessage;

// ── VTO Results ─────────────────────────────────────
export interface VTOResult {
  imageUrl: string;
  toolName: ToolName;
  timestamp: number;
}

// ── Skin Analysis ───────────────────────────────────
export interface SkinAnalysis {
  overallScore: number;
  acne: number;
  wrinkle: number;
  darkCircle: number;
  eyeBag: number;
  pore: number;
  redness: number;
  firmness: number;
  moisture: number;
}

export interface SkinTone {
  hex: string;
  label: string;
  undertone: string;
}

// ── Products ────────────────────────────────────────
export interface Product {
  title: string;
  price: string;
  source: string;
  link: string;
  imageUrl: string;
  rating?: number;
}

// ── Closet ──────────────────────────────────────────
export interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl: string;
  brand?: string;
  purchasePrice?: number;
}

// ── Proof Card ──────────────────────────────────────
export interface ProofCard {
  lookName: string;
  toneMatch: number;
  styleFit: number;
  skinSafe: number;
  items: ProofCardItem[];
  weatherContext: string;
  occasionContext: string;
}

export interface ProofCardItem {
  name: string;
  source: "closet" | "new";
  price?: number;
  imageUrl?: string;
}

// ── App State ───────────────────────────────────────
export interface AppState {
  selfie: string | null;
  isListening: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  messages: Message[];
  vtoResult: VTOResult | null;
  currentTool: ToolName | null;
  user: User | null;
  closetItems: ClosetItem[];
}

// ── State Actions ───────────────────────────────────
export type AppAction =
  | { type: "SET_SELFIE"; payload: string }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "REMOVE_LOADING"; payload: ToolName }
  | { type: "SET_VTO_RESULT"; payload: VTOResult }
  | { type: "SET_LISTENING"; payload: boolean }
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_CURRENT_TOOL"; payload: ToolName | null }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_CLOSET"; payload: ClosetItem[] }
  | { type: "CLEAR_VTO" }
  | { type: "RESET" };
