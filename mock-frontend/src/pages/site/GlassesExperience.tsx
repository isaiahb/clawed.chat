import {
  MessageSquare,
  Eye,
  Terminal,
  Mic,
  Shield,
  Smartphone,
  Bluetooth,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Mail,
  ScanEye,
  Timer,
  Fingerprint,
  Zap,
  ChevronRight,
  Globe,
  Wifi,
  Server,
  Monitor,
  Bot,
  Lock,
  Github,
  Code2,
  Settings,
  Users,
  Radio,
  Plug,
  FileText,
  Hash,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { GlassesSimulator } from "@/components/shared/GlassesSimulator";

// ─── Channel Data ────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  icon: typeof MessageSquare;
  description: string;
  setup: string;
  features: string[];
  category: "messaging" | "workspace" | "extension";
}

const channels: Channel[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageSquare,
    description:
      "Link your WhatsApp account via QR code. Your OpenClaw appears as a chat contact you can message anytime.",
    setup: "openclaw channels login",
    features: [
      "Voice messages with transcription",
      "Image & media sharing",
      "Group support with mention gating",
      "Allowlist-based access control",
    ],
    category: "messaging",
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: Bot,
    description:
      "Create a Telegram bot and connect it to your gateway. Message your assistant from any device.",
    setup: 'channels.telegram.botToken: "YOUR_TOKEN"',
    features: [
      "Bot API with webhooks",
      "Group & channel support",
      "Inline commands (/status, /new, /think)",
      "DM pairing for security",
    ],
    category: "messaging",
  },
  {
    id: "slack",
    name: "Slack",
    icon: Hash,
    description:
      "Install as a Slack app using Bolt. Your AI joins your workspace as a bot member.",
    setup: "SLACK_BOT_TOKEN + SLACK_APP_TOKEN",
    features: [
      "Thread-aware conversations",
      "Channel & DM support",
      "Slash commands",
      "File sharing & reactions",
    ],
    category: "workspace",
  },
  {
    id: "discord",
    name: "Discord",
    icon: Radio,
    description:
      "Add a Discord bot to your server. Supports DMs, channels, and slash commands.",
    setup: 'channels.discord.token: "YOUR_TOKEN"',
    features: [
      "Guild & DM support",
      "Native slash commands",
      "Text commands with prefix",
      "Access group permissions",
    ],
    category: "workspace",
  },
  {
    id: "signal",
    name: "Signal",
    icon: Lock,
    description:
      "Connect via signal-cli for end-to-end encrypted conversations with your assistant.",
    setup: "Requires signal-cli + channels.signal config",
    features: [
      "E2E encrypted messaging",
      "Group support",
      "Media attachments",
      "Privacy-first architecture",
    ],
    category: "messaging",
  },
  {
    id: "imessage",
    name: "iMessage",
    icon: Smartphone,
    description:
      "Use BlueBubbles (recommended) or legacy imsg integration for iMessage on macOS.",
    setup: "channels.bluebubbles.serverUrl + password",
    features: [
      "BlueBubbles server integration",
      "Group iMessage support",
      "Webhook-based delivery",
      "Gateway can run remotely",
    ],
    category: "messaging",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    icon: Users,
    description:
      "Deploy as a Teams app via Bot Framework. Works with enterprise tenants.",
    setup: "Teams app + Bot Framework config",
    features: [
      "Tenant-wide deployment",
      "DM & group allowlists",
      "Enterprise SSO compatible",
      "Adaptive card responses",
    ],
    category: "workspace",
  },
  {
    id: "google-chat",
    name: "Google Chat",
    icon: Mail,
    description:
      "Connect via Google Chat API plugin. Works with Google Workspace accounts.",
    setup: "Google Chat API credentials",
    features: [
      "Workspace integration",
      "Space & DM support",
      "Threaded conversations",
      "Google ecosystem access",
    ],
    category: "workspace",
  },
  {
    id: "webchat",
    name: "WebChat",
    icon: Globe,
    description:
      "Built-in web interface served directly from the Gateway. No separate port or config needed.",
    setup: "Enabled by default with gateway",
    features: [
      "Zero-config setup",
      "Image upload support",
      "Gateway WebSocket transport",
      "Canvas & A2UI rendering",
    ],
    category: "extension",
  },
  {
    id: "matrix",
    name: "Matrix",
    icon: Globe,
    description:
      "Extension channel for Matrix protocol. Self-host or use any Matrix homeserver.",
    setup: "Extension: channels.matrix config",
    features: [
      "Federated messaging",
      "E2E encryption support",
      "Room & DM support",
      "Self-hosted compatible",
    ],
    category: "extension",
  },
];

