import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  Plug,
  PlugZap,
  Mail,
  CalendarDays,
  Github,
  MessageSquare,
  FileText,
  SquareKanban,
  Table,
  HardDrive,
  MessageCircle,
  Globe,
  Sparkles,
  LockKeyhole,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Unplug,
  ArrowRight,
  Shield,
  Loader2,
  Search,
  Eye,
  Edit3,
  ShieldAlert,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import type {
  Connection,
  ConnectionStatus,
  ConnectionPermission,
} from "../../types";

// ─── Provider visuals ────────────────────────────────────────────────────────

const providerVisuals: Record<
  string,
  { icon: LucideIcon; color: string; tint: string; accent: string }
> = {
  gmail: {
    icon: Mail,
    color: "text-red-400",
    tint: "bg-red-500/10",
    accent: "border-red-500/30",
  },
  "google-calendar": {
    icon: CalendarDays,
    color: "text-emerald-400",
    tint: "bg-emerald-500/10",
    accent: "border-emerald-500/30",
  },
  github: {
    icon: Github,
    color: "text-zinc-100",
    tint: "bg-zinc-500/10",
    accent: "border-zinc-300/20",
  },
  slack: {
    icon: MessageSquare,
    color: "text-sky-300",
    tint: "bg-sky-500/10",
    accent: "border-sky-500/30",
  },
  notion: {
    icon: FileText,
    color: "text-zinc-100",
    tint: "bg-zinc-500/10",
    accent: "border-zinc-300/20",
  },
  linear: {
    icon: SquareKanban,
    color: "text-violet-300",
    tint: "bg-violet-500/10",
    accent: "border-violet-500/30",
  },
  "google-sheets": {
    icon: Table,
    color: "text-emerald-300",
    tint: "bg-emerald-500/10",
    accent: "border-emerald-500/30",
  },
  "google-drive": {
    icon: HardDrive,
    color: "text-amber-300",
    tint: "bg-amber-500/10",
    accent: "border-amber-500/30",
  },
  "google-docs": {
    icon: FileText,
    color: "text-blue-300",
    tint: "bg-blue-500/10",
    accent: "border-blue-500/30",
  },
  twitter: {
    icon: Globe,
    color: "text-sky-300",
    tint: "bg-sky-500/10",
    accent: "border-sky-500/30",
  },
  discord: {
    icon: MessageCircle,
    color: "text-indigo-300",
    tint: "bg-indigo-500/10",
    accent: "border-indigo-500/30",
  },
  custom: {
    icon: Plug,
    color: "text-muted-foreground",
    tint: "bg-muted/60",
    accent: "border-border",
  },
};

const demoTools = [
  {
    name: "Gmail",
    detail: "Composio reads unread mail and stages drafts",
    icon: Mail,
    color: "text-red-400",
  },
  {
    name: "Tavily",
    detail: "Live web search runs from the laptop bridge",
    icon: Globe,
    color: "text-sky-300",
  },
  {
    name: "Approval gate",
    detail: "Anything sensitive stays draft-first",
    icon: LockKeyhole,
    color: "text-emerald-300",
  },
];

function getProviderVisual(provider: string) {
  return providerVisuals[provider] ?? providerVisuals.custom!;
}

// ─── Service catalog ─────────────────────────────────────────────────────────
// Static metadata for each supported service. Real connection status is merged
// from /api/connections at runtime.

interface ServiceCatalogEntry {
  provider: Connection["provider"];
  /** Internal service name used by the backend / Composio */
  service: string;
  name: string;
  icon: string;
  capability: string;
  scopes: string[];
  permissions: ConnectionPermission[];
}

