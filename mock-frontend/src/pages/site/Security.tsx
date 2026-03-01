import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  FileText,
  Clock,
  Database,
  KeyRound,
  UserCheck,
  ServerCrash,
  Fingerprint,
  CheckCircle2,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Safety Modes
// ──────────────────────────────────────────────

const safetyModes = [
  {
    id: "read-only",
    name: "Read Only",
    icon: Shield,
    color:
      "from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    description:
      "The assistant can read and summarize your messages, calendar, and connected sources. It cannot send, modify, or delete anything.",
    capabilities: [
      "Read emails and chat messages",
      "Summarize inbox and threads",
      "View calendar events",
      "Search connected tools",
      "Answer questions from your data",
    ],
    restricted: [
      "Cannot send messages",
      "Cannot create or edit events",
      "Cannot delete or archive",
      "Cannot make purchases",
      "Cannot change any settings",
    ],
  },
  {
    id: "draft-first",
    name: "Draft First",
    icon: ShieldCheck,
    color:
      "from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    description:
      "The assistant drafts messages and actions for your review. Nothing is sent or executed until you explicitly approve. This is the default mode.",
    capabilities: [
      "Everything in Read Only",
      "Draft reply suggestions",
      "Propose calendar events",
      "Suggest task creation",
      "Prepare bulk actions for review",
    ],
    restricted: [
      "All actions require your approval",
      "Drafts are never sent automatically",
      "Bulk operations need confirmation",
      "Sensitive actions flagged for review",
    ],
    recommended: true,
  },
  {
    id: "assisted",
    name: "Assisted Actions",
    icon: ShieldAlert,
    color:
      "from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    description:
      "The assistant can execute low-risk actions automatically based on your rules. Medium and high-risk actions still require explicit confirmation.",
    capabilities: [
      "Everything in Draft First",
      "Auto-archive newsletters",
      "Auto-snooze low-priority items",
      "Auto-add reminders",
      "Execute custom low-risk rules",
    ],
    restricted: [
      "New recipients always need approval",
      "Payments and purchases blocked",
      "Public posts require confirmation",
      "Deletions require confirmation",
      "Account changes require confirmation",
    ],
  },
];

// ──────────────────────────────────────────────
// Permissions / Scopes
// ──────────────────────────────────────────────

const permissionScopes = [
  {
    provider: "Email",
    icon: FileText,
    scopes: [
      {
        name: "Read emails",
        description: "View subject lines, body text, and attachments",
        risk: "low" as const,
      },
      {
        name: "Send emails",
        description: "Compose and send emails on your behalf",
        risk: "medium" as const,
      },
      {
        name: "Manage drafts",
        description: "Create, edit, and delete email drafts",
        risk: "low" as const,
      },
      {
        name: "Manage labels",
        description: "Archive, label, snooze, and organize emails",
        risk: "low" as const,
      },
      {
        name: "Delete emails",
        description: "Permanently delete emails from your account",
        risk: "high" as const,
      },
    ],
  },
  {
    provider: "Chat",
    icon: Eye,
    scopes: [
      {
        name: "Read messages",
        description: "View messages in channels and DMs",
        risk: "low" as const,
      },
      {
        name: "Send messages",
        description: "Post messages to channels and DMs",
        risk: "medium" as const,
      },
      {
        name: "Manage DMs",
        description: "Archive or mute direct message threads",
        risk: "low" as const,
      },
      {
        name: "List channels",
        description: "See available channels and their members",
        risk: "low" as const,
      },
    ],
  },
  {
    provider: "Calendar",
    icon: Clock,
    scopes: [
      {
        name: "Read events",
        description: "View your calendar events, times, and attendees",
        risk: "low" as const,
      },
      {
        name: "Create events",
        description: "Add new events and send invitations",
        risk: "medium" as const,
      },
      {
        name: "Modify events",
        description: "Reschedule, update details, or cancel events",
        risk: "medium" as const,
      },
    ],
  },
];

const riskColors = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

// ──────────────────────────────────────────────
// Always-confirm actions
// ──────────────────────────────────────────────

const alwaysConfirmActions = [
  {
    icon: UserCheck,
    title: "Messaging new recipients",
    description:
      "Sending messages to people you've never contacted before always requires your confirmation.",
  },
  {
    icon: KeyRound,
    title: "Payments & purchases",
    description:
      "Any financial transaction, subscription signup, or purchase requires explicit approval.",
  },
  {
    icon: ServerCrash,
    title: "Deleting data",
    description:
      "Permanent deletion of emails, messages, files, or any data always requires confirmation.",
  },
  {
    icon: Eye,
    title: "Posting publicly",
    description:
      "Sharing content to public channels, social media, or any audience beyond a private thread.",
  },
  {
    icon: Fingerprint,
    title: "Changing account settings",
    description:
      "Modifying passwords, security settings, connected accounts, or permissions.",
  },
];

// ──────────────────────────────────────────────
// Receipt fields
// ──────────────────────────────────────────────

const receiptFields = [
  {
    icon: CheckCircle2,
    label: "What was done",
    example: 'Sent reply to Alex Chen on Slack: "I\'ll review by EOD."',
  },
  {
    icon: Lock,
    label: "Where it happened",
    example: "Slack · #product-team",
  },
  {
    icon: Clock,
    label: "When it happened",
    example: "June 12, 2025 at 2:34 PM",
  },
  {
    icon: Database,
    label: "What data was used",
    example: "Original message from Alex, calendar context for tomorrow",
  },
  {
    icon: Receipt,
    label: "How to undo",
    example: "Delete the sent message within 5 minutes using the Undo button",
  },
];

// ──────────────────────────────────────────────
// Data retention options
// ──────────────────────────────────────────────

