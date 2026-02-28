import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Inbox,
  Mail,
  MessageSquare,
  Calendar,
  Bell,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  Send,
  Plus,
  Sparkles,
  ChevronRight,
  MailOpen,
  Star,
  StarOff,
  MoreHorizontal,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { mockInboxItems, mockStats } from "@/data/mock";
import { useNavigate } from "react-router-dom";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) {
    const absMins = Math.abs(mins);
    if (absMins < 60) return `in ${absMins}m`;
    const hrs = Math.floor(absMins / 60);
    if (hrs < 24) return `in ${hrs}h`;
    return `in ${Math.floor(hrs / 24)}d`;
  }
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const sourceIcons: Record<string, LucideIcon> = {
  email: Mail,
  slack: MessageSquare,
  calendar: Calendar,
  assistant: Bell,
  system: AlertCircle,
};

const sourceColors: Record<string, string> = {
  email: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  slack:
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  calendar: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  assistant:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  system:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
};

const priorityConfig = {
  high: {
    label: "High",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
};

const actionTypeIcons: Record<string, LucideIcon> = {
  "draft-reply": Send,
  "create-task": Plus,
  archive: Archive,
  snooze: Clock,
  approve: CheckCircle2,
  custom: Sparkles,
};

// ──────────────────────────────────────────────
// Single Inbox Item Row
// ──────────────────────────────────────────────

interface InboxItemRowProps {
  item: (typeof mockInboxItems)[number];
  selected: boolean;
  onSelect: () => void;
  onMarkDone: () => void;
  onStar: () => void;
  starred: boolean;
}

function InboxItemRow({
  item,
  selected,
  onSelect,
  onMarkDone,
  onStar,
  starred,
}: InboxItemRowProps) {
  const SourceIcon = sourceIcons[item.source] ?? Mail;
  const priority = priorityConfig[item.priority];
  const ActionIcon = item.suggestedAction
    ? (actionTypeIcons[item.suggestedAction.type] ?? Sparkles)
    : null;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b last:border-b-0 transition-colors",
        "hover:bg-muted/50",
        selected && "bg-accent",
        !item.read && "bg-primary/[0.02]",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <div className="mt-2 shrink-0">
          {!item.read ? (
            <span className={cn("block h-2 w-2 rounded-full", priority.dot)} />
          ) : (
            <span className="block h-2 w-2 rounded-full bg-transparent" />
          )}
        </div>

        {/* Source icon */}
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            sourceColors[item.source],
          )}
        >
          <SourceIcon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={cn(
                "truncate text-sm leading-tight",
                !item.read ? "font-semibold" : "font-medium text-foreground",
              )}
            >
              {item.title}
            </h4>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>

          <p className="mt-0.5 truncate text-sm text-muted-foreground leading-snug">
            {item.summary}
          </p>

          {/* Tags row */}
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 font-normal",
                priority.badge,
              )}
            >
              {priority.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground capitalize">
              {item.source}
            </span>
            {item.suggestedAction && ActionIcon && (
              <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                <ActionIcon className="h-3 w-3" />
                {item.suggestedAction.label}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5 ml-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStar();
                }}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {starred ? (
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ) : (
                  <StarOff className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {starred ? "Unstar" : "Star"}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDone();
                }}
                className="gap-2 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark done
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs">
                <Archive className="h-3.5 w-3.5" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs">
                <Clock className="h-3.5 w-3.5" />
                Snooze
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-xs">
                <EyeOff className="h-3.5 w-3.5" />
                Mute thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────
// Detail / Preview Panel
// ──────────────────────────────────────────────

function DetailPanel({
  item,
}: {
  item: (typeof mockInboxItems)[number] | null;
}) {
  const navigate = useNavigate();

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-center p-8">
        <div>
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">
            Select a message to preview
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Or press{" "}
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">
              ⌘K
            </kbd>{" "}
            to search
          </p>
        </div>
      </div>
    );
  }

  const SourceIcon = sourceIcons[item.source] ?? Mail;
  const priority = priorityConfig[item.priority];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  sourceColors[item.source],
                )}
              >
                <SourceIcon className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-base font-semibold truncate">{item.title}</h2>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="capitalize">{item.source}</span>
              <span>·</span>
              <span>{formatRelativeTime(item.timestamp)}</span>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4", priority.badge)}
              >
                {priority.label} priority
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="text-sm text-foreground leading-relaxed">
          {item.summary}
        </p>

        {item.type === "calendar" && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Calendar Event</span>
            </div>
            <p className="text-sm text-muted-foreground">{item.summary}</p>
          </div>
        )}

        {item.type === "reminder" && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-amber-700 dark:text-amber-400">
                Reminder
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{item.summary}</p>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="border-t px-5 py-3">
        <div className="flex items-center gap-2">
          {item.suggestedAction && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/app/ask")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {item.suggestedAction.label}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark done
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 ml-auto"
            onClick={() => navigate("/app/ask")}
          >
            Ask about this
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Quick Suggestions Sidebar
// ──────────────────────────────────────────────

function SuggestionsPanel() {
  const navigate = useNavigate();

  const suggestions = [
    {
      label: "Summarize my unread emails",
      icon: Mail,
      context: "5 unread",
    },
    {
      label: "What's my next meeting?",
      icon: Calendar,
      context: "Design Review in 45m",
    },
    {
      label: "Draft reply to Alex about budget",
      icon: Send,
      context: "High priority",
    },
    {
      label: "Show pending approvals",
      icon: CheckCircle2,
      context: `${mockStats.approvalsWaiting} waiting`,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Suggested Actions
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Based on your inbox right now
        </p>
      </div>

      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => navigate("/app/ask")}
            className="group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-sm hover:border-primary/20 hover:bg-accent/30"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <s.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-snug">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {s.context}
              </p>
            </div>
            <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>

      <Separator />

      {/* Quick stats */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          This Week
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
            <p className="text-lg font-bold">{mockStats.actionsThisWeek}</p>
            <p className="text-[10px] text-muted-foreground">Actions</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
            <p className="text-lg font-bold">{mockStats.approvalsWaiting}</p>
            <p className="text-[10px] text-muted-foreground">Approvals</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
            <p className="text-lg font-bold">{mockStats.avgResponseTime}s</p>
            <p className="text-[10px] text-muted-foreground">Avg response</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
            <p className="text-lg font-bold">
              {(mockStats.undoRate * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Undo rate</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Top tools */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Top Tools
        </h3>
        <div className="mt-2 space-y-1.5">
          {mockStats.topTools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground">{tool.name}</span>
              <span className="font-medium">{tool.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Inbox Page
// ──────────────────────────────────────────────

export default function InboxPage() {
  useDocumentTitle("Inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showRead, setShowRead] = useState(true);

  const items = mockInboxItems.filter((item) => {
    // Filter out done items
    if (doneIds.has(item.id)) return false;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    }

    // Tab filter
    if (activeTab === "unread") return !item.read;
    if (activeTab === "starred") return starredIds.has(item.id);
    if (activeTab === "high") return item.priority === "high";

    // Show/hide read
    if (!showRead && item.read) return false;

    return true;
  });

  const selectedItem = mockInboxItems.find((i) => i.id === selectedId) ?? null;

  const unreadCount = mockInboxItems.filter(
    (i) => !i.read && !doneIds.has(i.id),
  ).length;
  const highPriorityCount = mockInboxItems.filter(
    (i) => i.priority === "high" && !doneIds.has(i.id),
  ).length;

  const handleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkDone = (id: string) => {
    setDoneIds((prev) => new Set(prev).add(id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="flex h-full">
      {/* ─── Left: Inbox Feed ─── */}
      <div className="flex w-full flex-col border-r md:w-[380px] lg:w-[420px] shrink-0">
        {/* Search + Filter bar */}
        <div className="border-b px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search inbox…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showRead ? "ghost" : "secondary"}
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setShowRead(!showRead)}
                >
                  {showRead ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showRead ? "Hide read" : "Show read"}
              </TooltipContent>
            </Tooltip>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-7 w-full bg-transparent p-0 gap-1">
              <TabsTrigger
                value="all"
                className="h-7 rounded-full px-3 text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="h-7 rounded-full px-3 text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1"
              >
                Unread
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[9px] ml-0.5"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="high"
                className="h-7 rounded-full px-3 text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1"
              >
                Priority
                {highPriorityCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[9px] ml-0.5"
                  >
                    {highPriorityCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="starred"
                className="h-7 rounded-full px-3 text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Star className="h-3 w-3" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <MailOpen className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-4 text-sm font-medium">
                {searchQuery
                  ? "No results found"
                  : activeTab === "starred"
                    ? "No starred items"
                    : "All caught up!"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Nothing needs your attention right now"}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <InboxItemRow
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
                onMarkDone={() => handleMarkDone(item.id)}
                onStar={() => handleStar(item.id)}
                starred={starredIds.has(item.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
            {doneIds.size > 0 && ` · ${doneIds.size} done`}
          </p>
          {doneIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-muted-foreground"
              onClick={() => setDoneIds(new Set())}
            >
              Undo all
            </Button>
          )}
        </div>
      </div>

      {/* ─── Center: Detail Panel ─── */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        <DetailPanel item={selectedItem} />
      </div>

      {/* ─── Right: Suggestions ─── */}
      <div className="hidden xl:block w-[280px] shrink-0 border-l overflow-y-auto px-4 py-5">
        <SuggestionsPanel />
      </div>
    </div>
  );
}