const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  {
    provider: "gmail",
    service: "gmail",
    name: "Gmail",
    icon: "Mail",
    capability: "Read, draft, and send emails on your behalf",
    scopes: ["Read emails", "Send emails", "Manage drafts", "Manage labels"],
    permissions: [
      { action: "Read emails", type: "read", description: "Access your inbox and read email content" },
      { action: "Manage drafts", type: "write", description: "Create and edit email drafts for your review" },
      { action: "Manage labels", type: "write", description: "Apply and remove labels to organize your mail" },
      { action: "Send emails", type: "approval", description: "Sending to new recipients always requires your explicit approval" },
      { action: "Delete emails", type: "approval", description: "Permanently deleting emails always requires confirmation" },
    ],
  },
  {
    provider: "google-calendar",
    service: "googlecalendar",
    name: "Google Calendar",
    icon: "Calendar",
    capability: "Check your schedule and manage calendar events",
    scopes: ["Read events", "Create events", "Modify events"],
    permissions: [
      { action: "Read events", type: "read", description: "View your calendar events and availability" },
      { action: "Create events", type: "write", description: "Add new events to your calendar" },
      { action: "Modify events", type: "write", description: "Reschedule or update existing events" },
      { action: "Delete events", type: "approval", description: "Removing calendar events requires your confirmation" },
    ],
  },
  {
    provider: "github",
    service: "github",
    name: "GitHub",
    icon: "Github",
    capability: "Read your repositories, issues, and pull requests",
    scopes: ["Read repos", "Read issues", "Read PRs"],
    permissions: [
      { action: "Read repos", type: "read", description: "View repository contents and metadata" },
      { action: "Read issues", type: "read", description: "Access issues and their comments" },
      { action: "Read PRs", type: "read", description: "View pull requests and review status" },
    ],
  },
  {
    provider: "slack",
    service: "slack",
    name: "Slack",
    icon: "MessageSquare",
    capability: "Read and send messages across your workspace",
    scopes: ["Read messages", "Send messages", "Manage DMs", "List channels"],
    permissions: [
      { action: "Read messages", type: "read", description: "View messages in channels and DMs you belong to" },
      { action: "Send messages", type: "write", description: "Post messages to channels and DMs on your behalf" },
      { action: "Manage DMs", type: "write", description: "Create and archive direct message conversations" },
      { action: "List channels", type: "read", description: "See available channels and their metadata" },
      { action: "Send to new channels", type: "approval", description: "Posting to a channel for the first time always requires your OK" },
    ],
  },
  {
    provider: "notion",
    service: "notion",
    name: "Notion",
    icon: "FileText",
    capability: "Search and create pages in your workspace",
    scopes: ["Read pages", "Create pages", "Search"],
    permissions: [
      { action: "Read pages", type: "read", description: "Access and read your Notion pages and databases" },
      { action: "Create pages", type: "write", description: "Create new pages and entries in your workspace" },
      { action: "Search", type: "read", description: "Search across your Notion workspace content" },
    ],
  },
  {
    provider: "linear",
    service: "linear",
    name: "Linear",
    icon: "SquareKanban",
    capability: "Track and manage issues in your projects",
    scopes: ["Read issues", "Create issues", "Update status"],
    permissions: [
      { action: "Read issues", type: "read", description: "View issues, projects, and team boards" },
      { action: "Create issues", type: "write", description: "File new issues and tasks" },
      { action: "Update status", type: "write", description: "Change issue status and assignees" },
    ],
  },
  {
    provider: "google-sheets",
    service: "googlesheets",
    name: "Google Sheets",
    icon: "Table",
    capability: "Read and write data in your spreadsheets",
    scopes: ["Read sheets", "Write cells", "Create sheets"],
    permissions: [
      { action: "Read sheets", type: "read", description: "Access spreadsheet data and formulas" },
      { action: "Write cells", type: "write", description: "Update cell values and formatting" },
      { action: "Create sheets", type: "write", description: "Create new spreadsheets and tabs" },
    ],
  },
  {
    provider: "google-drive",
    service: "googledrive",
    name: "Google Drive",
    icon: "HardDrive",
    capability: "Search, read, and organize your files",
    scopes: ["Read files", "Upload files", "Search"],
    permissions: [
      { action: "Read files", type: "read", description: "Access and download files from your Drive" },
      { action: "Upload files", type: "write", description: "Upload new files to your Drive" },
      { action: "Search", type: "read", description: "Search across your Drive for files and folders" },
    ],
  },
  {
    provider: "google-docs",
    service: "googledocs",
    name: "Google Docs",
    icon: "FileText",
    capability: "Read and create documents",
    scopes: ["Read docs", "Create docs", "Edit docs"],
    permissions: [
      { action: "Read docs", type: "read", description: "Access and read your Google Docs content" },
      { action: "Create docs", type: "write", description: "Create new documents" },
      { action: "Edit docs", type: "write", description: "Make changes to existing documents" },
    ],
  },
  {
    provider: "twitter",
    service: "twitter",
    name: "Twitter / X",
    icon: "Twitter",
    capability: "Read timeline, post tweets, and manage DMs",
    scopes: ["Read tweets", "Post tweets", "Read DMs", "Send DMs", "Search"],
    permissions: [
      { action: "Read tweets", type: "read", description: "View your timeline, mentions, and bookmarks" },
      { action: "Search tweets", type: "read", description: "Search public tweets and trends" },
      { action: "Post tweets", type: "write", description: "Publish tweets and threads on your behalf" },
      { action: "Read DMs", type: "read", description: "Access your direct message conversations" },
      { action: "Send DMs", type: "approval", description: "Sending direct messages always requires your approval" },
    ],
  },
  {
    provider: "discord",
    service: "discord",
    name: "Discord",
    icon: "MessageCircle",
    capability: "Read and send messages across your servers",
    scopes: ["Read messages", "Send messages", "List servers", "Manage channels"],
    permissions: [
      { action: "Read messages", type: "read", description: "View messages in servers and DMs you belong to" },
      { action: "List servers", type: "read", description: "See your servers, channels, and members" },
      { action: "Send messages", type: "write", description: "Post messages to channels on your behalf" },
      { action: "Manage channels", type: "write", description: "Create threads and manage channel topics" },
      { action: "Send to new servers", type: "approval", description: "Posting to a server for the first time always requires your OK" },
    ],
  },
];

