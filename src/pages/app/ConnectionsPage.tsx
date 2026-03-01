import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  SquareKanban,
  Github,
  Plug,
  PlugZap,
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
  Plus,
  Eye,
  Edit3,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockConnections } from "@/data/mock";
import type {
  Connection,
  ConnectionStatus,
  ConnectionPermission,
} from "@/types";

// ─── Icon map — use official-feeling icons per provider ──────────────────────

const iconMap: Record<string, LucideIcon> = {
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  SquareKanban,
  Github,
};

function getProviderIcon(iconName: string) {
  return iconMap[iconName] ?? Plug;
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
    className: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  disconnected: {
    label: "Disconnected",
    icon: XCircle,
    className: "text-muted-foreground bg-muted border-border",
    dotClass: "bg-muted-foreground/40",
  },
  error: {
    label: "Error",
    icon: AlertTriangle,
    className: "text-red-700 bg-red-50 border-red-200",
    dotClass: "bg-red-500",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-amber-700 bg-amber-50 border-amber-200",
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
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  write: {
    label: "Write",
    icon: Edit3,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approval: {
    label: "Needs Approval",
    icon: ShieldAlert,
    badgeClass: "bg-red-50 text-red-700 border-red-200",
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
}: {
  connection: Connection;
  onConnect: (c: Connection) => void;
  onDisconnect: (c: Connection) => void;
  onTest: (c: Connection) => void;
  onViewPermissions: (c: Connection) => void;
}) {
  const [testing, setTesting] = useState(false);
  const Icon = getProviderIcon(connection.icon);
  const status = statusConfig[connection.status];
  const isConnected = connection.status === "connected";
  const isError = connection.status === "error";

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
        "group relative transition-all",
        isError && "border-red-200",
      )}
    >
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          {/* Provider icon — official service icon placeholder */}
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center transition-colors border",
              isConnected
                ? "bg-primary/10 text-primary border-primary/20"
                : isError
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-muted text-muted-foreground border-border",
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          {/* Name + status + capability */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate text-foreground">
                {connection.name}
              </h3>
              <Badge
                variant="outline"
                className={cn("text-[10px] shrink-0 gap-1", status.className)}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", status.dotClass)}
                />
                {status.label}
              </Badge>
            </div>

            {/* Capability one-liner */}
            {connection.capability && (
              <p className="mt-1 text-xs text-muted-foreground leading-snug">
                {connection.capability}
              </p>
            )}

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
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
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
              >
                <Unplug className="h-3 w-3" />
                Disconnect
              </Button>
            </>
          ) : isError ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-7 gap-1.5 text-[11px] bg-claw-red hover:bg-claw-red-bright text-white"
                onClick={() => onConnect(connection)}
              >
                <RefreshCw className="h-3 w-3" />
                Reconnect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-destructive hover:text-destructive"
                onClick={() => onDisconnect(connection)}
              >
                <Unplug className="h-3 w-3" />
                Remove
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-7 gap-1.5 text-[11px] bg-claw-red hover:bg-claw-red-bright text-white"
              onClick={() => onConnect(connection)}
            >
              <Plug className="h-3 w-3" />
              Connect
              <ArrowRight className="h-3 w-3" />
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

  const Icon = getProviderIcon(connection.icon);
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
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-card text-primary">
              <Icon className="h-5 w-5" />
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
  const [connections, setConnections] = useState<Connection[]>(mockConnections);
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

  // Handlers
  const handleConnect = (c: Connection) => {
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === c.id
          ? {
              ...conn,
              status: "connected" as ConnectionStatus,
              connectedAt: new Date().toISOString(),
              lastSync: new Date().toISOString(),
              error: undefined,
            }
          : conn,
      ),
    );
    toast.success(`Connected to ${c.name}`, {
      description: `Your assistant can now access ${c.name}.`,
    });
  };

  const handleDisconnect = (c: Connection) => {
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === c.id
          ? {
              ...conn,
              status: "disconnected" as ConnectionStatus,
              connectedAt: undefined,
              lastSync: undefined,
            }
          : conn,
      ),
    );
    toast(`Disconnected from ${c.name}`, {
      description: `${c.name} access has been revoked.`,
    });
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Connect your tools
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what your agent can access. Each service shows exactly what
          Clawed can read, write, and when it will ask for approval.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-border bg-card px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-sm font-semibold">{connectedCount}</span>
          <span className="text-[11px] text-muted-foreground">connected</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-sm font-semibold text-red-700">
              {errorCount}
            </span>
            <span className="text-[11px] text-red-600">need attention</span>
          </div>
        )}
        <div className="flex items-center gap-2 border border-border bg-card px-3 py-2">
          <Plug className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">{connections.length}</span>
          <span className="text-[11px] text-muted-foreground">total</span>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                "px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] border transition-all",
                filter === f.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Connection Grid */}
      {filteredConnections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConnections.map((connection) => (
            <ConnectionTile
              key={connection.id}
              connection={connection}
              onConnect={handleConnect}
              onDisconnect={handleDisconnectClick}
              onTest={handleTest}
              onViewPermissions={handleViewPermissions}
            />
          ))}

          {/* Add new connection card */}
          <Card className="flex items-center justify-center border-dashed min-h-[200px] transition-colors hover:border-foreground/40 cursor-pointer group">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center border border-border bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Add connection
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect a new service
                </p>
              </div>
            </CardContent>
          </Card>
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
