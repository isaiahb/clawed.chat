import { useState, useMemo } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Check,
  X,
  Clock,
  Search,
  Filter,
  ArrowRight,
  CheckCheck,
  AlertTriangle,
  Pencil,
  ChevronRight,
  Inbox,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockApprovals } from "@/data/mock";
import { ApprovalModal } from "@/components/shared/ApprovalModal";
import type { Approval, RiskLevel, ApprovalStatus } from "@/types";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

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

const riskConfig: Record<
  RiskLevel,
  {
    label: string;
    icon: LucideIcon;
    dotClass: string;
    badgeClass: string;
    borderClass: string;
  }
> = {
  low: {
    label: "Low",
    icon: ShieldCheck,
    dotClass: "bg-emerald-500",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    borderClass: "border-l-emerald-500",
  },
  medium: {
    label: "Medium",
    icon: ShieldAlert,
    dotClass: "bg-amber-500",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    borderClass: "border-l-amber-500",
  },
  high: {
    label: "High",
    icon: ShieldX,
    dotClass: "bg-red-500",
    badgeClass:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    borderClass: "border-l-red-500",
  },
};

const statusConfig: Record<
  ApprovalStatus,
  {
    label: string;
    badgeVariant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  pending: { label: "Pending", badgeVariant: "default" },
  approved: { label: "Approved", badgeVariant: "secondary" },
  rejected: { label: "Rejected", badgeVariant: "destructive" },
  edited: { label: "Edited & Approved", badgeVariant: "secondary" },
  expired: { label: "Expired", badgeVariant: "outline" },
};

type FilterTab = "all" | "pending" | "resolved";

// ──────────────────────────────────────────────
// Approval list item
// ──────────────────────────────────────────────

interface ApprovalListItemProps {
  approval: Approval;
  isSelected: boolean;
  onSelect: () => void;
}