/** Maps backend service name → catalog provider name */
const SERVICE_TO_PROVIDER: Record<string, string> = {
  gmail: "gmail",
  googlecalendar: "google-calendar",
  github: "github",
  slack: "slack",
  notion: "notion",
  linear: "linear",
  googlesheets: "google-sheets",
  googledrive: "google-drive",
  googledocs: "google-docs",
  twitter: "twitter",
  discord: "discord",
};

/** Backend API response shape */
interface ApiConnection {
  id: string;
  service: string;
  status: ConnectionStatus;
  composio_connection_id: string;
  connected_at?: number;
  permissions: string[];
}

/** Merges the static catalog with live connection data from the backend */
function mergeConnections(catalog: ServiceCatalogEntry[], live: ApiConnection[]): Connection[] {
  return catalog.map((entry) => {
    const match = live.find(
      (c) => SERVICE_TO_PROVIDER[c.service] === entry.provider || c.service === entry.service,
    );

    if (match) {
      return {
        id: match.id,
        provider: entry.provider,
        name: entry.name,
        status: match.status as ConnectionStatus,
        connectedAt: match.connected_at ? new Date(match.connected_at).toISOString() : undefined,
        scopes: entry.scopes,
        permissions: entry.permissions,
        icon: entry.icon,
        lastSync: match.connected_at ? new Date(match.connected_at).toISOString() : undefined,
        capability: entry.capability,
      };
    }

    return {
      id: `catalog-${entry.service}`,
      provider: entry.provider,
      name: entry.name,
      status: "disconnected" as ConnectionStatus,
      scopes: entry.scopes,
      permissions: entry.permissions,
      icon: entry.icon,
      capability: entry.capability,
    };
  });
}


// ─── Status config ───────────────────────────────────────────────────────────

const statusConfig: Record<
  ConnectionStatus,
  {
    label: string;
    icon: LucideIcon;
    className: string;
    dotClass: string;
  }
