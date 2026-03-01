// ──────────────────────────────────────────────
// Safety
// ──────────────────────────────────────────────
export type SafetyMode = "read-only" | "draft-first" | "assisted";

export type RiskLevel = "low" | "medium" | "high";

// ──────────────────────────────────────────────
// Inbox
// ──────────────────────────────────────────────
export type InboxItemType =
  | "message"
  | "calendar"
  | "reminder"
  | "task"
  | "system";

export type InboxSource =
  | "email"
  | "slack"
  | "calendar"
  | "assistant"
  | "system";

export interface InboxSuggestedAction {
  label: string;
  type:
    | "draft-reply"
    | "create-task"
    | "archive"
    | "snooze"
    | "approve"
    | "custom";
}

export interface InboxItem {
  id: string;
  type: InboxItemType;
  title: string;
  summary: string;
  source: InboxSource;
  timestamp: string; // ISO 8601
  read: boolean;
  priority: RiskLevel;
  suggestedAction?: InboxSuggestedAction;
  tags?: string[];
}

// ──────────────────────────────────────────────
// Ask / Assistant
// ──────────────────────────────────────────────
export type AskContextChip = "email" | "calendar" | "web" | "notes" | "slack";

export type AssistantState =
  | "idle"
  | "listening"
  | "thinking"
  | "done"
  | "error";

export interface AskSuggestedAction {
  label: string;
  type: "approval" | "navigate" | "copy" | "custom";
  approvalId?: string;
}

export interface AskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
  context?: AskContextChip[];
  suggestedAction?: AskSuggestedAction;
}

export interface AskConversation {
  id: string;
  title: string;
  messages: AskMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

// ──────────────────────────────────────────────
// Approvals
// ──────────────────────────────────────────────
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "edited"
  | "expired";

export interface Approval {
  id: string;
  actionSummary: string;
  risk: RiskLevel;
  status: ApprovalStatus;
  destination: string;
  preview: string;
  inputs: Record<string, unknown>;
  toolName: string;
  createdAt: string;
  resolvedAt?: string;
}

// ──────────────────────────────────────────────
// Timeline / Receipts
// ──────────────────────────────────────────────
export type TimelineStatus = "completed" | "failed" | "pending" | "undone";

export interface TimelineDetails {
  what: string;
  where: string;
  dataUsed: string;
  undoAvailable: boolean;
  error?: string;
}

export interface TimelineEntry {
  id: string;
  action: string;
  tool: string;
  status: TimelineStatus;
  timestamp: string; // ISO 8601
  details: TimelineDetails;
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

export interface Connection {
  id: string;
  provider: ConnectionProvider;
  name: string;
  status: ConnectionStatus;
  connectedAt?: string;
  scopes: string[]; // plain-language scope descriptions
  icon: string; // Lucide icon name
  lastSync?: string;
  error?: string;
}

// ──────────────────────────────────────────────
// Devices (Glasses + others)
// ──────────────────────────────────────────────
export type DeviceType = "glasses" | "watch" | "phone" | "browser" | "desktop";

export type DeviceStatus = "paired" | "disconnected" | "pairing" | "error";

export type GlanceLayout = "compact" | "standard" | "expanded";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSync?: string;
  battery?: number; // 0–100
  firmwareVersion?: string;
  glanceLayout?: GlanceLayout;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string; // "HH:mm"
  quietHoursEnd?: string; // "HH:mm"
}

// ──────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────
export interface UserSettings {
  safetyMode: SafetyMode;
  name: string;
  email: string;
  avatar: string | null;
  theme: "light" | "dark" | "system";
  glanceMaxLines: number;
  notificationsEnabled: boolean;
  weeklyDigest: boolean;
}

// ──────────────────────────────────────────────
// Stats / Dashboard
// ──────────────────────────────────────────────
export interface ToolStat {
  name: string;
  count: number;
}

export interface AppStats {
  actionsThisWeek: number;
  approvalsWaiting: number;
  undoRate: number;
  avgResponseTime: number; // seconds
  topTools: ToolStat[];
}

// ──────────────────────────────────────────────
// Pricing
// ──────────────────────────────────────────────
export interface PricingTier {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  limits: {
    devices: number | "unlimited";
    connections: number | "unlimited";
    approvalsPerDay: number | "unlimited";
    retentionDays: number | "unlimited";
  };
  cta: string;
  highlighted?: boolean;
}

// ──────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
}

// ──────────────────────────────────────────────
// Glasses simulator card (for Device page MVP)
// ──────────────────────────────────────────────
export interface GlassesCard {
  id: string;
  line1: string;
  line2?: string;
  primaryAction?: { label: string; action: string };
  secondaryAction?: { label: string; action: string };
  state: AssistantState;
}
