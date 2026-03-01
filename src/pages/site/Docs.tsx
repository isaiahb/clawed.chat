import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  BookOpen,
  Code2,
  FileText,
  Glasses,
  ShieldCheck,
  Plug,
  Zap,
  Search,
  ArrowRight,
  ExternalLink,
  Terminal,
  Webhook,
  KeyRound,
  ChevronRight,
  Copy,
  Check,
  Menu,
  X,
  Cpu,
  MessageSquare,
  Eye,
  Settings,
  Download,
  Globe,
  Lock,
  Radio,
  Mic,
  Cloud,
  Server,
  Smartphone,
  Hash,
} from "lucide-react";

// ──────────────────────────────────────────────
// Sidebar navigation structure
// ──────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { id: string; label: string }[];
}

const sidebarNav: NavItem[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Zap,
    children: [
      { id: "introduction", label: "Introduction" },
      { id: "quickstart", label: "Quickstart" },
      { id: "project-structure", label: "Project Structure" },
    ],
  },
  {
    id: "deployment",
    label: "Deployment",
    icon: Cloud,
    children: [
      { id: "cloud-deploy", label: "Cloud VM Deploy" },
      { id: "mac-companion", label: "Mac Companion App" },
      { id: "self-hosted", label: "Self-Hosted" },
    ],
  },
  {
    id: "smart-glasses",
    label: "Smart Glasses",
    icon: Glasses,
    children: [
      { id: "glasses-setup", label: "Pairing & Setup" },
      { id: "voice-commands", label: "Voice Commands" },
      { id: "audio-responses", label: "Audio Responses" },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Eye,
    children: [
      { id: "desktop-stream", label: "Live Desktop Stream" },
      { id: "remote-control", label: "Remote Control" },
      { id: "agent-status", label: "Agent Status" },
    ],
  },
  {
    id: "channels",
    label: "Channels & Integrations",
    icon: Plug,
    children: [
      { id: "channel-overview", label: "Overview" },
      { id: "messaging-apps", label: "Messaging Apps" },
      { id: "email-calendar", label: "Email & Calendar" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    children: [
      { id: "sandboxing", label: "Sandboxing" },
      { id: "permissions", label: "Permissions" },
      { id: "dm-pairing", label: "DM Pairing" },
    ],
  },
  {
    id: "api-reference",
    label: "API Reference",
    icon: Code2,
    children: [
      { id: "authentication", label: "Authentication" },
      { id: "endpoints", label: "Endpoints" },
      { id: "webhooks", label: "Webhooks" },
      { id: "sdk", label: "SDK" },
    ],
  },
  {
    id: "cli",
    label: "CLI Reference",
    icon: Terminal,
    children: [
      { id: "cli-install", label: "Installation" },
      { id: "cli-commands", label: "Commands" },
    ],
  },
];

// ──────────────────────────────────────────────
// Code block component
// ──────────────────────────────────────────────

function CodeBlock({
  code,
  language = "bash",
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-4 overflow-hidden border border-border/60 bg-neutral-950 shadow-sm">
      {filename && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
          <FileText className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-[12px] font-medium text-neutral-400 font-mono">
            {filename}
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-neutral-600 font-medium">
            {language}
          </span>
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono">
          <code className="text-neutral-300">{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-neutral-500 opacity-0 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-neutral-300 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Callout component
// ──────────────────────────────────────────────

function Callout({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warning" | "tip";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-blue-500/20 bg-blue-500/[0.04]",
    warning: "border-amber-500/20 bg-amber-500/[0.04]",
    tip: "border-claw-red/20 bg-claw-red/[0.04]",
  };
  const iconColor = {
    info: "text-blue-500",
    warning: "text-amber-500",
    tip: "text-claw-red",
  };
  const labels = { info: "Note", warning: "Warning", tip: "Tip" };

  return (
    <div
      className={cn(
        "my-6 border-l-2 px-5 py-4 transition-colors",
        styles[type],
      )}
    >
      <p
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.12em] mb-1.5",
          iconColor[type],
        )}
      >
        {title ?? labels[type]}
      </p>
      <div className="text-[14px] text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Section heading with anchor
// ──────────────────────────────────────────────

function SectionHeading({
  id,
  children,
  level = 2,
}: {
  id: string;
  children: React.ReactNode;
  level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  const sizeClass =
    level === 2
      ? "text-2xl sm:text-3xl font-black tracking-tight"
      : "text-lg sm:text-xl font-bold tracking-tight";

  return (
    <Tag
      id={id}
      className={cn(
        "group relative scroll-mt-24 text-foreground",
        sizeClass,
        level === 2 ? "mt-16 mb-6 first:mt-0" : "mt-10 mb-4",
      )}
    >
      <a
        href={`#${id}`}
        className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block"
      >
        <Hash className="h-4 w-4 text-muted-foreground hover:text-claw-red transition-colors" />
      </a>
      {children}
    </Tag>
  );
}

// ──────────────────────────────────────────────
// Feature card (for grid sections)
// ──────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative border border-border/50 bg-card/60 backdrop-blur-sm p-5 transition-all duration-200 hover:border-foreground/20 hover:bg-card/80 hover:shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center border border-claw-red/15 bg-claw-red/[0.06] text-claw-red mb-3 transition-colors group-hover:bg-claw-red/10 group-hover:border-claw-red/25">
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="text-[14px] font-semibold text-foreground mb-1">
        {title}
      </h4>
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Step component
// ──────────────────────────────────────────────

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 mb-8 last:mb-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-claw-red/20 bg-claw-red/[0.06] text-claw-red text-[13px] font-bold tabular-nums">
        {number}
      </div>
      <div className="pt-0.5 min-w-0 flex-1">
        <h4 className="text-[15px] font-semibold text-foreground mb-2">
          {title}
        </h4>
        <div className="text-[14px] text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Endpoint row
// ──────────────────────────────────────────────

function EndpointRow({
  method,
  path,
  description,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
}) {
  const methodColors = {
    GET: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/15",
    POST: "text-blue-600 dark:text-blue-400 bg-blue-500/[0.08] border-blue-500/15",
    PUT: "text-amber-600 dark:text-amber-400 bg-amber-500/[0.08] border-amber-500/15",
    PATCH:
      "text-orange-600 dark:text-orange-400 bg-orange-500/[0.08] border-orange-500/15",
    DELETE:
      "text-red-600 dark:text-red-400 bg-red-500/[0.08] border-red-500/15",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={cn(
            "inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border font-mono",
            methodColors[method],
          )}
        >
          {method}
        </span>
        <code className="text-[13px] font-mono text-foreground">{path}</code>
      </div>
      <p className="text-[13px] text-muted-foreground sm:ml-auto sm:text-right">
        {description}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────────

function Sidebar({
  activeSection,
  onNavigate,
  className,
}: {
  activeSection: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sidebarNav.forEach((item) => {
      init[item.id] = true;
    });
    return init;
  });

  const toggleGroup = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {sidebarNav.map((item) => {
        const Icon = item.icon;
        const isGroupActive =
          activeSection === item.id ||
          item.children?.some((c) => c.id === activeSection);
        const isExpanded = expanded[item.id];

        return (
          <div key={item.id}>
            <button
              onClick={() => {
                toggleGroup(item.id);
                if (!item.children) {
                  const el = document.getElementById(item.id);
                  el?.scrollIntoView({ behavior: "smooth" });
                  onNavigate?.();
                }
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-semibold transition-all duration-150 rounded-lg",
                isGroupActive
                  ? "text-foreground bg-muted/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isGroupActive ? "text-claw-red" : "",
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.children && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                    isExpanded && "rotate-90",
                  )}
                />
              )}
            </button>

            {item.children && isExpanded && (
              <div className="ml-4 mt-0.5 mb-1 border-l border-border/50 pl-3 flex flex-col gap-0.5">
                {item.children.map((child) => (
                  <a
                    key={child.id}
                    href={`#${child.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(child.id);
                      el?.scrollIntoView({ behavior: "smooth" });
                      onNavigate?.();
                    }}
                    className={cn(
                      "block px-3 py-1.5 text-[13px] transition-all duration-150 rounded-md",
                      activeSection === child.id
                        ? "text-claw-red font-medium bg-claw-red/[0.04]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    {child.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ──────────────────────────────────────────────
// Main Docs Page
// ──────────────────────────────────────────────

export default function DocsPage() {
  useDocumentTitle("Documentation — Clawed Chat", { suffix: "" });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("introduction");
  const contentRef = useRef<HTMLDivElement>(null);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const ids: string[] = [];
    sidebarNav.forEach((item) => {
      ids.push(item.id);
      item.children?.forEach((c) => ids.push(c.id));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen animate-page-enter">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[20%] right-[30%] h-[400px] w-[400px] bg-claw-red/[0.03] blur-[120px]" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-5 gap-1.5 px-3 py-1 text-[11px] border border-border/50 backdrop-blur-sm"
            >
              <BookOpen className="h-3 w-3" />
              Documentation
            </Badge>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl text-foreground">
              Build with <span className="text-gradient-red">Clawed</span>
            </h1>
            <p className="mt-4 text-[16px] text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Everything you need to deploy your agent, set up smart glasses,
              and integrate with the Clawed Chat platform.
            </p>

            {/* Search bar */}
            <div className="mt-8 mx-auto max-w-lg">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-claw-red" />
                <input
                  type="text"
                  placeholder="Search documentation…"
                  className="w-full border border-border/60 bg-card/60 backdrop-blur-sm px-10 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-claw-red/20 focus:border-claw-red/30 transition-all"
                  disabled
                />
                <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                Search coming soon — browse the sections below.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile nav toggle ── */}
      <div className="sticky top-14 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl lg:hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="flex w-full items-center gap-2 py-3 text-[13px] font-semibold text-muted-foreground"
          >
            {mobileNavOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
            Navigation
          </button>
        </div>
        {mobileNavOpen && (
          <div className="border-t border-border/30 bg-background/95 backdrop-blur-xl px-4 py-4 max-h-[60vh] overflow-y-auto sm:px-6">
            <Sidebar
              activeSection={activeSection}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        )}
      </div>

      {/* ── Main layout: Sidebar + Content ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-10 lg:gap-12">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-[calc(3.5rem+1px)] max-h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4 scrollbar-none">
              <Sidebar activeSection={activeSection} />
            </div>
          </aside>

          {/* Content */}
          <main
            ref={contentRef}
            className="min-w-0 flex-1 py-8 lg:py-10 lg:border-l lg:border-border/40 lg:pl-10"
          >
            {/* ─── Getting Started ─── */}
            <div id="getting-started" />

            <SectionHeading id="introduction">Introduction</SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Clawed Chat</strong> is the
              fastest way to deploy a fully autonomous AI agent. Built on top of
              the open-source{" "}
              <a
                href="https://github.com/openclaw/openclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-claw-red hover:text-claw-red-bright transition-colors underline underline-offset-[3px] decoration-claw-red/30 hover:decoration-claw-red/60"
              >
                OpenClaw
              </a>{" "}
              engine, it gives your agent a cloud VM (or runs on your Mac),
              connects it to 20+ messaging channels, and lets you interact
              through smart glasses.
            </p>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Your agent gets its own dedicated desktop environment, a Chrome
              browser it controls, and the ability to execute multi-step tasks
              autonomously — all while you watch the live stream from your
              dashboard.
            </p>

            <Callout type="tip">
              New here? Follow the{" "}
              <a
                href="#quickstart"
                className="text-claw-red hover:underline font-medium"
              >
                Quickstart
              </a>{" "}
              guide to have your first agent running in under 30 seconds.
            </Callout>

            <div className="grid gap-3 sm:grid-cols-2 my-8">
              <FeatureCard
                icon={Cloud}
                title="Cloud Deploy"
                description="One-click deployment to a managed cloud VM with automatic provisioning and scaling."
              />
              <FeatureCard
                icon={Glasses}
                title="Smart Glasses"
                description="Talk to your agent hands-free. Ask questions, get audio responses, control by voice."
              />
              <FeatureCard
                icon={Eye}
                title="Live Desktop Stream"
                description="Watch your agent work in real-time. Take over with full remote desktop control."
              />
              <FeatureCard
                icon={Plug}
                title="20+ Channels"
                description="WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams, and more."
              />
            </div>

            <SectionHeading id="quickstart" level={2}>
              Quickstart
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              Get your first agent deployed in three steps.
            </p>

            <Step number={1} title="Create your account">
              <p className="mb-3">
                Sign up at{" "}
                <Link
                  to="/sign-in"
                  className="text-claw-red hover:underline font-medium"
                >
                  clawed.chat/sign-in
                </Link>{" "}
                and choose your deployment method — cloud VM or Mac companion
                app.
              </p>
            </Step>

            <Step number={2} title="Deploy your agent">
              <p className="mb-3">
                Click <strong className="text-foreground">Deploy agent</strong>{" "}
                from your dashboard. Clawed provisions a secure VM, installs
                OpenClaw, and boots your agent's desktop environment.
              </p>
              <CodeBlock
                code={`# Or deploy via CLI
npx @clawed/cli deploy --region us-east-1

✓ Provisioning VM...
✓ Installing OpenClaw v0.9.2...
✓ Agent desktop ready
✓ Glasses pairing code: CLAW-7X4M

Your agent is live at https://dash.clawed.chat/agent/ax7k`}
                language="bash"
                filename="terminal"
              />
            </Step>

            <Step number={3} title="Connect your glasses">
              <p>
                Open the companion app on your phone, scan the pairing code, and
                put on your glasses. Say{" "}
                <strong className="text-foreground">"Hey Claw"</strong> to start
                a conversation.
              </p>
            </Step>

            <SectionHeading id="project-structure" level={3}>
              Project Structure
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              When you deploy an agent, Clawed creates the following workspace
              on the VM:
            </p>

            <CodeBlock
              code={`~/openclaw/
├── openclaw.json        # Agent configuration
├── skills/              # ClawHub skills (plugins)
│   ├── email-reader/
│   ├── calendar-sync/
│   └── web-search/
├── workspace/           # Agent's working directory
│   ├── downloads/
│   └── screenshots/
├── logs/                # Agent activity logs
└── .claw/               # Internal state & credentials`}
              language="text"
              filename="~/openclaw/"
            />

            {/* ─── Deployment ─── */}
            <SectionHeading id="deployment">Deployment</SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              Clawed Chat supports multiple deployment strategies depending on
              your needs.
            </p>

            <SectionHeading id="cloud-deploy" level={3}>
              Cloud VM Deploy
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              The default and recommended method. Clawed provisions a secure
              cloud VM with a dedicated desktop environment, installs OpenClaw,
              and configures all channels automatically.
            </p>

            <div className="border border-border/50 bg-card/40 backdrop-blur-sm p-5 my-4">
              <h4 className="text-[14px] font-semibold text-foreground mb-3">
                Cloud VM Specs
              </h4>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[13px]">
                <span className="text-muted-foreground">CPU</span>
                <span className="text-foreground font-medium">
                  4 vCPU (dedicated)
                </span>
                <span className="text-muted-foreground">Memory</span>
                <span className="text-foreground font-medium">8 GB RAM</span>
                <span className="text-muted-foreground">Storage</span>
                <span className="text-foreground font-medium">
                  80 GB NVMe SSD
                </span>
                <span className="text-muted-foreground">OS</span>
                <span className="text-foreground font-medium">
                  Ubuntu 24.04 LTS
                </span>
                <span className="text-muted-foreground">Browser</span>
                <span className="text-foreground font-medium">
                  Chromium (dedicated)
                </span>
                <span className="text-muted-foreground">Regions</span>
                <span className="text-foreground font-medium">
                  US East, EU West, APAC
                </span>
              </div>
            </div>

            <Callout type="info">
              Cloud VMs are auto-hibernated after 30 minutes of inactivity on
              the free tier. Pro and Team plans keep agents running 24/7.
            </Callout>

            <SectionHeading id="mac-companion" level={3}>
              Mac Companion App
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Run your agent locally on your Mac. The companion app installs
              OpenClaw as a background service and gives your agent a sandboxed
              desktop environment.
            </p>
            <CodeBlock
              code={`# Install via Homebrew
brew install --cask clawed

# Or download directly
curl -fsSL https://get.clawed.chat/mac | sh`}
              language="bash"
              filename="terminal"
            />

            <Callout type="warning">
              The Mac companion requires macOS 14 (Sonoma) or later with Apple
              Silicon (M1+). Intel Macs are supported but may experience reduced
              performance.
            </Callout>

            <SectionHeading id="self-hosted" level={3}>
              Self-Hosted
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              For advanced users who want full control. Deploy OpenClaw on your
              own infrastructure using Docker.
            </p>
            <CodeBlock
              code={`# Pull the official image
docker pull ghcr.io/openclaw/openclaw:latest

# Run with default configuration
docker run -d \\
  --name openclaw-agent \\
  -p 3000:3000 \\
  -p 6080:6080 \\
  -v ~/.openclaw:/root/openclaw \\
  ghcr.io/openclaw/openclaw:latest

# Connect to Clawed dashboard
npx @clawed/cli link --agent-url http://localhost:3000`}
              language="bash"
              filename="terminal"
            />

            {/* ─── Smart Glasses ─── */}
            <SectionHeading id="smart-glasses">Smart Glasses</SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              Clawed Chat includes smart glasses that connect to your agent for
              hands-free voice interaction.
            </p>

            <SectionHeading id="glasses-setup" level={3}>
              Pairing & Setup
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Your glasses pair via Bluetooth to the Clawed companion app on
              your phone, which relays commands to your agent over a secure
              WebSocket connection.
            </p>

            <Step number={1} title="Download the companion app">
              <p>
                Available on iOS (App Store) and Android (Play Store). Search
                for <strong className="text-foreground">"Clawed Chat"</strong>.
              </p>
            </Step>
            <Step number={2} title="Enable Bluetooth pairing">
              <p>
                Hold the button on the right arm of your glasses for 3 seconds
                until the LED pulses blue. Open the app and tap{" "}
                <strong className="text-foreground">Pair Glasses</strong>.
              </p>
            </Step>
            <Step number={3} title="Link to your agent">
              <p>
                Enter the pairing code from your Clawed dashboard (e.g.{" "}
                <code className="text-[13px] font-mono bg-muted/60 border border-border/50 px-1.5 py-0.5">
                  CLAW-7X4M
                </code>
                ). The app will confirm the connection.
              </p>
            </Step>

            <SectionHeading id="voice-commands" level={3}>
              Voice Commands
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Activate your agent with{" "}
              <strong className="text-foreground">"Hey Claw"</strong> followed
              by your command. The agent processes your request and responds via
              audio.
            </p>

            <div className="border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden my-4">
              <div className="border-b border-border/30 px-5 py-2.5 bg-muted/30">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Example Commands
                </span>
              </div>
              <div className="divide-y divide-border/30">
                {[
                  {
                    cmd: '"Hey Claw, check my email"',
                    desc: "Summarizes unread emails and flags urgent ones",
                  },
                  {
                    cmd: '"Hey Claw, what\'s on my calendar today?"',
                    desc: "Reads out today's schedule with times and locations",
                  },
                  {
                    cmd: '"Hey Claw, find articles about AI agents"',
                    desc: "Searches the web and reads back top results",
                  },
                  {
                    cmd: '"Hey Claw, summarize my last meeting"',
                    desc: "Pulls notes from the most recent calendar event",
                  },
                  {
                    cmd: '"Hey Claw, send a message to Alex on Slack"',
                    desc: "Composes and sends via the connected Slack channel",
                  },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 px-5 py-3"
                  >
                    <code className="text-[13px] font-mono text-foreground font-medium shrink-0">
                      {item.cmd}
                    </code>
                    <span className="text-[13px] text-muted-foreground sm:ml-auto">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <SectionHeading id="audio-responses" level={3}>
              Audio Responses
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Responses are synthesized using a low-latency TTS engine and
              played through the glasses' built-in speakers. You can configure
              voice, speed, and language in your agent settings.
            </p>

            <CodeBlock
              code={`// openclaw.json — voice configuration
{
  "glasses": {
    "wake_word": "hey claw",
    "tts": {
      "provider": "elevenlabs",
      "voice": "aria",
      "speed": 1.1,
      "language": "en-US"
    },
    "stt": {
      "provider": "deepgram",
      "model": "nova-2",
      "language": "en"
    }
  }
}`}
              language="json"
              filename="openclaw.json"
            />

            {/* ─── Dashboard ─── */}
            <SectionHeading id="dashboard">Dashboard</SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              The Clawed dashboard is your mission control — monitor your agent,
              watch it work, and take over when needed.
            </p>

            <SectionHeading id="desktop-stream" level={3}>
              Live Desktop Stream
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Your agent's desktop is streamed in real-time to your browser via
              WebRTC. You can see exactly what the agent sees: the browser it
              controls, files it opens, and actions it takes.
            </p>

            <div className="grid gap-3 sm:grid-cols-3 my-6">
              <FeatureCard
                icon={Eye}
                title="Real-time view"
                description="Sub-200ms latency desktop stream directly in your browser."
              />
              <FeatureCard
                icon={Radio}
                title="Activity log"
                description="See every action, click, and keystroke as it happens."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Screenshot history"
                description="Automatic screenshots at every major action for audit trails."
              />
            </div>

            <SectionHeading id="remote-control" level={3}>
              Remote Control
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Click the <strong className="text-foreground">Take Over</strong>{" "}
              button to switch from spectator mode to full remote desktop
              control. Your mouse and keyboard inputs are forwarded directly to
              the agent's VM.
            </p>

            <Callout type="warning">
              While you're in control, the agent pauses its autonomous actions.
              Click <strong>Release</strong> to hand control back.
            </Callout>

            <SectionHeading id="agent-status" level={3}>
              Agent Status
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              The dashboard header shows your agent's current status:
            </p>
            <div className="border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden my-4">
              <div className="divide-y divide-border/30">
                {[
                  {
                    status: "Live",
                    color: "bg-emerald-500",
                    desc: "Agent is running and processing tasks",
                  },
                  {
                    status: "Idle",
                    color: "bg-amber-500",
                    desc: "Agent is running but waiting for input",
                  },
                  {
                    status: "Provisioning",
                    color: "bg-blue-500",
                    desc: "VM is being set up (usually < 30 seconds)",
                  },
                  {
                    status: "Offline",
                    color: "bg-neutral-500",
                    desc: "Agent is stopped or hibernated",
                  },
                  {
                    status: "Error",
                    color: "bg-red-500",
                    desc: "Something went wrong — check logs",
                  },
                ].map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        item.color,
                      )}
                    />
                    <span className="text-[13px] font-semibold text-foreground w-28">
                      {item.status}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Channels ─── */}
            <SectionHeading id="channels">
              Channels & Integrations
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              Connect your agent to 20+ messaging platforms. Each channel is a
              two-way bridge — your agent can receive and send messages.
            </p>

            <SectionHeading id="channel-overview" level={3}>
              Overview
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Channels are configured in{" "}
              <code className="text-[13px] font-mono bg-muted/60 border border-border/50 px-1.5 py-0.5">
                openclaw.json
              </code>{" "}
              under the{" "}
              <code className="text-[13px] font-mono bg-muted/60 border border-border/50 px-1.5 py-0.5">
                channels
              </code>{" "}
              key. Each channel requires an authentication token and optional
              configuration.
            </p>

            <CodeBlock
              code={`// openclaw.json — channel configuration
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "phone": "+1234567890",
      "webhook_url": "https://your-agent.clawed.chat/wh/wa"
    },
    "slack": {
      "enabled": true,
      "bot_token": "xoxb-...",
      "channels": ["#general", "#engineering"]
    },
    "telegram": {
      "enabled": true,
      "bot_token": "123456:ABC-DEF..."
    }
  }
}`}
              language="json"
              filename="openclaw.json"
            />

            <SectionHeading id="messaging-apps" level={3}>
              Messaging Apps
            </SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 my-6">
              {[
                { icon: MessageSquare, name: "WhatsApp" },
                { icon: MessageSquare, name: "Telegram" },
                { icon: MessageSquare, name: "Slack" },
                { icon: MessageSquare, name: "Discord" },
                { icon: MessageSquare, name: "Signal" },
                { icon: MessageSquare, name: "iMessage" },
                { icon: MessageSquare, name: "Teams" },
                { icon: MessageSquare, name: "Matrix" },
                { icon: Globe, name: "Web Chat" },
              ].map((ch) => (
                <div
                  key={ch.name}
                  className="flex items-center gap-3 border border-border/50 bg-card/40 backdrop-blur-sm px-4 py-3 transition-colors hover:border-foreground/20"
                >
                  <ch.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[14px] font-medium text-foreground">
                    {ch.name}
                  </span>
                </div>
              ))}
            </div>

            <SectionHeading id="email-calendar" level={3}>
              Email & Calendar
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Your agent can read, compose, and send emails via Gmail and
              Outlook. Calendar integration lets it check your schedule, create
              events, and send reminders.
            </p>
            <CodeBlock
              code={`// openclaw.json — email & calendar
{
  "integrations": {
    "gmail": {
      "enabled": true,
      "oauth_scope": ["gmail.readonly", "gmail.send"],
      "watch": true,
      "pubsub_topic": "projects/your-project/topics/gmail-push"
    },
    "google_calendar": {
      "enabled": true,
      "calendar_id": "primary"
    }
  }
}`}
              language="json"
              filename="openclaw.json"
            />

            {/* ─── Security ─── */}
            <SectionHeading id="security">Security</SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              Security is built into every layer of the Clawed platform.
            </p>

            <SectionHeading id="sandboxing" level={3}>
              Sandboxing
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Every agent runs in an isolated Docker container with no access to
              the host system. Network access is restricted by default — you
              explicitly allowlist domains and ports.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 my-6">
              <FeatureCard
                icon={Lock}
                title="Container isolation"
                description="Each agent runs in its own Docker container with restricted syscalls."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Network allowlists"
                description="Only explicitly approved domains and ports are accessible."
              />
              <FeatureCard
                icon={Settings}
                title="Tool permissions"
                description="Fine-grained control over which tools and skills are available."
              />
              <FeatureCard
                icon={Eye}
                title="Audit logging"
                description="Every action is logged with timestamps and screenshots."
              />
            </div>

            <SectionHeading id="permissions" level={3}>
              Permissions
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Clawed uses a three-tier safety model to control what your agent
              can do autonomously:
            </p>
            <div className="border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden my-4">
              <div className="divide-y divide-border/30">
                {[
                  {
                    mode: "Read-only",
                    desc: "Agent can browse and read but cannot take any actions. Best for monitoring.",
                  },
                  {
                    mode: "Draft-first",
                    desc: "Agent drafts actions and waits for your approval before executing. Recommended default.",
                  },
                  {
                    mode: "Assisted",
                    desc: "Agent acts autonomously within allowlisted actions. Dangerous actions still require approval.",
                  },
                ].map((item) => (
                  <div
                    key={item.mode}
                    className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 px-5 py-3"
                  >
                    <span className="text-[13px] font-semibold text-foreground w-28 shrink-0">
                      {item.mode}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <SectionHeading id="dm-pairing" level={3}>
              DM Pairing
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              When you connect a messaging channel, Clawed uses DM pairing to
              verify that only authorized users can communicate with your agent.
              The agent will only respond to messages from paired phone numbers
              or usernames.
            </p>
            <CodeBlock
              code={`// openclaw.json — DM pairing
{
  "security": {
    "dm_pairing": {
      "whatsapp": ["+1234567890"],
      "telegram": ["@yourusername"],
      "slack": ["U0123456789"]
    },
    "require_pairing": true,
    "reject_unknown": true
  }
}`}
              language="json"
              filename="openclaw.json"
            />

            {/* ─── API Reference ─── */}
            <SectionHeading id="api-reference">API Reference</SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-2">
              The Clawed REST API lets you programmatically manage deployments,
              query agent status, and trigger actions.
            </p>
            <div className="flex items-center gap-2 mb-6">
              <Badge
                variant="outline"
                className="gap-1.5 text-[11px] backdrop-blur-sm"
              >
                <Code2 className="h-3 w-3" />
                v1.0 Beta
              </Badge>
              <span className="text-[12px] text-muted-foreground">
                Base URL:{" "}
                <code className="font-mono text-foreground">
                  https://api.clawed.chat/v1
                </code>
              </span>
            </div>

            <SectionHeading id="authentication" level={3}>
              Authentication
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              All API requests require a Bearer token. Generate one from your{" "}
              <Link
                to="/app/settings"
                className="text-claw-red hover:underline font-medium"
              >
                dashboard settings
              </Link>
              .
            </p>
            <CodeBlock
              code={`curl https://api.clawed.chat/v1/agent/status \\
  -H "Authorization: Bearer clw_sk_live_..."
  -H "Content-Type: application/json"`}
              language="bash"
              filename="terminal"
            />

            <SectionHeading id="endpoints" level={3}>
              Endpoints
            </SectionHeading>
            <div className="border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden my-4">
              <EndpointRow
                method="GET"
                path="/v1/agent/status"
                description="Get current agent status"
              />
              <EndpointRow
                method="POST"
                path="/v1/agent/ask"
                description="Send a prompt to your agent"
              />
              <EndpointRow
                method="GET"
                path="/v1/agent/sessions"
                description="List recent sessions"
              />
              <EndpointRow
                method="POST"
                path="/v1/agent/deploy"
                description="Deploy or restart the agent"
              />
              <EndpointRow
                method="DELETE"
                path="/v1/agent/stop"
                description="Stop the running agent"
              />
              <EndpointRow
                method="GET"
                path="/v1/channels"
                description="List connected channels"
              />
              <EndpointRow
                method="POST"
                path="/v1/channels/connect"
                description="Connect a new channel"
              />
              <EndpointRow
                method="GET"
                path="/v1/approvals"
                description="List pending approvals"
              />
              <EndpointRow
                method="POST"
                path="/v1/approvals/:id/approve"
                description="Approve a pending action"
              />
              <EndpointRow
                method="POST"
                path="/v1/approvals/:id/reject"
                description="Reject a pending action"
              />
            </div>

            <SectionHeading id="webhooks" level={3}>
              Webhooks
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              Register webhook URLs to receive real-time notifications when
              events occur in your agent.
            </p>
            <CodeBlock
              code={`// Register a webhook
const response = await fetch("https://api.clawed.chat/v1/webhooks", {
  method: "POST",
  headers: {
    "Authorization": "Bearer clw_sk_live_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://your-app.com/webhooks/clawed",
    events: [
      "agent.status_changed",
      "agent.task_completed",
      "approval.created",
      "channel.message_received",
    ],
  }),
});`}
              language="javascript"
              filename="webhooks.js"
            />

            <SectionHeading id="sdk" level={3}>
              SDK
            </SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
              The official TypeScript SDK wraps the REST API with typed methods
              and automatic retries.
            </p>
            <CodeBlock
              code={`// Install
bun add @clawed/sdk

// Usage
import { Clawed } from "@clawed/sdk";

const client = new Clawed({
  apiKey: process.env.CLAWED_API_KEY,
});

// Ask the agent
const result = await client.ask({
  prompt: "Summarize my unread emails",
  context: ["email"],
});

console.log(result.card.summary);
// → "You have 5 unread emails. 2 are high priority..."

// Check pending approvals
const approvals = await client.approvals.list({
  status: "pending",
});

console.log(\`\${approvals.length} actions waiting for review\`);`}
              language="typescript"
              filename="index.ts"
            />

            {/* ─── CLI ─── */}
            <SectionHeading id="cli">CLI Reference</SectionHeading>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
              The Clawed CLI lets you manage your agent from the terminal.
            </p>

            <SectionHeading id="cli-install" level={3}>
              Installation
            </SectionHeading>
            <CodeBlock
              code={`# Install globally
bun add -g @clawed/cli

# Or use npx
npx @clawed/cli --help`}
              language="bash"
              filename="terminal"
            />

            <SectionHeading id="cli-commands" level={3}>
              Commands
            </SectionHeading>
            <div className="border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden my-4">
              <div className="divide-y divide-border/30">
                {[
                  {
                    cmd: "deploy",
                    desc: "Deploy or restart your agent",
                  },
                  { cmd: "status", desc: "Check agent status" },
                  { cmd: "logs", desc: "Stream agent logs" },
                  { cmd: "stop", desc: "Stop the running agent" },
                  {
                    cmd: "link",
                    desc: "Link a self-hosted agent to the dashboard",
                  },
                  {
                    cmd: "channels",
                    desc: "List and manage connected channels",
                  },
                  {
                    cmd: "pair",
                    desc: "Generate a glasses pairing code",
                  },
                  { cmd: "config", desc: "View or edit openclaw.json" },
                  { cmd: "doctor", desc: "Diagnose common issues" },
                  { cmd: "update", desc: "Update OpenClaw to latest" },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <code className="text-[13px] font-mono text-claw-red font-medium w-28 shrink-0">
                      {item.cmd}
                    </code>
                    <span className="text-[13px] text-muted-foreground">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <CodeBlock
              code={`# Deploy to US East
clawed deploy --region us-east-1

# Stream logs in real-time
clawed logs --follow

# Check what's wrong
clawed doctor

# Generate glasses pairing code
clawed pair --ttl 300`}
              language="bash"
              filename="terminal"
            />

            {/* ─── Help CTA ─── */}
            <div className="mt-16 border border-border/50 bg-card/40 backdrop-blur-sm p-8 sm:p-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold text-foreground">Need help?</h2>
              <p className="mt-2 text-[14px] text-muted-foreground max-w-md mx-auto">
                Can't find what you're looking for? Reach out on Discord or
                contact our support team.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="outline"
                  className="gap-2 backdrop-blur-sm"
                  asChild
                >
                  <a
                    href="https://discord.gg/clawed"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Community Discord
                  </a>
                </Button>
                <Button className="gap-2 bg-claw-red hover:bg-claw-red-bright text-white">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Contact Support
                </Button>
              </div>
            </div>

            {/* Bottom spacer */}
            <div className="h-16" />
          </main>
        </div>
      </div>
    </div>
  );
}
