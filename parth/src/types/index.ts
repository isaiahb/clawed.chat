// ──────────────────────────────────────────────
// Safety
// ──────────────────────────────────────────────
export type SafetyMode = "read-only" | "draft-first" | "assisted";

export type RiskLevel = "low" | "medium" | "high";

// ──────────────────────────────────────────────
// Ask / Assistant
// ──────────────────────────────────────────────
export type AskContextChip = "email" | "calendar" | "web" | "notes" | "slack";

export type AssistantState =
  | "idle"
  | "listening"
  | "thinking"
  | "acting"
  | "done"
  | "error";

export type ResponseStyle = "short" | "medium" | "verbose";

// ──────────────────────────────────────────────
// Action Indicator
// ──────────────────────────────────────────────

export type ActionIndicatorPhase =
  | "idle"
  | "thinking"
  | "acting"
  | "done"
  | "error";

export interface ActionIndicatorStep {
  phase: ActionIndicatorPhase;
  label: string;
  icon?: string; // Lucide icon name
}

/**
 * Predefined action sequences the assistant can cycle through.
 * In v1 these are mocked / hardcoded based on context chips.
 * The UX must still feel intentional.
 */
export const ACTION_SEQUENCES: Record<string, ActionIndicatorStep[]> = {
  email: [
    { phase: "thinking", label: "Thinking…" },
    { phase: "acting", label: "Opening Gmail" },
    { phase: "acting", label: "Reading inbox" },
    { phase: "acting", label: "Drafting response" },
    { phase: "done", label: "Done" },
  ],
  calendar: [
    { phase: "thinking", label: "Thinking…" },
    { phase: "acting", label: "Checking calendar" },
    { phase: "acting", label: "Reading events" },
    { phase: "done", label: "Done" },
  ],
  slack: [
    { phase: "thinking", label: "Thinking…" },
    { phase: "acting", label: "Opening Slack" },
    { phase: "acting", label: "Reading channels" },
    { phase: "acting", label: "Drafting response" },
    { phase: "done", label: "Done" },
  ],
  web: [
    { phase: "thinking", label: "Thinking…" },
    { phase: "acting", label: "Opening browser" },
    { phase: "acting", label: "Searching" },
    { phase: "acting", label: "Reading results" },
    { phase: "done", label: "Done" },
  ],
  notes: [
    { phase: "thinking", label: "Thinking…" },
    { phase: "acting", label: "Opening Notes" },
    { phase: "acting", label: "Creating note" },
    { phase: "done", label: "Done" },
  ],
  default: [
    { phase: "thinking", label: "Thinking…" },
    { phase: "acting", label: "Processing" },
    { phase: "acting", label: "Summarizing" },
    { phase: "done", label: "Done" },
  ],
};

export interface AskSuggestedAction {
  label: string;
  type: "approval" | "navigate" | "copy" | "custom";
  approvalId?: string;
}

export type ChatCardType = "answer" | "action" | "draft" | "receipt";

export interface AskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
  context?: AskContextChip[];
  suggestedAction?: AskSuggestedAction;
  cardType?: ChatCardType;
}

export interface AskConversation {
  id: string;
  title: string;
  messages: AskMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  summary?: string;
  modeTag?: string;
  status?: "running" | "completed" | "idle";
}

// ──────────────────────────────────────────────
// Connections / Integrations
// ──────────────────────────────────────────────
export type ConnectionProvider =
  | "slack"
  | "gmail"
  | "google-calendar"
  | "outlook"
  | "outlook-calendar"
  | "notion"
  | "linear"
  | "github"
  | "custom";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

export interface ConnectionPermission {
  action: string;
  type: "read" | "write" | "approval";
  description: string;
}

export interface Connection {
  id: string;
  provider: ConnectionProvider;
  name: string;
  status: ConnectionStatus;
  connectedAt?: string;
  scopes: string[]; // plain-language scope descriptions
  permissions?: ConnectionPermission[];
  icon: string; // Lucide icon name
  lastSync?: string;
  error?: string;
  capability?: string; // one-line capability summary
}

// ──────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────
export interface UserSettings {
  safetyMode: SafetyMode;
  responseStyle: ResponseStyle;
  name: string;
  email: string;
  avatar: string | null;
  theme: "light" | "dark" | "system";
}

// ──────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
}

// ──────────────────────────────────────────────
// Agent Status
// ──────────────────────────────────────────────
export type AgentStatus =
  | "live"
  | "idle"
  | "provisioning"
  | "offline"
  | "error";