// ─── Interaction Methods ─────────────────────────────────────────────────────

const interactionMethods = [
  {
    icon: MessageSquare,
    title: "Chat-first",
    description:
      "Message your assistant from WhatsApp, Telegram, Slack, or any of 15+ channels. It's like texting a coworker — except this one never sleeps.",
    details: [
      "Works on every chat surface you already use",
      "Context persists across sessions",
      "Media, voice messages, and file attachments",
      "Group support with mention gating",
    ],
  },
  {
    icon: Mic,
    title: "Voice-ready",
    description:
      "Voice Wake and Talk Mode on macOS, iOS, and Android. Always-on speech with ElevenLabs integration.",
    details: [
      "Push-to-talk or always-on modes",
      "Wake word activation",
      "Voice transcription for chat messages",
      "Continuous conversation mode",
    ],
  },
  {
    icon: Monitor,
    title: "Multi-surface",
    description:
      "macOS menu bar app, iOS/Android nodes, WebChat, CLI — your assistant follows you across every device.",
    details: [
      "macOS app with menu bar control",
      "iOS & Android companion nodes",
      "CLI for power users",
      "Canvas for visual workspaces",
    ],
  },
];

// ─── Use Case Cards ──────────────────────────────────────────────────────────

const useCaseTypes = [
  {
    category: "Inbox",
    icon: Mail,
    example: {
      line1: "Alex Chen · Slack",
      line2: "Review Q3 budget before tomorrow",
      primary: "Reply",
      secondary: "Dismiss",
    },
    description:
      "Your assistant monitors email, Slack, and messaging channels. It summarizes what matters, drafts replies using context from your files, and lets you approve with one tap.",
  },
  {
    category: "Calendar",
    icon: Calendar,
    example: {
      line1: "Design Review in 45 min",
      line2: "Zoom · Jamie, Sam, Priya",
      primary: "Prep notes",
      secondary: "Join",
    },
    description:
      "OpenClaw checks your calendar, prepares meeting notes from relevant context, sends reminders, and can find open slots to schedule meetings autonomously.",
  },
  {
    category: "Code",
    icon: Code2,
    example: {
      line1: "PR #148 — fix null check",
      line2: "auth.ts:47 · All checks passed",
      primary: "Merge",
      secondary: "Review",
    },
    description:
      "Review code, generate tests, refactor projects, and manage repos. OpenClaw can autonomously run tests, capture errors via Sentry webhook, and open PRs to fix them.",
  },
  {
    category: "Browser",
    icon: Globe,
    example: {
      line1: "Price monitor: RTX 5090",
      line2: "$1,799 → $1,649 (−8.3%)",
      primary: "Buy",
      secondary: "Track",
    },
    description:
      "OpenClaw controls a dedicated Chrome instance via CDP. It fills forms, scrapes data, monitors prices, and navigates the web like a human — all from your chat.",
  },
  {
    category: "Automation",
    icon: Zap,
    example: {
      line1: "Daily briefing ready",
      line2: "3 emails, 2 PRs, 1 meeting prep",
      primary: "View",
      secondary: "Skip",
    },
    description:
      "Cron jobs, webhook triggers, Gmail Pub/Sub — automate recurring tasks with scheduled actions that run even while you sleep.",
  },
];

// ─── Security Rules ──────────────────────────────────────────────────────────

