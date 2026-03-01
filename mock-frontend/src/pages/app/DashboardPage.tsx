import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  ShieldCheck,
  Clock,
  Zap,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Undo2,
  Sparkles,
  Send,
  CalendarPlus,
  FileText,
  Search,
  Glasses,
  Activity,
  BarChart3,
  Flame,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import {
  mockInboxItems,
  mockApprovals,
  mockTimelineEntries,
  mockStats,
} from "@/data/mock";
import type { RiskLevel, TimelineStatus, ApprovalStatus } from "@/types";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  href?: string;
  className?: string;
  iconClassName?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  className,
  iconClassName,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "group transition-all hover:shadow-md",
        href && "cursor-pointer hover:border-primary/20",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 pt-0.5">
                <TrendingUp
                  className={cn(
                    "h-3 w-3",
                    trend.positive
                      ? "text-emerald-500"
                      : "text-red-500 rotate-180",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.positive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {trend.value}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              iconClassName || "bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {href && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View all</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

// ──────────────────────────────────────────────
// Quick Action Button
// ──────────────────────────────────────────────

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  color?: string;
}

function QuickAction({
  icon: Icon,
  label,
  description,
  onClick,
  color,
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-sm hover:border-primary/20 hover:bg-accent/30 active:scale-[0.98]"
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          color ||
            "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
          {description}
        </p>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────
// Pending Approval Row
// ──────────────────────────────────────────────

const riskConfig: Record<
  RiskLevel,
  { label: string; className: string; dot: string }
> = {
  low: {
    label: "Low",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Medium",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  high: {
    label: "High",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
};

function PendingApprovalRow({
  approval,
}: {
  approval: (typeof mockApprovals)[number];
}) {
  const risk = riskConfig[approval.risk];

  return (
    <div className="flex items-center gap-3 py-3 group">
      <div className={cn("h-2 w-2 rounded-full shrink-0", risk.dot)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{approval.actionSummary}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {approval.destination} · {formatRelativeTime(approval.createdAt)}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn("shrink-0 text-[10px]", risk.className)}
      >
        {risk.label}
      </Badge>
    </div>
  );
}

// ──────────────────────────────────────────────
// Timeline Activity Row
// ──────────────────────────────────────────────

const statusIcons: Record<TimelineStatus, LucideIcon> = {
  completed: CheckCircle2,
  failed: XCircle,
  pending: Clock,
  undone: Undo2,
};

const statusColors: Record<TimelineStatus, string> = {
  completed: "text-emerald-500",
  failed: "text-destructive",
  pending: "text-amber-500",
  undone: "text-muted-foreground",
};

function ActivityRow({
  entry,
}: {
  entry: (typeof mockTimelineEntries)[number];
}) {
  const Icon = statusIcons[entry.status as TimelineStatus] || Clock;
  const color =
    statusColors[entry.status as TimelineStatus] || "text-muted-foreground";

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn("mt-0.5 shrink-0", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight">{entry.action}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {entry.tool}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeTime(entry.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Top Tools Bar
// ──────────────────────────────────────────────

function TopToolsChart({
  tools,
}: {
  tools: { name: string; count: number }[];
}) {
  const maxCount = Math.max(...tools.map((t) => t.count), 1);

  return (
    <div className="space-y-3">
      {tools.map((tool) => {
        const percentage = Math.round((tool.count / maxCount) * 100);
        return (
          <div key={tool.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-sm">{tool.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {tool.count} uses
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/80 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Safety Mode Banner
// ──────────────────────────────────────────────

const safetyModeInfo = {
  "read-only": {
    label: "Read Only",
    icon: Eye,
    description: "Assistant can read and summarize only. No actions are taken.",
    className:
      "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  "draft-first": {
    label: "Draft First",
    icon: FileText,
    description:
      "Actions are drafted for your review. Nothing is sent without approval.",
    className:
      "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  assisted: {
    label: "Assisted",
    icon: Zap,
    description:
      "Low-risk actions are automated. Sensitive actions still need your approval.",
    className:
      "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
};

// ──────────────────────────────────────────────
// Main Dashboard Page
// ──────────────────────────────────────────────

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  const navigate = useNavigate();
  const safetyMode = useAppStore((s) => s.safetyMode);
  const glassesConnected = useAppStore((s) => s.glassesConnected);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const stats = mockStats;
  const pendingApprovals = mockApprovals.filter(
    (a) => (a.status as ApprovalStatus) === "pending",
  );
  const recentTimeline = mockTimelineEntries.slice(0, 5);
  const unreadInbox = mockInboxItems.filter((item) => !item.read);

  const modeInfo = safetyModeInfo[safetyMode];
  const ModeIcon = modeInfo.icon;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Greeting ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {getGreeting()}, Parth
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your assistant today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {glassesConnected && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Glasses className="h-3 w-3" />
                  Glasses connected
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Your smart glasses are paired and syncing
              </TooltipContent>
            </Tooltip>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to="/app/ask">
              <Sparkles className="h-3.5 w-3.5" />
              Ask Clawed
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Safety Mode Banner ── */}
      {!dismissedBanner && (
        <div
          className={cn(
            "flex items-start sm:items-center gap-3 rounded-lg border p-4 transition-colors",
            modeInfo.className,
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              modeInfo.badgeColor,
            )}
          >
            <ModeIcon className={cn("h-4 w-4", modeInfo.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">
                Safety Mode: {modeInfo.label}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {modeInfo.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate("/app/settings")}
            >
              Change
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setDismissedBanner(true)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Actions this week"
          value={stats.actionsThisWeek}
          icon={Activity}
          trend={{ value: "+12% vs last week", positive: true }}
          href="/app/timeline"
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="Pending approvals"
          value={stats.approvalsWaiting}
          subtitle={
            pendingApprovals.filter((a) => a.risk === "high").length > 0
              ? `${pendingApprovals.filter((a) => a.risk === "high").length} high risk`
              : "All low/medium risk"
          }
          icon={ShieldCheck}
          href="/app/approvals"
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          title="Undo rate"
          value={`${Math.round(stats.undoRate * 100)}%`}
          subtitle="Lower is better"
          icon={Undo2}
          trend={{ value: "-2% vs last week", positive: true }}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="Avg response time"
          value={`${stats.avgResponseTime}s`}
          subtitle="From ask to result"
          icon={Zap}
          trend={{ value: "0.3s faster", positive: true }}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
      </div>

      {/* ── Main Grid: Quick Actions + Approvals + Activity ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction
              icon={MessageSquare}
              label="Ask a question"
              description="Start a new conversation with your assistant"
              onClick={() => navigate("/app/ask")}
            />
            <QuickAction
              icon={Send}
              label="Draft a reply"
              description="Compose a response to any message"
              onClick={() => navigate("/app/ask")}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white"
            />
            <QuickAction
              icon={CalendarPlus}
              label="Create an event"
              description="Schedule a meeting or reminder"
              onClick={() => navigate("/app/ask")}
              color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white"
            />
            <QuickAction
              icon={Search}
              label="Search the web"
              description="Look up anything from the web"
              onClick={() => navigate("/app/ask")}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white"
            />
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Pending Approvals</CardTitle>
                {pendingApprovals.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    {pendingApprovals.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                asChild
              >
                <Link to="/app/approvals">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No actions waiting for your review.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingApprovals.slice(0, 5).map((approval) => (
                  <PendingApprovalRow key={approval.id} approval={approval} />
                ))}
              </div>
            )}
            {pendingApprovals.length > 5 && (
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  asChild
                >
                  <Link to="/app/approvals">
                    View {pendingApprovals.length - 5} more pending approvals
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                asChild
              >
                <Link to="/app/timeline">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTimeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Actions will appear here once your assistant starts working.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {recentTimeline.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row: Inbox Preview + Top Tools ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Inbox Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Inbox</CardTitle>
                {unreadInbox.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {unreadInbox.length} unread
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                asChild
              >
                <Link to="/app/inbox">
                  Open inbox
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {mockInboxItems.slice(0, 4).map((item) => {
                const priorityDot =
                  item.priority === "high"
                    ? "bg-red-500"
                    : item.priority === "medium"
                      ? "bg-amber-500"
                      : "bg-muted-foreground/30";

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-3 cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors"
                    onClick={() => navigate("/app/inbox")}
                  >
                    <div className="mt-2 shrink-0">
                      <span
                        className={cn(
                          "block h-2 w-2 rounded-full",
                          priorityDot,
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-sm truncate",
                            !item.read
                              ? "font-semibold"
                              : "font-medium text-muted-foreground",
                          )}
                        >
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.summary}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Tools */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Tools</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Most used this week</p>
          </CardHeader>
          <CardContent>
            <TopToolsChart tools={stats.topTools} />
          </CardContent>
        </Card>
      </div>

      {/* ── Glasses CTA (if not connected) ── */}
      {!glassesConnected && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Glasses className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold">Connect your smart glasses</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Get glanceable cards, voice commands, and hands-free interaction
                with Clawed directly on your lenses.
              </p>
            </div>
            <Button className="gap-1.5 shrink-0" asChild>
              <Link to="/app/devices">
                Pair glasses
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