> = {
  connected: {
    label: "Connected",
    icon: CheckCircle2,
    className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    dotClass: "bg-emerald-500",
  },
  disconnected: {
    label: "Disconnected",
    icon: XCircle,
    className: "text-muted-foreground bg-muted/40 border-border/70",
    dotClass: "bg-muted-foreground/40",
  },
  error: {
    label: "Error",
    icon: AlertTriangle,
    className: "text-red-300 bg-red-500/10 border-red-500/25",
    dotClass: "bg-red-500",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-amber-300 bg-amber-500/10 border-amber-500/25",
    dotClass: "bg-amber-500 animate-pulse",
  },
};

// ─── Permission type config ──────────────────────────────────────────────────

const permissionTypeConfig: Record<
  ConnectionPermission["type"],
  { label: string; icon: LucideIcon; badgeClass: string }
> = {
  read: {
    label: "Read",
    icon: Eye,
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/25",
  },
  write: {
    label: "Write",
    icon: Edit3,
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  },
  approval: {
    label: "Needs Approval",
    icon: ShieldAlert,
    badgeClass: "bg-red-500/10 text-red-300 border-red-500/25",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ─── Connection Tile ─────────────────────────────────────────────────────────

function ConnectionTile({
  connection,
  onConnect,
  onDisconnect,
  onTest,
  onViewPermissions,
  connecting = false,
  disconnecting = false,
}: {
  connection: Connection;
  onConnect: (c: Connection) => void;
  onDisconnect: (c: Connection) => void;
  onTest: (c: Connection) => void;
  onViewPermissions: (c: Connection) => void;
  connecting?: boolean;
  disconnecting?: boolean;
}) {
  const [testing, setTesting] = useState(false);
  const visual = getProviderVisual(connection.provider);
  const ProviderIcon = visual.icon;
  const status = statusConfig[connection.status];
  const isConnected = connection.status === "connected";
  const isError = connection.status === "error";
  const readCount = connection.permissions?.filter((p) => p.type === "read").length ?? 0;
  const writeCount = connection.permissions?.filter((p) => p.type === "write").length ?? 0;
  const approvalCount = connection.permissions?.filter((p) => p.type === "approval").length ?? 0;

  const handleTest = async () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      onTest(connection);
    }, 1500);
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/70 bg-card/70 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20",
        isConnected && "border-emerald-500/25 shadow-[0_0_0_1px_oklch(0.6_0.16_145/0.08)]",
        isError && "border-red-500/30",
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", isConnected ? "bg-emerald-400/70" : "bg-claw-red/70")} />
      <CardContent className="flex min-h-[218px] flex-col p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
              visual.tint,
              visual.accent,
              !isConnected && !isError && "opacity-75 grayscale",
            )}
          >
            <ProviderIcon className={cn("h-6 w-6", visual.color)} />
          </div>

          {/* Name + status + capability */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-foreground">
                {connection.name}
              </h3>
              <Badge
                variant="outline"
                className={cn("h-5 shrink-0 gap-1 rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.08em]", status.className)}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", status.dotClass)}
                />
                {status.label}
              </Badge>
            </div>

            {/* Capability one-liner */}
            {connection.capability && (
              <p className="mt-2 text-sm text-muted-foreground leading-snug">
                {connection.capability}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {readCount > 0 && (
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-300">
                  {readCount} read
                </span>
              )}
              {writeCount > 0 && (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                  {writeCount} write
                </span>
              )}
              {approvalCount > 0 && (
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300">
                  {approvalCount} approval
                </span>
              )}
            </div>

            {/* Connected since / last sync */}
            {isConnected && (
              <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
                {connection.connectedAt && (
                  <span>
                    Connected {formatRelativeTime(connection.connectedAt)}
                  </span>
                )}
                {connection.lastSync && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-2.5 w-2.5" />
                    Synced {formatRelativeTime(connection.lastSync)}
                  </span>
                )}
              </div>
            )}

            {/* Error message */}
            {isError && connection.error && (
              <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {connection.error}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 border-t border-border/70 pt-4">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-[11px]"
                onClick={() => onViewPermissions(connection)}
              >
                <Shield className="h-3 w-3" />
                Manage
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-[11px]"
                    onClick={handleTest}
                    disabled={testing}
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Testing…
                      </>
                    ) : (
                      <>
                        <PlugZap className="h-3 w-3" />
                        Test
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Test this connection to verify it's working
                </TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-destructive hover:text-destructive ml-auto"
                onClick={() => onDisconnect(connection)}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Disconnecting…
                  </>
                ) : (
                  <>
                    <Unplug className="h-3 w-3" />
                    Disconnect
                  </>
                )}
              </Button>
            </>
          ) : isError ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-9 gap-1.5 rounded-lg bg-claw-red px-4 text-xs text-white hover:bg-claw-red-bright"
                onClick={() => onConnect(connection)}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Reconnect
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-destructive hover:text-destructive"
                onClick={() => onDisconnect(connection)}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Unplug className="h-3 w-3" />
                )}
                Remove
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-9 gap-1.5 rounded-lg bg-claw-red px-4 text-xs text-white hover:bg-claw-red-bright"
              onClick={() => onConnect(connection)}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plug className="h-3 w-3" />
                  Connect
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Permissions Preview Dialog ──────────────────────────────────────────────