const securityRules = [
  {
    icon: Lock,
    title: "DM pairing by default",
    description:
      "Unknown senders receive a pairing code. No messages are processed until you approve them via CLI.",
  },
  {
    icon: Fingerprint,
    title: "Allowlist-based access",
    description:
      "Control exactly who can message your assistant via per-channel allowlists. Public access requires explicit opt-in.",
  },
  {
    icon: Shield,
    title: "Docker sandboxing",
    description:
      "Run non-main sessions inside per-session Docker containers. Bash runs in Docker for group/channel sessions.",
  },
  {
    icon: ScanEye,
    title: "Prompt injection resistance",
    description:
      "Strong model recommendations (Anthropic Opus 4.6), machine-checkable security models, and community-hardened defaults.",
  },
  {
    icon: Server,
    title: "Local-first architecture",
    description:
      "Gateway runs on your machine, bound to loopback. Data never leaves your hardware unless you explicitly configure it.",
  },
  {
    icon: Settings,
    title: "Granular tool permissions",
    description:
      "Sandbox allowlists and denylists control which tools each session can access. Elevated bash requires explicit per-session toggle.",
  },
];

// ─── Setup Steps ─────────────────────────────────────────────────────────────

const setupSteps = [
  {
    step: 1,
    icon: Terminal,
    title: "Install OpenClaw",
    description:
      "One command installs everything. Works on macOS, Linux, and Windows (WSL2). Supports npm, pnpm, or bun.",
    command: "curl -fsSL https://openclaw.ai/install.sh | bash",
  },
  {
    step: 2,
    icon: Settings,
    title: "Run the onboarding wizard",
    description:
      "The wizard guides you step-by-step through gateway setup, model selection, channel pairing, and skills configuration.",
    command: "openclaw onboard --install-daemon",
  },
  {
    step: 3,
    icon: Plug,
    title: "Connect your channels",
    description:
      "Link WhatsApp via QR code, add a Telegram bot token, connect Slack & Discord apps — or skip and use WebChat.",
    command: "openclaw channels login",
  },
  {
    step: 4,
    icon: CheckCircle2,
    title: "Start using it",
    description:
      "Your gateway is running. Message your assistant from any connected channel. No setup steps. No configuration checklist. Just go.",
    command: "openclaw gateway --port 18789 --verbose",
  },
];

// ─── Mini Lens Card (for use case demos) ─────────────────────────────────────

