import { useState } from "react";
import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockConnections } from "@/data/mock";
import type { Connection, ConnectionStatus } from "@/types";

// ─── Icon map ────────────────────────────────────────────────────────────────

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
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800",
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
    className:
      "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800",
    dotClass: "bg-red-500",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800",
    dotClass: "bg-amber-500 animate-pulse",
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
  onViewScopes,
}: {
  connection: Connection;
  onConnect: (c: Connection) => void;
  onDisconnect: (c: Connection) => void;
  onTest: (c: Connection) => void;
  onViewScopes: (c: Connection) => void;
}) {
  const [testing, setTesting] = useState(false);
  const Icon = getProviderIcon(connection.icon);
  const status = statusConfig[connection.status];
  const isConnected = connection.status === "connected";
  const isError = connection.status === "error";

  const handleTest = async () => {
    setTesting(true);
    // Simulate a test
    setTimeout(() => {
      setTesting(false);
      onTest(connection);
    }, 1500);
  };

  return (
    <Card
      className={cn(
        "group relative transition-all hover:shadow-md",
        isError && "border-red-200 dark:border-red-900/50",
      )}
    >
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          {/* Provider icon */}
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
              isConnected
                ? "bg-primary/10 text-primary"
                : isError
                  ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                  : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          {/* Name + status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">
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

            {/* Provider ID */}
            <p className="mt-0.5 text-xs text-muted-foreground font-mono">
              {connection.provider}
            </p>

            {/* Connected since / last sync */}
            {isConnected && (
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                {connection.connectedAt && (
                  <span>
                    Connected {formatRelativeTime(connection.connectedAt)}
                  </span>
                )}
                {connection.lastSync && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Synced {formatRelativeTime(connection.lastSync)}
                  </span>
                )}
              </div>
            )}

            {/* Error message */}
            {isError && connection.error && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 dark:bg-red-950/30 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {connection.error}
              </div>
            )}
          </div>
        </div>

        {/* Scopes preview */}
        <div className="mt-4">
          <button
            onClick={() => onViewScopes(connection)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shield className="h-3 w-3" />
            <span>
              {connection.scopes.length} permission
              {connection.scopes.length !== 1 ? "s" : ""} granted
            </span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Scope tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {connection.scopes.slice(0, 3).map((scope) => (
              <Badge
                key={scope}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                {scope}
              </Badge>
            ))}
            {connection.scopes.length > 3 && (
              <Badge
                variant="secondary"
                className="text-[10px] font-normal text-muted-foreground"
              >
                +{connection.scopes.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 pt-2 border-t">
          {isConnected ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
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
                className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
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
                className="h-8 gap-1.5 text-xs"
                onClick={() => onConnect(connection)}
              >
                <RefreshCw className="h-3 w-3" />
                Reconnect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
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
              className="h-8 gap-1.5 text-xs"
              onClick={() => onConnect(connection)}
            >
              <Plug className="h-3 w-3" />
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Scopes Dialog ───────────────────────────────────────────────────────────

function ScopesDialog({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {connection.name} Permissions
              </DialogTitle>
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

        <div className="space-y-1 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
            Granted scopes ({connection.scopes.length})
          </p>
          {connection.scopes.map((scope, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm">{scope}</span>
            </div>
          ))}
        </div>

        {connection.error && (
          <>
            <Separator />
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-medium">Connection error</p>
                <p className="mt-0.5 text-red-600 dark:text-red-400">
                  {connection.error}
                </p>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">
              Permissions explained:
            </span>{" "}
            These are the actions Clawed can perform using this connection. You
            can revoke access anytime by disconnecting. Sensitive actions still
            require your approval regardless of permissions.
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

        <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
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
  const [scopesConnection, setScopesConnection] = useState<Connection | null>(
    null,
  );
  const [scopesOpen, setScopesOpen] = useState(false);
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
  };

  const handleTest = (c: Connection) => {
    // For now just show a visual feedback — the tile already has a spinner
    console.log(`Tested connection: ${c.name}`);
  };

  const handleViewScopes = (c: Connection) => {
    setScopesConnection(c);
    setScopesOpen(true);
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
        <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your integrations. Connect services to let your assistant read,
          draft, and act on your behalf.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">{connectedCount}</span>
          <span className="text-xs text-muted-foreground">connected</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {errorCount}
            </span>
            <span className="text-xs text-red-600 dark:text-red-400">
              need attention
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <Plug className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{connections.length}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {(
            [
              { key: "all", label: "All" },
              { key: "connected", label: "Connected" },
              { key: "disconnected", label: "Not connected" },
            ] as const
          ).map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
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
              onViewScopes={handleViewScopes}
            />
          ))}

          {/* Add new connection card */}
          <Card className="flex items-center justify-center border-dashed min-h-[200px] transition-colors hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer group">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">Add connection</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect a new service
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Plug className="h-10 w-10 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium">No connections found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? `No connections matching "${searchQuery}"`
                  : "Connect a service to get started"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">
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
      <ScopesDialog
        connection={scopesConnection}
        open={scopesOpen}
        onOpenChange={setScopesOpen}
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