function ApprovalListItem({
  approval,
  isSelected,
  onSelect,
}: ApprovalListItemProps) {
  const risk = riskConfig[approval.risk];
  const RiskIcon = risk.icon;
  const isPending = approval.status === "pending";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border border-l-4 p-4 transition-all",
        "hover:shadow-sm hover:bg-accent/30",
        risk.borderClass,
        isSelected && "ring-2 ring-primary/20 bg-accent/50 shadow-sm",
        !isPending && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium truncate leading-tight">
              {approval.actionSummary}
            </h4>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-[10px] gap-1", risk.badgeClass)}
            >
              <RiskIcon className="h-3 w-3" />
              {risk.label} risk
            </Badge>
            {!isPending && (
              <Badge
                variant={statusConfig[approval.status].badgeVariant}
                className="text-[10px]"
              >
                {statusConfig[approval.status].label}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              {approval.destination}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(approval.createdAt)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-1" />
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────
// Preview panel (right side on desktop)
// ──────────────────────────────────────────────

interface PreviewPanelProps {
  approval: Approval;
  onApprove: () => void;
  onReject: () => void;
  onOpenModal: () => void;
}

function PreviewPanel({
  approval,
  onApprove,
  onReject,
  onOpenModal,
}: PreviewPanelProps) {
  const risk = riskConfig[approval.risk];
  const RiskIcon = risk.icon;
  const isPending = approval.status === "pending";
  const inputEntries = Object.entries(approval.inputs);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-snug">
              {approval.actionSummary}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn("gap-1 text-xs", risk.badgeClass)}
              >
                <RiskIcon className="h-3.5 w-3.5" />
                {risk.label} risk
              </Badge>
              {!isPending && (
                <Badge
                  variant={statusConfig[approval.status].badgeVariant}
                  className="text-xs"
                >
                  {statusConfig[approval.status].label}
                </Badge>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 mt-1">
            {formatRelativeTime(approval.createdAt)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Destination */}
        <div className="flex items-center gap-2 text-sm">
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Destination:</span>
          <span className="font-medium">{approval.destination}</span>
        </div>

        {/* Tool */}
        {approval.toolName && (
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Tool:</span>
            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
              {approval.toolName}
            </code>
          </div>
        )}

        {/* Inputs */}
        {inputEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Inputs
            </p>
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
              {inputEntries.map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground font-mono text-xs min-w-[80px] shrink-0 pt-0.5">
                    {key}
                  </span>
                  <span className="text-foreground break-words text-xs">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview
          </p>
          <div className="rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {approval.preview}
          </div>
        </div>

        {/* High risk warning */}
        {approval.risk === "high" && isPending && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-medium">High risk action</p>
              <p className="mt-0.5 text-red-600 dark:text-red-400 text-xs">
                This action may be irreversible or affect many people. Review
                carefully before approving.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {isPending && (
        <>
          <Separator />
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onReject}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={onOpenModal}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit & Approve
              </Button>
              <Button
                size="sm"
                className={cn(
                  "gap-1.5",
                  approval.risk === "high" &&
                    "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600",
                )}
                onClick={onApprove}
              >
                <Check className="h-3.5 w-3.5" />
                {approval.risk === "high" ? "Confirm & Approve" : "Approve"}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Resolved info */}
      {!isPending && approval.resolvedAt && (
        <>
          <Separator />
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {approval.status === "approved" ? "Approved" : "Resolved"}{" "}
              {formatRelativeTime(approval.resolvedAt)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Empty states
// ──────────────────────────────────────────────

function EmptyQueue({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { title: string; description: string }> = {
    all: {
      title: "No approvals yet",
      description:
        "Actions that need your review will appear here. Ask your assistant to do something!",
    },
    pending: {
      title: "All caught up!",
      description:
        "No pending approvals. Your assistant will notify you when something needs review.",
    },
    resolved: {
      title: "No resolved approvals",
      description:
        "Approved and rejected items will appear here for reference.",
    },
  };

  const msg = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
        <Inbox className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{msg.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
        {msg.description}
      </p>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
        <ShieldCheck className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">Select an approval</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
        Click an item from the queue to see its details and take action.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────

export default function ApprovalsPage() {
  useDocumentTitle("Approvals");
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);

  // Derived data
  const pendingCount = useMemo(
    () => approvals.filter((a) => a.status === "pending").length,
    [approvals],
  );

  const filteredApprovals = useMemo(() => {
    let result = approvals;

    // Tab filter
    if (filterTab === "pending") {
      result = result.filter((a) => a.status === "pending");
    } else if (filterTab === "resolved") {
      result = result.filter((a) => a.status !== "pending");
    }

    // Risk filter
    if (riskFilter !== "all") {
      result = result.filter((a) => a.risk === riskFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.actionSummary.toLowerCase().includes(q) ||
          a.destination.toLowerCase().includes(q) ||
          a.preview.toLowerCase().includes(q) ||
          a.toolName.toLowerCase().includes(q),
      );
    }

    // Sort: pending first (by createdAt desc), then resolved by resolvedAt desc
    result = [...result].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [approvals, filterTab, riskFilter, searchQuery]);

  const selectedApproval = approvals.find((a) => a.id === selectedId) ?? null;

  // Handlers
  const handleApprove = (approval: Approval) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approval.id
          ? {
              ...a,
              status: "approved" as const,
              resolvedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    setModalOpen(false);
  };

  const handleReject = (approval: Approval) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approval.id
          ? {
              ...a,
              status: "rejected" as const,
              resolvedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    setModalOpen(false);
  };

  const handleEdit = (approval: Approval, editedPreview: string) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approval.id
          ? {
              ...a,
              status: "edited" as const,
              preview: editedPreview,
              resolvedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    setModalOpen(false);
  };

  const handleBulkApproveLowRisk = () => {
    const now = new Date().toISOString();
    setApprovals((prev) =>
      prev.map((a) =>
        a.status === "pending" && a.risk === "low"
          ? { ...a, status: "approved" as const, resolvedAt: now }
          : a,
      ),
    );
  };

  const lowRiskPendingCount = approvals.filter(
    (a) => a.status === "pending" && a.risk === "low",
  ).length;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              Approvals
              {pendingCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {pendingCount} pending
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review and confirm actions before they execute.
            </p>
          </div>

          {/* Bulk approve low risk */}
          {lowRiskPendingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={handleBulkApproveLowRisk}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Approve all low risk ({lowRiskPendingCount})
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Approve all {lowRiskPendingCount} pending low-risk actions at
                  once
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center">
          {/* Tab filter */}
          <Tabs
            value={filterTab}
            onValueChange={(v) => setFilterTab(v as FilterTab)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="pending" className="text-xs px-3 h-7 gap-1">
                <Clock className="h-3 w-3" />
                Pending
                {pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 text-primary px-1.5 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-3 h-7">
                All
              </TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs px-3 h-7">
                Resolved
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search approvals…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Risk filter */}
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {(["all", "low", "medium", "high"] as const).map((level) => (
              <Button
                key={level}
                variant={riskFilter === level ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-[11px] capitalize",
                  riskFilter === level &&
                    level !== "all" &&
                    "text-primary-foreground",
                )}
                onClick={() => setRiskFilter(level)}
              >
                {level === "all" ? (
                  "All risks"
                ) : (
                  <span className="flex items-center gap-1">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        riskConfig[level].dotClass,
                      )}
                    />
                    {level}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content: list + preview ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Approval queue list */}
        <div
          className={cn(
            "flex flex-col border-r overflow-y-auto",
            selectedApproval
              ? "hidden md:flex md:w-[400px] lg:w-[440px]"
              : "w-full",
          )}
        >
          {filteredApprovals.length === 0 ? (
            <EmptyQueue filter={filterTab} />
          ) : (
            <div className="p-3 space-y-2">
              {/* Stats bar */}
              <div className="flex items-center gap-3 px-1 py-1 text-xs text-muted-foreground">
                <span>
                  {filteredApprovals.length} item
                  {filteredApprovals.length !== 1 ? "s" : ""}
                </span>
                {filterTab === "all" && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {filteredApprovals.filter((a) => a.risk === "low").length}{" "}
                      low
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {
                        filteredApprovals.filter((a) => a.risk === "medium")
                          .length
                      }{" "}
                      medium
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {
                        filteredApprovals.filter((a) => a.risk === "high")
                          .length
                      }{" "}
                      high
                    </span>
                  </>
                )}
              </div>

              {filteredApprovals.map((approval) => (
                <ApprovalListItem
                  key={approval.id}
                  approval={approval}
                  isSelected={selectedId === approval.id}
                  onSelect={() => setSelectedId(approval.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview panel */}
        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden bg-background",
            !selectedApproval ? "hidden md:flex" : "flex",
          )}
        >
          {/* Mobile back button */}
          {selectedApproval && (
            <div className="md:hidden border-b px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setSelectedId(null)}
              >
                <ArrowRight className="h-3 w-3 rotate-180" />
                Back to queue
              </Button>
            </div>
          )}

          {selectedApproval ? (
            <PreviewPanel
              approval={selectedApproval}
              onApprove={() => handleApprove(selectedApproval)}
              onReject={() => handleReject(selectedApproval)}
              onOpenModal={() => setModalOpen(true)}
            />
          ) : (
            <EmptyPreview />
          )}
        </div>
      </div>

      {/* ── Approval Modal ── */}
      <ApprovalModal
        approval={selectedApproval}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={handleEdit}
      />
    </div>
  );
}