function MiniLensCard({
  line1,
  line2,
  primary,
  secondary,
}: {
  line1: string;
  line2: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "rounded-2xl",
        "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950",
        "border border-white/10",
        "px-5 py-4",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.04] pointer-events-none" />
      <div className="relative space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[8px] uppercase tracking-widest text-white/40">
            Done
          </span>
        </div>
        <p className="text-xs font-medium text-white leading-tight">{line1}</p>
        <p className="text-[11px] text-white/60 leading-snug">{line2}</p>
        <div className="flex items-center gap-2 pt-1.5">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-medium text-white">
            {primary}
          </span>
          {secondary && (
            <span className="text-[9px] text-white/40">{secondary}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function GlassesExperience() {
  return (
    <div className="flex flex-col">
      {/* ════════ Hero ════════ */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 text-xs">
            <MessageSquare className="h-3 w-3" />
            Glasses &amp; Channels
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Smart glasses.{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Every channel.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Clawed Chat puts your OpenClaw agent on smart glasses for hands-free
            voice control — and connects it to WhatsApp, Telegram, Slack,
            Discord, Signal, iMessage, Teams, and more. Talk to your AI from
            anywhere.
          </p>

          <div className="mt-10">
            <GlassesSimulator layout="compact" interactive />
          </div>
        </div>
      </section>

      {/* ════════ Supported Channels Grid ════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Globe className="h-3 w-3" />
              15+ Channels
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Talk to your agent from anywhere
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Your Clawed Chat agent connects to the channels you already use.
              OpenClaw's gateway routes messages from all of them to one unified
              AI agent — deployed by us in 30 seconds.
            </p>
          </div>

          <Tabs defaultValue="messaging" className="w-full">
            <TabsList className="mx-auto flex w-full max-w-lg flex-wrap justify-center gap-1 bg-transparent h-auto p-1">
              {(
                [
                  {
                    value: "messaging",
                    label: "Messaging",
                    icon: MessageSquare,
                  },
                  { value: "workspace", label: "Workspace", icon: Users },
                  { value: "extension", label: "Extensions", icon: Plug },
                ] as const
              ).map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {(["messaging", "workspace", "extension"] as const).map(
              (category) => (
                <TabsContent key={category} value={category} className="mt-10">
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {channels
                      .filter((ch) => ch.category === category)
                      .map((ch) => (
                        <Card
                          key={ch.id}
                          className="group hover:border-primary/30 transition-colors"
                        >
                          <CardContent className="p-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <ch.icon className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold mb-2">{ch.name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                              {ch.description}
                            </p>

                            {/* Setup hint */}
                            <div className="rounded-md bg-muted/50 border border-border/50 px-3 py-2 mb-4">
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">
                                Setup
                              </p>
                              <code className="text-[11px] text-muted-foreground font-mono break-all">
                                {ch.setup}
                              </code>
                            </div>

                            <ul className="space-y-1.5">
                              {ch.features.map((f) => (
                                <li
                                  key={f}
                                  className="flex items-start gap-2 text-xs"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">
                                    {f}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>
              ),
            )}
          </Tabs>
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto" />

      {/* ════════ Interaction Model ════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Zap className="h-3 w-3" />
              Interaction Model
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three ways to talk to your agent
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Smart glasses, chat channels, and companion apps work together so
              you always have the fastest path from question to action.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {interactionMethods.map((method) => (
              <Card key={method.title} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
                    <method.icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-semibold mb-2">{method.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {method.description}
                  </p>

                  <ul className="space-y-2">
                    {method.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto" />

      {/* ════════ Use Cases (Cards & Actions) ════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <ScanEye className="h-3 w-3" />
              Use Cases
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What your agent can do
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              From inbox triage to code review, your Clawed Chat agent handles
              it. Watch it work live, or just ask from your glasses.
            </p>
          </div>

          <Tabs defaultValue={useCaseTypes[0].category} className="w-full">
            <TabsList className="mx-auto flex w-full max-w-xl flex-wrap justify-center gap-1 bg-transparent h-auto p-1">
              {useCaseTypes.map((ct) => (
                <TabsTrigger
                  key={ct.category}
                  value={ct.category}
                  className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <ct.icon className="h-3.5 w-3.5" />
                  {ct.category}
                </TabsTrigger>
              ))}
            </TabsList>

            {useCaseTypes.map((ct) => (
              <TabsContent
                key={ct.category}
                value={ct.category}
                className="mt-10"
              >
                <div className="grid gap-8 md:grid-cols-2 items-center max-w-4xl mx-auto">
                  {/* Simulated notification card */}
                  <div className="flex justify-center">
                    <div className="w-full max-w-xs">
                      <MiniLensCard
                        line1={ct.example.line1}
                        line2={ct.example.line2}
                        primary={ct.example.primary}
                        secondary={ct.example.secondary}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ct.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-semibold">{ct.category}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {ct.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5" />
                        Async or real-time
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Any channel
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Chat commands callout */}
          <div className="mt-16 mx-auto max-w-3xl rounded-xl border bg-muted/30 p-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              Built-in commands (works from any channel or glasses)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "/status — session status, model info, token usage",
                "/new — reset the current session",
                "/compact — compress session context into a summary",
                "/think <level> — adjust reasoning (off → xhigh)",
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground font-mono text-xs">
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto" />

      {/* ════════ Security ════════ */}
      <section className="py-20 sm:py-28 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Shield className="h-3 w-3" />
              Security
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Secure by design
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Your Clawed Chat agent connects to real messaging surfaces.
              Inbound DMs are treated as untrusted input by default. Here's how
              it stays safe.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {securityRules.map((rule) => (
              <Card
                key={rule.title}
                className="group hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <rule.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">{rule.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Safety callout */}
          <div className="mt-12 mx-auto max-w-3xl rounded-xl border-2 border-primary/20 bg-background p-6 text-center">
            <h4 className="text-lg font-semibold mb-2">
              Best practice recommendations
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              The OpenClaw community and NVIDIA recommend these precautions for
              AI agents. Clawed Chat enforces these by default:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Run on a clean machine or VM",
                "Create dedicated accounts for the agent",
                "Vet skills before enabling",
                "Secure WebUI & messaging channels",
                "Use strong models (Opus 4.6)",
              ].map((action) => (
                <Badge
                  key={action}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {action}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto" />

      {/* ════════ Companion Apps ════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Monitor className="h-3 w-3" />
              Companion Apps
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Beyond chat &amp; glasses
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Native companion apps for macOS, iOS, and Android extend your
              Clawed Chat agent with voice, camera, screen recording, and more.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {(
              [
                {
                  platform: "macOS",
                  icon: Monitor,
                  description:
                    "Menu bar app with Voice Wake, push-to-talk overlay, WebChat, debug tools, and remote gateway control.",
                  features: [
                    "Voice Wake & Talk Mode",
                    "Menu bar control plane",
                    "System.run & system.notify",
                    "Node mode for local actions",
                  ],
                },
                {
                  platform: "iOS",
                  icon: Smartphone,
                  description:
                    "Companion node that pairs via Bridge. Canvas surface, Voice Wake, camera snap, and screen recording.",
                  features: [
                    "Canvas & A2UI rendering",
                    "Voice trigger forwarding",
                    "Camera snap & clip",
                    "Bonjour pairing",
                  ],
                },
                {
                  platform: "Android",
                  icon: Smartphone,
                  description:
                    "Same pairing flow as iOS. Exposes Canvas, camera, screen capture, and optional SMS access.",
                  features: [
                    "Canvas & screen capture",
                    "Camera integration",
                    "Talk Mode support",
                    "Optional SMS channel",
                  ],
                },
              ] as const
            ).map((app) => (
              <Card key={app.platform} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-muted/30 p-6 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <app.icon className="h-8 w-8" />
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-semibold">{app.platform}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {app.description}
                    </p>
                    <ul className="space-y-1.5">
                      {app.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto" />

      {/* ════════ Setup Steps ════════ */}
      <section className="py-20 sm:py-28 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Bluetooth className="h-3 w-3" />
              Setup
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Running in under 30 seconds
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Clawed Chat handles the hard part. Pick cloud or local, click
              deploy, connect your glasses — done.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-8 top-12 bottom-12 w-px bg-border hidden sm:block" />

              <div className="space-y-8">
                {setupSteps.map((step, i) => (
                  <div key={step.step} className="flex gap-5">
                    {/* Step number / icon */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          "flex h-16 w-16 items-center justify-center rounded-2xl border-2 bg-background",
                          i === setupSteps.length - 1
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-border",
                        )}
                      >
                        <step.icon
                          className={cn(
                            "h-6 w-6",
                            i === setupSteps.length - 1
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground",
                          )}
                        />
                      </div>
                      {/* Step number badge */}
                      <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {step.step}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-2.5 flex-1">
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {step.description}
                      </p>
                      <div className="rounded-md bg-muted/50 border border-border/50 px-3 py-2">
                        <code className="text-xs font-mono text-muted-foreground select-all">
                          $ {step.command}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supported platforms */}
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Cloud deploy or self-host on any platform
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "macOS (Apple Silicon & Intel)",
                "Linux (x86_64 & ARM)",
                "Windows (WSL2)",
                "Docker",
                "DGX Spark",
              ].map((platform) => (
                <Badge
                  key={platform}
                  variant="outline"
                  className="text-xs font-normal py-1.5 px-3 gap-1.5"
                >
                  <Terminal className="h-3 w-3" />
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ Architecture Diagram ════════ */}
      <section className="border-y bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h3 className="text-center font-semibold mb-8">
            How your Clawed Chat agent connects everything
          </h3>
          <div className="mx-auto max-w-2xl">
            <Card className="overflow-hidden">
              <CardContent className="p-6 font-mono text-xs text-muted-foreground">
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {`Smart Glasses (voice) · WhatsApp · Telegram
Slack · Discord · Signal · iMessage · Teams
                    │
                    ▼
┌─────────────────────────────────────┐
│      Clawed Chat (your deploy)       │
│    ┌─ Live Desktop Stream ──────┐   │
│    │    OpenClaw Gateway         │   │
│    │    (agent control plane)    │   │
│    └─────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
 Dashboard   Agent    15+ Channels
 (web app)  Desktop    (chat apps)
    │
    ├── 🕶️ Smart Glasses (voice I/O)
    ├── 📺 Live Desktop Stream
    └── 📱 iOS / Android Nodes`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to deploy your lobster? 🦞
          </h2>
          <p className="mt-4 mx-auto max-w-lg text-muted-foreground text-lg">
            Deploy your OpenClaw agent in 30 seconds, connect your glasses, and
            start your first conversation. We handle the infrastructure.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/sign-in" className="gap-2">
                Deploy your agent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing" className="gap-2">
                View pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
