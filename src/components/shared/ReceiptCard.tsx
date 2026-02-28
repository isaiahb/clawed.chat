import {
  CheckCircle,
  XCircle,
  Clock,
  Undo2,
  ChevronDown,
  ChevronUp,
  Wrench,
  MapPin,
  Database,
  Info,
} from "lucide-react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TimelineEntry, TimelineStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const statusConfig: Record<
  TimelineStatus,
  { icon: typeof CheckCircle; label: string; className: string }
> = {
  completed: {
    icon: CheckCircle,
    label: "Completed",
    className: "text-emerald-500",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-destructive",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-warning",
  },
  undone: {
    icon: Undo2,
    label: "Undone",
    className: "text-muted-foreground",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReceiptCardProps {
  entry: TimelineEntry;
  onUndo?: (id: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function ReceiptCard({
  entry,
  onUndo,
  className,
  defaultExpanded = false,
}: ReceiptCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const status = statusConfig[entry.status];
  const StatusIcon = status.icon;

  return (
    <Card
      className={cn(
        "group transition-colors hover:border-muted-foreground/20",
        entry.status === "failed" && "border-destructive/30",
        className
      )}
    >
      <CardContent className="p-4">
        {/* ── Header row ────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
              status.className
            )}
          >
            <StatusIcon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="truncate text-sm font-medium leading-tight">
                {entry.action}
              </h4>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {formatAbsoluteTime(entry.timestamp)}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Tool badge */}
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-normal">
                <Wrench className="mr-1 h-3 w-3" />
                {entry.tool}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-normal",
                  status.className
                )}
              >
                {status.label}
              </Badge>
            </div>

            {/* Error message (always visible if present) */}
            {entry.details.error && (
              <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {entry.details.error}
              </div>
            )}
          </div>
        </div>

        {/* ── Expand toggle ─────────────────────────────────── */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {expanded ? (
            <>
              Hide details <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show receipt <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>

        {/* ── Expanded details ──────────────────────────────── */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {/* What was done */}
            <DetailRow
              icon={<Info className="h-3.5 w-3.5" />}
              label="What"
              value={entry.details.what}
            />

            {/* Where it happened */}
            <DetailRow
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Where"
              value={entry.details.where}
            />

            {/* When */}
            <DetailRow
              icon={<Clock className="h-3.5 w-3.5" />}
              label="When"
              value={formatAbsoluteTime(entry.timestamp)}
            />

            {/* Data used */}
            <DetailRow
              icon={<Database className="h-3.5 w-3.5" />}
              label="Data used"
              value={entry.details.dataUsed}
            />

            {/* Undo button */}
            {entry.details.undoAvailable &&
              entry.status === "completed" &&
              onUndo && (
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => onUndo(entry.id)}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo this action
                  </Button>
                </div>
              )}

            {/* Undo not available notice */}
            {!entry.details.undoAvailable && entry.status === "completed" && (
              <p className="text-xs text-muted-foreground italic">
                This action cannot be undone.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Detail row sub-component
// ---------------------------------------------------------------------------

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