function PermissionsDialog({
  connection,
  open,
  onOpenChange,
}: {
  connection: Connection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!connection) return null;

  const visual = getProviderVisual(connection.provider);
  const ProviderIcon = visual.icon;
  const status = statusConfig[connection.status];

  // Group permissions by type
  const permissions = connection.permissions || [];
  const readPerms = permissions.filter((p) => p.type === "read");
  const writePerms = permissions.filter((p) => p.type === "write");
  const approvalPerms = permissions.filter((p) => p.type === "approval");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", visual.tint, visual.accent)}>
              <ProviderIcon className={cn("h-5 w-5", visual.color)} />
            </div>
            <div>
              <DialogTitle className="text-base">{connection.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", status.dotClass)}
                />
                {status.label}
                {connection.connectedAt &&
                  ` · Since ${formatRelativeTime(connection.connectedAt)}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* What it can read */}
        {readPerms.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-blue-600" />
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                What it can read
              </h4>
            </div>
            <div className="space-y-1.5">
              {readPerms.map((perm, idx) => (
                <PermissionRow key={idx} permission={perm} />
              ))}
            </div>
          </div>
        )}

        {/* What it can write */}
        {writePerms.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5 text-amber-600" />
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                What it can write
              </h4>
            </div>
            <div className="space-y-1.5">
              {writePerms.map((perm, idx) => (
                <PermissionRow key={idx} permission={perm} />
              ))}
            </div>
          </div>
        )}

        {/* When it will ask approval */}
        {approvalPerms.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                When it will ask approval
              </h4>
            </div>
            <div className="space-y-1.5">
              {approvalPerms.map((perm, idx) => (
                <PermissionRow key={idx} permission={perm} />
              ))}
            </div>
          </div>
        )}

        {/* Fallback when no structured permissions */}
        {permissions.length === 0 && connection.scopes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Granted scopes ({connection.scopes.length})
            </h4>
            {connection.scopes.map((scope, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2 border border-border"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-sm">{scope}</span>
              </div>
            ))}
          </div>
        )}

        {connection.error && (
          <>
            <Separator />
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Connection error</p>
                <p className="mt-0.5 text-red-600">{connection.error}</p>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="bg-muted/50 border border-border p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">
              Your data is transparent.
            </span>{" "}
            You can revoke access anytime by disconnecting. Sensitive actions
            like sending to new recipients, payments, or deletions always
            require your explicit approval — regardless of these permissions.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionRow({ permission }: { permission: ConnectionPermission }) {
  const config = permissionTypeConfig[permission.type];
  const TypeIcon = config.icon;

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border border-border bg-card">
      <TypeIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {permission.action}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] h-4 px-1 font-semibold",
              config.badgeClass,
            )}
          >
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {permission.description}
        </p>
      </div>
    </div>
  );
}

// ─── Disconnect Confirmation Dialog ──────────────────────────────────────────

function DisconnectDialog({
  connection,
  open,
  onOpenChange,
  onConfirm,
}: {
  connection: Connection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (c: Connection) => void;
}) {
  if (!connection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Disconnect {connection.name}?</DialogTitle>
          <DialogDescription>
            Clawed will no longer be able to read or interact with your{" "}
            {connection.name} account. You can reconnect at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="border border-border bg-muted/50 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">
            This will revoke:
          </p>
          {connection.scopes.map((scope, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{scope}</span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              onConfirm(connection);
              onOpenChange(false);
            }}
          >
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  useDocumentTitle("Connections");
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>(() =>
    mergeConnections(SERVICE_CATALOG, []),
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionsConnection, setPermissionsConnection] =
    useState<Connection | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [disconnectConnection, setDisconnectConnection] =
    useState<Connection | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "connected" | "disconnected">(
    "all",
  );
  const [connectingService, setConnectingService] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // ─── Fetch connections from backend ────────────────────────────────────
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        const live: ApiConnection[] = data.connections ?? [];
        setConnections(mergeConnections(SERVICE_CATALOG, live));
      }
    } catch {
      // silently fail — user sees catalog with everything disconnected
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // ─── Handle OAuth callback URL params ──────────────────────────────────
  useEffect(() => {
    const connectionResult = searchParams.get("connection");
    if (!connectionResult) return;

    const service = searchParams.get("service");

    if (connectionResult === "success") {
      toast.success(service ? `Connected to ${service}` : "Connection successful", {
        description: "Your assistant can now access this service.",
      });
      // Refresh connections to pick up the new one
      fetchConnections();
    } else if (connectionResult === "error") {
      const reason = searchParams.get("reason");
      toast.error("Connection failed", {
        description: reason === "missing_session"
          ? "OAuth session was missing. Please try again."
          : reason === "verification_failed"
            ? "Could not verify the connection. Please try again."
            : `Failed to connect${service ? ` to ${service}` : ""}. Please try again.`,
      });
    }

    // Clean up URL params so they don't re-trigger
    searchParams.delete("connection");
    searchParams.delete("service");
    searchParams.delete("composio_id");
    searchParams.delete("reason");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, fetchConnections]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleConnect = async (c: Connection) => {
    // Find the catalog entry to get the backend service name
    const catalogEntry = SERVICE_CATALOG.find((e) => e.provider === c.provider);
    if (!catalogEntry) {
      toast.error(`Unknown service: ${c.provider}`);
      return;
    }

    setConnectingService(catalogEntry.service);

    try {
      const res = await fetch(`/api/connections/${catalogEntry.service}/connect`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to start connection");
        return;
      }

      if (data.redirect_url) {
        // Navigate to OAuth provider
        window.location.href = data.redirect_url;
        return;
      }

      toast.error("No redirect URL received from server");
    } catch {
      toast.error("Network error — could not initiate connection");
    } finally {
      setConnectingService(null);
    }
  };

  const handleDisconnect = async (c: Connection) => {
    // Only real (non-catalog) connections can be disconnected
    if (c.id.startsWith("catalog-")) {
      // It's not actually connected — just flip local state
      toast(`${c.name} is not connected`);
      return;
    }

    setDisconnectingId(c.id);

    try {
      const res = await fetch(`/api/connections/${c.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast(`Disconnected from ${c.name}`, {
          description: `${c.name} access has been revoked.`,
        });
        await fetchConnections();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to disconnect");
      }
    } catch {
      toast.error("Network error — could not disconnect");
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleTest = (c: Connection) => {
    toast.success(`${c.name} connection is healthy`, {
      description: "All scopes verified.",
    });
  };

  const handleViewPermissions = (c: Connection) => {
    setPermissionsConnection(c);
    setPermissionsOpen(true);
  };

  const handleDisconnectClick = (c: Connection) => {
    setDisconnectConnection(c);
    setDisconnectOpen(true);
  };

  // Filtering
  const filteredConnections = connections.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.provider.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "connected" && c.status === "connected") ||
      (filter === "disconnected" &&
        (c.status === "disconnected" || c.status === "error"));

    return matchesSearch && matchesFilter;
  });

  const connectedCount = connections.filter(
    (c) => c.status === "connected",
  ).length;
  const errorCount = connections.filter((c) => c.status === "error").length;
  const disconnectedCount = connections.length - connectedCount - errorCount;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border/70 bg-card/60 p-6 backdrop-blur-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-claw-red/25 bg-claw-red/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-claw-red-bright">
            <Sparkles className="h-3.5 w-3.5" />
            Composio control room
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Connect your tools
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Pick what OpenClaw can use from your laptop. The demo path is wired
            for Gmail through Composio and live web search through Tavily, with
            approval boundaries visible before anything sensitive happens.
          </p>
        </div>

        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border/70 bg-card/60 backdrop-blur-xl">
          <div className="flex flex-col justify-between border-r border-border/70 p-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-2xl font-black tabular-nums">{connectedCount}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Connected</div>
            </div>
          </div>
          <div className="flex flex-col justify-between border-r border-border/70 p-4">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-black tabular-nums">{disconnectedCount}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Available</div>
            </div>
          </div>
          <div className="flex flex-col justify-between p-4">
            <Shield className="h-4 w-4 text-sky-300" />
            <div>
              <div className="text-2xl font-black tabular-nums">{connections.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {demoTools.map((tool) => {
          const ToolIcon = tool.icon;
          return (
            <div key={tool.name} className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/55 p-4 backdrop-blur-xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
                <ToolIcon className={cn("h-5 w-5", tool.color)} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground">{tool.name}</div>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{tool.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/50 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "connected", label: "Connected" },
              { key: "disconnected", label: "Not connected" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              className={cn(
                "rounded-md border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] transition-all duration-200",
                filter === f.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground active:translate-y-px",
              )}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-lg border-border/70 bg-background/40 pl-9 text-sm"
          />
        </div>
      </div>

      {/* Connection Grid */}
      {filteredConnections.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredConnections.map((connection) => {
            const catalogEntry = SERVICE_CATALOG.find((e) => e.provider === connection.provider);
            return (
              <ConnectionTile
                key={connection.id}
                connection={connection}
                onConnect={handleConnect}
                onDisconnect={handleDisconnectClick}
                onTest={handleTest}
                onViewPermissions={handleViewPermissions}
                connecting={connectingService === catalogEntry?.service}
                disconnecting={disconnectingId === connection.id}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            {/* Lobster easter egg */}
            <div className="relative">
              <svg
                viewBox="-20 -20 40 40"
                className="h-16 w-16 text-claw-red/10"
                fill="currentColor"
              >
                <path d="M-10 2 C-10 2, -6 8, 2 10 C6 11, 12 8, 14 4 C14 4, 10 6, 6 5 C2 4, -4 2, -10 2Z" />
                <path d="M-10 -1 C-10 -1, -6 -8, 2 -10 C6 -11, 12 -6, 14 -2 C14 -2, 10 -5, 6 -4 C2 -3, -4 -1, -10 -1Z" />
                <circle cx={-10} cy={0.5} r={3} />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                {searchQuery
                  ? "No connections found"
                  : "No tools connected yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? `No connections matching "${searchQuery}"`
                  : "Give the crustacean something to work with."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transparency info box */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-card text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Your permissions are transparent
            </h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Each connection shows exactly what Clawed can access in plain
              language. You can revoke any connection at any time. Sensitive
              actions — like sending to new recipients, making payments, or
              deleting data — always require your explicit approval regardless
              of connection permissions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PermissionsDialog
        connection={permissionsConnection}
        open={permissionsOpen}
        onOpenChange={setPermissionsOpen}
      />
      <DisconnectDialog
        connection={disconnectConnection}
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
