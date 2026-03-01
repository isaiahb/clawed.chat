import { useState, useMemo } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Undo2,
  ChevronDown,
  ChevronUp,
  Wrench,
  MapPin,
  Database,
  Info,
  AlertTriangle,
  Calendar,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockTimelineEntries } from "@/data/mock";
import type { TimelineEntry } from "@/types";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

type TimelineStatus = TimelineEntry["status"];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateGroup(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const statusConfig: Record<
  TimelineStatus,
  {
    icon: typeof CheckCircle;
    label: string;
    className: string;
    dotClass: string;
  }
> = {
  completed: {
    icon: CheckCircle,
    label: "Completed",
    className: "text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  undone: {
    icon: Undo2,
    label: "Undone",
    className: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

// ──────────────────────────────────────────────
// Extract unique tools from data
// ──────────────────────────────────────────────

function getUniqueTools(entries: TimelineEntry[]): string[] {
  const tools = new Set(entries.map((e) => e.tool));
  return Array.from(tools).sort();
}

// ──────────────────────────────────────────────
// Single Timeline Entry Component
// ──────────────────────────────────────────────

function TimelineEntryCard({
  entry,
  onUndo,
  isLast,
}: {
  entry: TimelineEntry;
  onUndo: (id: string) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[entry.status];
  const StatusIcon = status.icon;

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-colors",
            entry.status === "failed"
              ? "border-red-300 dark:border-red-800"
              : entry.status === "completed"
                ? "border-emerald-300 dark:border-emerald-800"
                : entry.status === "pending"
                  ? "border-amber-300 dark:border-amber-800"
                  : "border-border",
          )}
        >
          <StatusIcon className={cn("h-4 w-4", status.className)} />
        </div>
        {!isLast && <div className="flex-1 w-px bg-border min-h-[24px]" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6 min-w-0">
        <Card
          className={cn(
            "transition-all hover:shadow-sm",
            entry.status === "failed" &&
              "border-red-200/50 dark:border-red-900/30",
            expanded && "shadow-sm",
          )}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium leading-tight truncate">
                  {entry.action}
                </h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-normal gap-1 h-5"
                  >
                    <Wrench className="h-2.5 w-2.5" />
                    {entry.tool}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-normal h-5",
                      status.className,
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-1.5 w-1.5 rounded-full mr-1",
                        status.dotClass,
                      )}
                    />
                    {status.label}
                  </Badge>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {formatAbsoluteTime(entry.timestamp)}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Error (always visible) */}
            {entry.details.error && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  {entry.details.error}
                </p>
              </div>
            )}

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {expanded ? (
                <>
                  Hide receipt <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show receipt <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>

            {/* Expanded receipt details */}
            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <DetailRow
                  icon={<Info className="h-3.5 w-3.5" />}
                  label="What"
                  value={entry.details.what}
                />
                <DetailRow
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Where"
                  value={entry.details.where}
                />
                <DetailRow
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="When"
                  value={formatAbsoluteTime(entry.timestamp)}
                />
                <DetailRow
                  icon={<Database className="h-3.5 w-3.5" />}
                  label="Data used"
                  value={entry.details.dataUsed}
                />

                {/* Undo action */}
                {entry.details.undoAvailable &&
                  entry.status === "completed" && (
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUndo(entry.id);
                        }}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Undo this action
                      </Button>
                    </div>
                  )}

                {!entry.details.undoAvailable &&
                  entry.status === "completed" && (
                    <p className="text-xs text-muted-foreground italic pt-1">
                      This action cannot be undone.
                    </p>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Detail row sub-component
// ──────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <span className="font-medium text-muted-foreground">{label}: </span>
        <span className="text-foreground">{value}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Stats bar
// ──────────────────────────────────────────────

function StatsBar({ entries }: { entries: TimelineEntry[] }) {
  const completed = entries.filter((e) => e.status === "completed").length;
  const failed = entries.filter((e) => e.status === "failed").length;
  const undoable = entries.filter(
    (e) => e.details.undoAvailable && e.status === "completed",
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-muted-foreground">{completed} completed</span>
      </div>
      {failed > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">{failed} failed</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{undoable} undoable</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{entries.length} total</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Clock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">
        {hasFilters ? "No matching entries" : "No timeline entries yet"}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your filters or search term to find what you're looking for."
          : "When the assistant performs actions, receipts will appear here with full details of what happened."}
      </p>
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main TimelinePage Component
// ──────────────────────────────────────────────

export default function TimelinePage() {
  useDocumentTitle("Timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [entries, setEntries] = useState<TimelineEntry[]>(mockTimelineEntries);

  const uniqueTools = useMemo(() => getUniqueTools(entries), [entries]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || toolFilter !== "all";

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.tool.toLowerCase().includes(q) ||
          e.details.what.toLowerCase().includes(q) ||
          e.details.where.toLowerCase().includes(q) ||
          e.details.dataUsed.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    // Tool filter
    if (toolFilter !== "all") {
      result = result.filter((e) => e.tool === toolFilter);
    }

    // Sort by timestamp descending (most recent first)
    result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return result;
  }, [entries, searchQuery, statusFilter, toolFilter]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { label: string; entries: TimelineEntry[] }[] = [];
    let currentLabel = "";

    for (const entry of filteredEntries) {
      const label = formatDateGroup(entry.timestamp);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    }

    return groups;
  }, [filteredEntries]);

  const handleUndo = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "undone" as const,
              details: { ...e.details, undoAvailable: false },
            }
          : e,
      ),
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setToolFilter("all");
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredEntries, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clawed-timeline-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Timeline</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Receipts and audit trail for every action
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full"
                >
                  !
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* ── Search & Filters ── */}
        <div className="mt-4 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search timeline entries…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter row (collapsible) */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              {/* Status filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="undone">Undone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tool filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  Tool
                </label>
                <Select value={toolFilter} onValueChange={setToolFilter}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tools</SelectItem>
                    {uniqueTools.map((tool) => (
                      <SelectItem key={tool} value={tool}>
                        {tool}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear all */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="mt-4">
          <StatsBar entries={filteredEntries} />
        </div>
      </div>

      {/* ── Timeline Entries ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {filteredEntries.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
          ) : (
            <div className="space-y-0">
              {groupedEntries.map((group) => (
                <div key={group.label}>
                  {/* Date group header */}
                  <div className="flex items-center gap-3 mb-4 mt-2 first:mt-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <Separator className="flex-1" />
                    <span className="text-[10px] text-muted-foreground">
                      {group.entries.length}{" "}
                      {group.entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {/* Entries */}
                  {group.entries.map((entry, idx) => (
                    <TimelineEntryCard
                      key={entry.id}
                      entry={entry}
                      onUndo={handleUndo}
                      isLast={idx === group.entries.length - 1}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Bottom padding for scroll */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