const retentionOptions = [
  {
    period: "30 days",
    description:
      "Minimal footprint. Receipts and logs auto-delete after 30 days.",
    best: "Users who want minimal data stored",
  },
  {
    period: "90 days",
    description:
      "Standard retention. Enough history to review recent activity and patterns.",
    best: "Most individual users",
    recommended: true,
  },
  {
    period: "1 year",
    description: "Extended history for audit trails and long-term reference.",
    best: "Professionals and compliance needs",
  },
  {
    period: "Custom",
    description:
      "Team plans can configure custom retention policies per data type.",
    best: "Teams with specific governance requirements",
  },
];

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default function Security() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.06),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 px-3 py-1 text-sm"
            >
              <Shield className="h-3.5 w-3.5" />
              Security & Trust
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Trust is a{" "}
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                feature
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed sm:text-xl">
              Clawed is built around the principle that you should always
              understand what the assistant is doing, why it's doing it, and
              have the power to stop or undo it. No surprises. No black boxes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Safety Modes ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Three safety modes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose how much autonomy your assistant has. You can change modes at
            any time, and we default to the safest practical option.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {safetyModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Card
                key={mode.id}
                className={cn(
                  "relative overflow-hidden bg-gradient-to-br transition-shadow hover:shadow-lg",
                  mode.color,
                )}
              >
                {mode.recommended && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
                      Default
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm",
                      mode.iconColor,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="mt-4 text-xl">{mode.name}</CardTitle>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Can do
                    </p>
                    <ul className="space-y-1.5">
                      {mode.capabilities.map((cap) => (
                        <li
                          key={cap}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Restricted
                    </p>
                    <ul className="space-y-1.5">
                      {mode.restricted.map((r) => (
                        <li
                          key={r}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Lock className="h-4 w-4 shrink-0 mt-0.5 opacity-60" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Always Confirm ───────────────────────────────── */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <Badge
              variant="destructive"
              className="mb-4 gap-1.5 px-3 py-1 text-sm"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Always Protected
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              These actions always require confirmation
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Regardless of which safety mode you choose, the following actions
              will never happen without your explicit approval.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {alwaysConfirmActions.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="border-destructive/20 bg-card"
                >
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Permission Scopes ────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Permission scopes in plain language
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every integration tells you exactly what it can access. No hidden
            permissions, no technical jargon. Each scope is labeled by risk
            level.
          </p>
        </div>

        <div className="space-y-8">
          {permissionScopes.map((provider) => {
            const Icon = provider.icon;
            return (
              <Card key={provider.provider}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle className="text-lg">
                      {provider.provider}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {provider.scopes.map((scope) => (
                      <div
                        key={scope.name}
                        className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{scope.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {scope.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 capitalize text-xs",
                            riskColors[scope.risk],
                          )}
                        >
                          {scope.risk}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Receipt Logs ─────────────────────────────────── */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge
                variant="secondary"
                className="mb-4 gap-1.5 px-3 py-1 text-sm"
              >
                <Receipt className="h-3.5 w-3.5" />
                Receipts
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                A receipt for every action
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Every completed action produces a detailed receipt card in your
                Timeline. You always know what happened, where, when, what data
                was involved, and how to undo it if possible.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Receipts are searchable, filterable, and exportable. They serve
                as your personal audit trail.
              </p>
            </div>

            <div className="space-y-4">
              {/* Simulated receipt card */}
              <Card className="overflow-hidden">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 px-5 py-3 border-b border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Action completed
                  </div>
                </div>
                <CardContent className="pt-5 space-y-4">
                  {receiptFields.map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.label} className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {field.label}
                          </p>
                          <p className="mt-0.5 text-sm">{field.example}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── Data Retention ───────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            You control your data retention
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose how long Clawed keeps your receipts, conversation history,
            and activity logs. You can export or delete your data at any time.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {retentionOptions.map((opt) => (
            <Card
              key={opt.period}
              className={cn(
                "relative transition-shadow hover:shadow-md",
                opt.recommended && "ring-2 ring-primary",
              )}
            >
              {opt.recommended && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] shadow-sm">
                    Recommended
                  </Badge>
                </div>
              )}
              <CardContent className="pt-6 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-muted">
                  <Database className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{opt.period}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
                <Separator className="my-4" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Best for:</span>{" "}
                  {opt.best}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Technical Practices ──────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How we protect your data
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Security isn't just about modes and approvals. Here's what happens
              under the hood.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Lock,
                title: "Encryption at rest & in transit",
                description:
                  "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. API keys and tokens are stored in hardware-backed secure enclaves.",
              },
              {
                icon: KeyRound,
                title: "Scoped OAuth tokens",
                description:
                  "Each integration uses the minimum required OAuth scopes. You can review and revoke any scope at any time from the Connections page.",
              },
              {
                icon: Fingerprint,
                title: "No model training on your data",
                description:
                  "Your messages, emails, and files are never used to train AI models. Your data stays yours.",
              },
              {
                icon: Eye,
                title: "Full audit trail",
                description:
                  "Every API call, tool invocation, and data access is logged. You can export your complete audit trail at any time.",
              },
              {
                icon: ServerCrash,
                title: "Data isolation",
                description:
                  "Each account's data is logically isolated. Team workspaces have additional boundary controls and access policies.",
              },
              {
                icon: UserCheck,
                title: "SOC 2 compliance",
                description:
                  "We follow SOC 2 Type II controls for security, availability, and confidentiality. Annual audits by independent third parties.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="bg-card">
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to try the safer assistant?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start in Read Only mode. Upgrade when you're comfortable. You're
              always in control.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link to="/sign-in" className="gap-2">
                  Join the beta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
