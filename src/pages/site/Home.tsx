import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { ClawScene } from "@/components/shared/ClawScene";
import {
  ArrowRight,
  Glasses,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Lock,
  ExternalLink,
  Heart,
  AlertTriangle,
  Github,
  Terminal,
  Globe,
  Server,
  Monitor,
  Bot,
  Mail,
  Calendar,
  Code2,
  FileText,
  Plug,
  Image,
  UserCheck,
  Quote,
  Cloud,
  Eye,
  Tv,
  Download,
  Play,
  Cpu,
  Mic,
  Radio,
  ShieldCheck,
  Smartphone,
  ArrowUpRight,
  Check,
  X,
  MousePointer,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useEffect, useState, type ReactNode } from "react";

// ──────────────────────────────────────────────
// Theme Toggle (floating)
// ──────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", !isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(prefersDark.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      prefersDark.addEventListener("change", handler);
      return () => prefersDark.removeEventListener("change", handler);
    }
    applyTheme(theme === "dark");
  }, [theme]);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      (typeof window !== "undefined"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : true));

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[oklch(0.18_0.004_260)] border border-[oklch(0.28_0.006_260)] shadow-2xl shadow-black/40 transition-all hover:scale-110 hover:border-claw-red/40 active:scale-95 backdrop-blur-xl"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-neutral-300" />
      ) : (
        <Moon className="h-4 w-4 text-neutral-500" />
      )}
    </button>
  );
}

// ──────────────────────────────────────────────
// Shared micro-components
// ──────────────────────────────────────────────

function Tag({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-claw-red">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

function SectionDivider() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="h-px bg-gradient-to-r from-transparent via-[oklch(0.28_0.006_260)] to-transparent" />
    </div>
  );
}

// ──────────────────────────────────────────────
// 1 · Hero — Split layout: left copy, right 3D claw
// ──────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[10%] right-[20%] h-[600px] w-[600px] rounded-full bg-claw-red/[0.04] blur-[150px]" />
        <div className="absolute bottom-[10%] left-[10%] h-[400px] w-[400px] rounded-full bg-claw-red/[0.02] blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center min-h-[calc(100vh-5rem)] py-16 sm:py-20 lg:py-0">
          {/* Left — Content */}
          <div className="flex flex-col max-w-xl lg:max-w-lg xl:max-w-xl order-2 lg:order-1">
            {/* Badge */}
            <div className="mb-6 animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full bg-claw-red/8 border border-claw-red/15 px-4 py-1.5 text-[12px] font-semibold text-claw-red backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-claw-red opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-claw-red" />
                </span>
                Now in Beta
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(2.2rem,5vw,3.75rem)] font-black leading-[1.08] tracking-tight animate-slide-up">
              <span className="text-foreground">Your AI agent,</span>
              <br />
              <span className="text-gradient-red">deployed in</span>
              <br />
              <span className="text-gradient-red">30 seconds.</span>
            </h1>

            {/* Sub */}
            <p className="mt-5 text-[16px] sm:text-[17px] leading-relaxed text-neutral-400 animate-fade-in [animation-delay:200ms]">
              Clawed Chat gives you a fully deployed{" "}
              <a
                href="https://github.com/openclaw/openclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-claw-red hover:text-claw-red-bright transition-colors underline underline-offset-[3px] decoration-claw-red/30 hover:decoration-claw-red/60"
              >
                OpenClaw
              </a>{" "}
              agent — on your hardware or in the cloud. Watch it work live. Talk
              to it from smart glasses. Control it from anywhere.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-start gap-3 animate-fade-in [animation-delay:400ms]">
              <Button
                size="lg"
                asChild
                className="gap-2 px-7 h-12 bg-claw-red hover:bg-claw-red-bright text-white font-bold text-[15px] rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(200,0,0,0.15)] hover:shadow-[0_0_40px_rgba(200,0,0,0.25)]"
              >
                <Link to="/sign-in">
                  Deploy your agent
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="gap-2 px-7 h-12 rounded-xl border-[oklch(0.28_0.006_260)] hover:border-[oklch(0.35_0.008_260)] text-neutral-300 hover:text-white hover:bg-white/[0.03] font-semibold text-[15px] transition-all"
              >
                <Link to="/glasses">
                  <Glasses className="h-4 w-4 text-claw-red" />
                  Try glasses demo
                </Link>
              </Button>
            </div>

            {/* Trust line */}
            <div className="mt-6 flex items-center gap-4 text-[12px] text-neutral-500 animate-fade-in [animation-delay:600ms]">
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-claw-red/60" />
                Free tier available
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-claw-red/60" />
                Smart glasses included
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Check className="h-3 w-3 text-claw-red/60" />
                No DevOps required
              </span>
            </div>
          </div>

          {/* Right — 3D Claw */}
          <div className="relative flex items-center justify-center order-1 lg:order-2 animate-fade-in-scale [animation-delay:300ms]">
            {/* Ambient glow behind claw */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full bg-claw-red/[0.05] blur-[80px] animate-pulse-subtle" />
            </div>

            {/* Orbit ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg
                viewBox="0 0 500 500"
                className="w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] lg:w-[420px] lg:h-[420px] animate-spin-slow"
                style={{ animationDuration: "60s" }}
              >
                <circle
                  cx="250"
                  cy="250"
                  r="210"
                  fill="none"
                  stroke="var(--claw-red)"
                  strokeWidth="0.5"
                  opacity="0.08"
                  strokeDasharray="4 16"
                />
                <circle
                  cx="250"
                  cy="250"
                  r="170"
                  fill="none"
                  stroke="var(--claw-red)"
                  strokeWidth="0.3"
                  opacity="0.05"
                  strokeDasharray="2 20"
                />
                <circle
                  cx="40"
                  cy="250"
                  r="2"
                  fill="var(--claw-red)"
                  opacity="0.15"
                />
                <circle
                  cx="460"
                  cy="250"
                  r="1.5"
                  fill="var(--claw-red)"
                  opacity="0.1"
                />
              </svg>
            </div>

            <ClawScene
              className="w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] lg:w-[460px] lg:h-[460px] xl:w-[520px] xl:h-[520px]"
              scale={0.055}
              showParticles={true}
              showRing={false}
              showShadow={true}
              showControls={false}
              autoRotate={true}
              rotationSpeed={0.005}
              cameraPosition={[0, 0.8, 4.2]}
              cameraFov={40}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 2 · The Problem / Solution
// ──────────────────────────────────────────────

function ProblemSolution() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-16">
          <Tag icon={Zap}>The Problem</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            OpenClaw is <span className="text-gradient-red">incredible</span>.
            <br />
            Setting it up is not.
          </h2>
          <p className="mt-4 text-neutral-400 leading-relaxed max-w-lg">
            OpenClaw is the hottest open-source AI agent — it browses the web,
            manages files, sends emails, controls your desktop. Think Jarvis,
            but real and open source. The hard part? Getting it running.
          </p>
        </div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Without */}
          <div className="rounded-2xl bg-[oklch(0.11_0.004_260)] border border-[oklch(0.22_0.006_260)] p-8 sm:p-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-[13px] font-bold text-red-400 uppercase tracking-wider">
                Without Clawed
              </span>
            </div>

            <div className="space-y-2 mb-8">
              {[
                { text: "$ git clone openclaw && cd openclaw", ok: true },
                { text: "$ docker compose up", ok: true },
                { text: "ERROR: port 5432 already in use", ok: false },
                { text: "Build failed. 14 errors.", ok: false },
              ].map((line, i) => (
                <div
                  key={i}
                  className={`font-mono text-[12px] px-4 py-2.5 rounded-lg ${
                    line.ok
                      ? "bg-[oklch(0.14_0.003_260)] text-neutral-500"
                      : "bg-red-950/30 text-red-400/80 border border-red-900/20"
                  }`}
                >
                  {line.text}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[
                "SSH into servers, configure Docker",
                "Manage API keys, DNS, firewalls",
                "Hours of DevOps setup",
                "Something breaks, give up",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-[14px] text-neutral-500"
                >
                  <X className="h-3.5 w-3.5 text-red-500/70 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* With */}
          <div className="rounded-2xl bg-[oklch(0.11_0.004_260)] border border-[oklch(0.22_0.006_260)] p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-emerald-500/[0.06] blur-[60px]" />

            <div className="flex items-center gap-2.5 mb-8 relative z-10">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[13px] font-bold text-emerald-400 uppercase tracking-wider">
                With Clawed Chat
              </span>
            </div>

            <div className="rounded-xl bg-[oklch(0.09_0.003_260)] border border-[oklch(0.20_0.005_260)] px-5 py-4 mb-8 relative z-10">
              <div className="flex items-center gap-2.5 text-emerald-400 font-mono text-[13px]">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Your OpenClaw agent is live.
              </div>
              <div className="mt-1.5 text-[11px] text-neutral-600 font-mono">
                Deployed in 28 seconds.
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              {[
                "One-click cloud deploy or Mac companion app",
                "Talk to your agent via smart glasses",
                "Watch it work — live desktop stream",
                "Dashboard for status, channels & skills",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-[14px] text-neutral-300"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 3 · Three Pillars
// ──────────────────────────────────────────────

const pillars = [
  {
    icon: Cloud,
    title: "One-click deploy",
    desc: "Spin up a cloud VM or install on your Mac Mini. Your OpenClaw agent is live in 30 seconds flat. No Docker. No SSH. No headaches.",
  },
  {
    icon: Glasses,
    title: "Smart glasses control",
    desc: "Talk to your agent hands-free. Ask questions, get summaries, trigger actions — all by voice while you're walking to lunch.",
  },
  {
    icon: Tv,
    title: "Live desktop streaming",
    desc: "Watch your agent browse the web, fill forms, move files — in real-time. Take over with full remote desktop control anytime.",
  },
];

function Pillars() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Tag>How it works</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            Deploy. Watch.{" "}
            <span className="text-gradient-red">Talk to your lobster.</span>
          </h2>
          <p className="mt-4 text-neutral-400">
            We handle the infrastructure. You focus on telling your AI what to
            do.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className="group rounded-2xl bg-[oklch(0.15_0.004_260)] border border-[oklch(0.24_0.006_260)] p-8 transition-all duration-300 hover:border-[oklch(0.30_0.008_260)] hover:bg-[oklch(0.16_0.005_260)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-claw-red/8 border border-claw-red/10 group-hover:bg-claw-red/12 group-hover:border-claw-red/20 transition-colors">
                  <p.icon className="h-5 w-5 text-claw-red" />
                </div>
                <span className="text-[48px] font-black text-[oklch(0.20_0.004_260)] leading-none select-none group-hover:text-[oklch(0.24_0.005_260)] transition-colors">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {p.title}
              </h3>
              <p className="text-[14px] text-neutral-500 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 4 · How It Works — Steps
// ──────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: UserCheck,
      label: "Create account",
      desc: "Sign up at clawed.chat. One click.",
    },
    {
      icon: Server,
      label: "Choose deploy",
      desc: "Cloud VM or Mac companion app.",
    },
    {
      icon: Play,
      label: "Agent goes live",
      desc: "Dashboard shows status & skills.",
    },
    {
      icon: Eye,
      label: "Watch it work",
      desc: "Live stream of your agent's desktop.",
    },
    {
      icon: Glasses,
      label: "Put on glasses",
      desc: "Talk hands-free, get audio answers.",
    },
  ];

  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[oklch(0.11_0.003_260)]" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Tag icon={MousePointer}>5 steps</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            From zero to AI agent in{" "}
            <span className="text-gradient-red">30 seconds</span>
          </h2>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-px bg-gradient-to-r from-[oklch(0.22_0.005_260)] via-claw-red/20 to-[oklch(0.22_0.005_260)]" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.16_0.004_260)] border border-[oklch(0.26_0.006_260)] relative z-10">
                    <step.icon className="h-5 w-5 text-claw-red" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-claw-red text-white text-[10px] font-bold z-20">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-[13px] font-bold text-foreground mb-1">
                  {step.label}
                </h3>
                <p className="text-[12px] text-neutral-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 5 · Capabilities
// ──────────────────────────────────────────────

const capabilities = [
  {
    icon: Mail,
    title: "Email & Messaging",
    desc: "Draft replies, triage inbox, send across channels.",
  },
  {
    icon: Code2,
    title: "Code & Dev Tools",
    desc: "Review PRs, generate tests, refactor and deploy.",
  },
  {
    icon: Globe,
    title: "Browser Control",
    desc: "Fill forms, scrape data, navigate like a human.",
  },
  {
    icon: FileText,
    title: "File Management",
    desc: "Organize, rename, convert files across your machine.",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    desc: "Manage calendar, prep meetings, track habits 24/7.",
  },
  {
    icon: Plug,
    title: "App Integration",
    desc: "Slack, Discord, GitHub, databases — your middleware.",
  },
  {
    icon: Image,
    title: "Content Creation",
    desc: "Generate images, write docs, produce creative assets.",
  },
  {
    icon: Cpu,
    title: "Desktop Control",
    desc: "Launch apps, screenshots, manage windows — full access.",
  },
];

function Capabilities() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <Tag icon={Bot}>Capabilities</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            Not just chat.{" "}
            <span className="text-gradient-red">Real work, done for you.</span>
          </h2>
          <p className="mt-4 text-neutral-400 leading-relaxed">
            Your OpenClaw agent sees your screen, uses your apps, and actually
            does things. It browses, types, clicks, and thinks — you just say
            the word.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="group flex items-start gap-4 rounded-xl bg-[oklch(0.15_0.004_260)] border border-[oklch(0.22_0.005_260)] p-5 transition-all duration-200 hover:border-[oklch(0.30_0.008_260)] hover:bg-[oklch(0.17_0.005_260)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-claw-red/8 border border-claw-red/10 group-hover:bg-claw-red/12 transition-colors">
                <cap.icon className="h-4 w-4 text-claw-red" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[13px] font-bold text-foreground mb-0.5">
                  {cap.title}
                </h3>
                <p className="text-[12px] text-neutral-500 leading-relaxed">
                  {cap.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 6 · Deployment Options
// ──────────────────────────────────────────────

function DeploymentOptions() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[oklch(0.11_0.003_260)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Tag icon={Server}>Deploy your way</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            Your hardware or ours.{" "}
            <span className="text-gradient-red">You choose.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Cloud */}
          <div className="group rounded-2xl bg-[oklch(0.14_0.004_260)] border border-[oklch(0.24_0.006_260)] overflow-hidden transition-all duration-300 hover:border-[oklch(0.30_0.008_260)]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-claw-red/8 border border-claw-red/10">
                  <Cloud className="h-6 w-6 text-claw-red" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Cloud Deploy
                  </h3>
                  <p className="text-[12px] text-neutral-500">
                    Instant · Always on · Zero maintenance
                  </p>
                </div>
              </div>
              <p className="text-[14px] text-neutral-400 leading-relaxed mb-6">
                We spin up a persistent cloud VM for your OpenClaw agent. Pick
                your plan, click deploy, and you're live in under 30 seconds.
                Automatic updates, backups, and scaling — all handled.
              </p>
            </div>
            <div className="grid grid-cols-3 border-t border-[oklch(0.22_0.005_260)]">
              {[
                { icon: Zap, label: "30s deploy" },
                { icon: Monitor, label: "Live stream" },
                { icon: ShieldCheck, label: "Encrypted" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-2 py-5 ${i < 2 ? "border-r border-[oklch(0.22_0.005_260)]" : ""}`}
                >
                  <item.icon className="h-4 w-4 text-claw-red" />
                  <span className="text-[11px] text-neutral-500 font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mac */}
          <div className="group rounded-2xl bg-[oklch(0.14_0.004_260)] border border-[oklch(0.24_0.006_260)] overflow-hidden transition-all duration-300 hover:border-[oklch(0.30_0.008_260)]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-claw-red/8 border border-claw-red/10">
                  <Download className="h-6 w-6 text-claw-red" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Mac Companion
                  </h3>
                  <p className="text-[12px] text-neutral-500">
                    Your hardware · Your data · Your rules
                  </p>
                </div>
              </div>
              <p className="text-[14px] text-neutral-400 leading-relaxed mb-6">
                Got a Mac Mini at home? Download our companion app — it installs
                OpenClaw on your machine instantly. One download, one click.
                Your data never leaves your hardware.
              </p>
            </div>
            <div className="grid grid-cols-3 border-t border-[oklch(0.22_0.005_260)]">
              {[
                { icon: Lock, label: "Fully local" },
                { icon: Cpu, label: "Your GPU" },
                { icon: Terminal, label: "One click" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-2 py-5 ${i < 2 ? "border-r border-[oklch(0.22_0.005_260)]" : ""}`}
                >
                  <item.icon className="h-4 w-4 text-claw-red" />
                  <span className="text-[11px] text-neutral-500 font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 7 · Glasses Section
// ──────────────────────────────────────────────

function GlassesSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Glasses Mockup */}
          <div className="relative flex items-center justify-center order-2 lg:order-1">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[300px] w-[300px] rounded-full bg-claw-red/[0.03] blur-[80px]" />
            </div>

            <div className="relative w-full max-w-sm">
              {/* Lens */}
              <div className="relative overflow-hidden w-full aspect-[2/1] rounded-[50%/40%] bg-gradient-to-br from-[oklch(0.16_0.004_260)] via-[oklch(0.14_0.003_260)] to-[oklch(0.11_0.003_260)] border border-white/[0.06] shadow-[0_0_80px_rgba(0,0,0,0.4),inset_0_2px_0_rgba(255,255,255,0.02)]">
                {/* Scan lines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.015]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
                  }}
                />
                {/* HUD */}
                <div className="absolute inset-0 flex items-center justify-center px-8 py-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] uppercase tracking-[0.2em] text-white/40 font-medium">
                        Done
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-white leading-tight">
                      3 emails summarized, 1 needs reply
                    </p>
                    <p className="text-[9px] text-white/50 leading-snug">
                      "Q3 budget review from Alex — urgent"
                    </p>
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-[8px] font-medium text-white">
                        Draft reply
                      </span>
                      <span className="text-[8px] text-white/30">Dismiss</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Nose bridge */}
              <div className="mx-auto -mt-1 w-8 h-3 bg-[oklch(0.18_0.004_260)] rounded-b-full border-x border-b border-white/[0.03]" />
            </div>
          </div>

          {/* Right — Copy */}
          <div className="order-1 lg:order-2">
            <Tag icon={Glasses}>Smart Glasses</Tag>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-foreground">
              Your agent,{" "}
              <span className="text-gradient-red">on your face.</span>
            </h2>

            <div className="mt-6 space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                Put on your smart glasses and talk to your OpenClaw agent by
                voice. Ask it to check your email, find an article, or summarize
                meeting notes — hear the answer read back.
              </p>
              <p>
                On your dashboard, watch the agent's desktop stream — see it
                navigate, open your inbox, or move files around in real-time.
              </p>
              <p className="font-semibold text-foreground">
                Your AI has eyes and hands, and now so do you.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {[
                { icon: Mic, label: "Voice commands" },
                { icon: Radio, label: "Audio responses" },
                { icon: Eye, label: "Live desktop view" },
                { icon: Smartphone, label: "Works on the go" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.16_0.004_260)] border border-[oklch(0.24_0.006_260)] px-4 py-2 text-[12px] text-neutral-400 font-medium"
                >
                  <item.icon className="h-3.5 w-3.5 text-claw-red" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 8 · Testimonials
// ──────────────────────────────────────────────

const testimonials = [
  {
    text: "At this point I don't even know what to call @openclaw. It is something new. After a few weeks in with it, this is the first time I have felt like I am living in the future since the launch of ChatGPT.",
    author: "Dave Morin",
    handle: "@davemorin",
  },
  {
    text: "Yeah this was 1,000% worth it. Managing Claude Code sessions I can kick off anywhere, autonomously running tests on my app and capturing errors through a sentry webhook then resolving them and opening PRs... The future is here.",
    author: "Nat Eliason",
    handle: "@nateliason",
  },
  {
    text: "I am so addicted to @openclaw. It is getting essential to my daily life. It checks, organizes, reminds, it's amazing. And it's like a good friend. Crazy.",
    author: "André Foeken",
    handle: "@dreetje",
  },
  {
    text: "Using @openclaw for a week now and it genuinely feels like early AGI. The gap between 'what I can imagine' and 'what actually works' has never been smaller.",
    author: "Tobi",
    handle: "@tobi_bsf",
  },
  {
    text: "After years of AI hype, I thought nothing could faze me. Then I installed @openclaw. From a nervous 'hi what can you do?' to full throttle — design, code review, taxes, PM, content pipelines... AI as teammate, not tool.",
    author: "Yucheng L",
    handle: "@lycfyi",
  },
  {
    text: "It's all collapsing into one unique personal OS — all apps, interfaces, walled gardens etc gone.",
    author: "Jakub Krcmar",
    handle: "@jakubkrcmar",
  },
];

function Testimonials() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[oklch(0.11_0.003_260)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Tag icon={Quote}>Community</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            People are <span className="text-gradient-red">obsessed</span> with
            the engine we build on.
          </h2>
          <p className="mt-4 text-neutral-400">
            Real reactions to OpenClaw — the AI that powers every Clawed
            deployment.
          </p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-2xl bg-[oklch(0.15_0.004_260)] border border-[oklch(0.22_0.005_260)] p-6 transition-all duration-200 hover:border-[oklch(0.28_0.007_260)]"
            >
              <p className="text-[14px] text-neutral-300 leading-relaxed mb-5">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-claw-red/8 border border-claw-red/10 text-claw-red text-[11px] font-bold">
                  {t.author[0]}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {t.author}
                  </p>
                  <p className="text-[11px] text-neutral-600">{t.handle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 9 · Why the Claw — Origin Story
// ──────────────────────────────────────────────

function WhyTheClaw() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — 3D claw */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[280px] w-[280px] rounded-full bg-claw-red/[0.04] blur-[60px] animate-pulse-subtle" />
            </div>
            <ClawScene
              className="w-[260px] h-[260px] sm:w-[320px] sm:h-[320px]"
              scale={0.048}
              showParticles={false}
              showRing={false}
              showShadow={true}
              showControls={false}
              autoRotate={true}
              rotationSpeed={0.003}
              cameraPosition={[0, 0.6, 4.5]}
              cameraFov={38}
              useOriginalMaterials={true}
            />
          </div>

          {/* Right — story */}
          <div>
            <Tag icon={Heart}>Origin Story</Tag>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-foreground">
              Built on the{" "}
              <span className="text-gradient-red">hottest AI project</span> in
              the world.
            </h2>

            <div className="mt-6 space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                <a
                  href="https://github.com/openclaw/openclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-claw-red hover:text-claw-red-bright transition-colors underline underline-offset-[3px] decoration-claw-red/30"
                >
                  OpenClaw
                </a>{" "}
                is the world's fastest-growing open-source AI project — 240k+
                stars, 920+ contributors. It started as "WhatsApp Relay" by
                Peter Steinberger, evolved through Clawdbot, Moltbot, and became
                OpenClaw. 🦞
              </p>
              <p>
                <span className="font-semibold text-foreground">
                  Clawed Chat
                </span>{" "}
                makes OpenClaw accessible to everyone. We handle deployment, add
                smart glasses integration and live desktop streaming, and give
                you a dashboard to control it all.
              </p>
              <p>
                The 3D lobster claw is open-source too, created by{" "}
                <a
                  href="https://www.thingiverse.com/thing:5326334"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-claw-red hover:text-claw-red-bright transition-colors underline underline-offset-[3px] decoration-claw-red/30"
                >
                  ScroffyToffee on Thingiverse
                </a>{" "}
                under Creative Commons.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 rounded-lg border-[oklch(0.26_0.006_260)] hover:border-[oklch(0.32_0.008_260)] hover:bg-[oklch(0.16_0.004_260)] text-[13px] font-semibold text-neutral-300 h-9"
              >
                <a
                  href="https://github.com/openclaw/openclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-3.5 w-3.5" />
                  OpenClaw on GitHub
                  <ArrowUpRight className="h-3 w-3 text-neutral-600" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 rounded-lg border-[oklch(0.26_0.006_260)] hover:border-[oklch(0.32_0.008_260)] hover:bg-[oklch(0.16_0.004_260)] text-[13px] font-semibold text-neutral-300 h-9"
              >
                <a
                  href="https://openclaw.ai/blog/introducing-openclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  The OpenClaw story
                  <ArrowUpRight className="h-3 w-3 text-neutral-600" />
                </a>
              </Button>
            </div>

            <p className="mt-6 text-[11px] text-neutral-600">
              3D model: CC-BY · ScroffyToffee · Thingiverse
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 10 · CTA — Final push with waitlist
// ──────────────────────────────────────────────

function BetaCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section className="relative py-28 sm:py-36 overflow-hidden">
      {/* Dramatic background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[oklch(0.10_0.004_260)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-claw-red/[0.04] blur-[150px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-claw-red/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-claw-red/10 border border-claw-red/15">
            <Sparkles className="h-6 w-6 text-claw-red" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08] text-foreground">
            Ready to deploy
            <br />
            <span className="text-gradient-red">your lobster?</span>{" "}
            <span className="inline-block">🦞</span>
          </h2>

          <p className="mt-5 text-neutral-400 max-w-md mx-auto leading-relaxed text-[16px]">
            Deploy your own OpenClaw agent in 30 seconds, watch it work from
            anywhere, and talk to it from your smart glasses.
          </p>

          {/* Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="gap-2 px-8 h-13 bg-claw-red hover:bg-claw-red-bright text-white font-bold text-[16px] rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(200,0,0,0.2)] hover:shadow-[0_0_60px_rgba(200,0,0,0.3)]"
            >
              <Link to="/sign-in">
                Deploy your agent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="gap-2 px-8 h-13 rounded-xl border-[oklch(0.28_0.006_260)] hover:border-[oklch(0.35_0.008_260)] text-neutral-300 hover:text-white hover:bg-white/[0.03] font-semibold text-[16px] transition-all"
            >
              <Link to="/pricing">
                View pricing
                <ChevronRight className="h-4 w-4 opacity-40" />
              </Link>
            </Button>
          </div>

          {/* Waitlist */}
          <div className="mt-20">
            <div className="h-px bg-gradient-to-r from-transparent via-[oklch(0.26_0.006_260)] to-transparent mb-12" />

            <div className="max-w-md mx-auto">
              <div className="rounded-2xl bg-[oklch(0.14_0.004_260)] border border-[oklch(0.24_0.006_260)] p-8">
                <p className="text-[13px] text-neutral-400 mb-1 font-semibold">
                  Not ready to deploy yet?
                </p>
                <p className="text-[12px] text-neutral-500 mb-6">
                  Join the waitlist. We'll let you know when your spot opens.
                </p>

                {submitted ? (
                  <div className="rounded-xl bg-claw-red/5 border border-claw-red/15 px-6 py-5 animate-fade-in-scale">
                    <p className="text-[15px] font-bold text-claw-red-bright">
                      You're on the list! 🦞
                    </p>
                    <p className="mt-1 text-[13px] text-neutral-500">
                      We'll reach out when your spot opens up.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 h-11 rounded-xl border border-[oklch(0.24_0.006_260)] bg-[oklch(0.11_0.003_260)] px-4 text-[14px] text-foreground placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-claw-red/25 focus:border-claw-red/30 transition-all"
                    />
                    <Button
                      type="submit"
                      className="h-11 px-5 bg-claw-red hover:bg-claw-red-bright text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    >
                      Join
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 11 · Easter Egg — "Not Claude"
// ──────────────────────────────────────────────

function NotClaude() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="group inline-flex items-center gap-2 text-neutral-600 hover:text-claw-red transition-colors text-[12px] cursor-pointer"
          >
            <AlertTriangle className="h-3 w-3" />
            <span className="underline underline-offset-2 decoration-dotted">
              Important legal disclaimer
            </span>
          </button>
        ) : (
          <div className="animate-fade-in-scale space-y-5">
            <div className="flex items-center gap-4 justify-center">
              <div className="h-px w-16 bg-[oklch(0.24_0.006_260)]" />
              <span className="text-xl">🦞</span>
              <div className="h-px w-16 bg-[oklch(0.24_0.006_260)]" />
            </div>

            <h3 className="text-lg font-black text-foreground">
              Not to be confused with Claude.
            </h3>

            <div className="space-y-3 text-[14px] text-neutral-400 leading-relaxed max-w-lg mx-auto">
              <p>
                We know what you're thinking.{" "}
                <span className="italic">
                  "Wait, is this that AI from Anthropic?"
                </span>
              </p>
              <p>
                No.{" "}
                <span className="font-semibold text-foreground">Claude</span> is
                a polite, thoughtful, very corporate AI that would never eat a
                fish alive in its intro screen.
              </p>
              <p>
                <span className="font-semibold text-claw-red">Clawed Chat</span>{" "}
                deploys a lobster-themed AI agent on your own hardware, lets you
                watch it work live, and puts it on your smart glasses.
                (Anthropic, please don't sue.)
              </p>
            </div>

            {/* Comparison table */}
            <div className="mt-8 rounded-xl overflow-hidden border border-[oklch(0.22_0.005_260)] text-[12px] max-w-sm mx-auto">
              <div className="grid grid-cols-3 bg-[oklch(0.14_0.004_260)] border-b border-[oklch(0.22_0.005_260)]">
                <div className="px-4 py-3 text-left" />
                <div className="px-4 py-3 text-center font-bold text-neutral-400 border-x border-[oklch(0.20_0.005_260)]">
                  Claude
                </div>
                <div className="px-4 py-3 text-center font-bold text-claw-red">
                  Clawed
                </div>
              </div>
              {[
                ["Has a claw", "❌", "🦞"],
                ["Eats fish on startup", "❌", "✅"],
                ["Deploys in 30 sec", "❌", "✅"],
                ["Smart glasses", "❌", "✅"],
                ["Live desktop stream", "❌", "✅"],
                ["Named after crustacean", "❌", "Basically"],
                [
                  "Will take over world",
                  "Politely declines",
                  "Too busy browsing HN",
                ],
              ].map(([label, claude, claw], i) => (
                <div
                  key={i}
                  className={`grid grid-cols-3 ${i % 2 === 0 ? "bg-[oklch(0.13_0.004_260)]" : "bg-[oklch(0.15_0.004_260)]"}`}
                >
                  <div className="px-4 py-2.5 text-left text-neutral-500">
                    {label}
                  </div>
                  <div className="px-4 py-2.5 text-center text-neutral-600 border-x border-[oklch(0.20_0.005_260)]">
                    {claude}
                  </div>
                  <div className="px-4 py-2.5 text-center text-neutral-300">
                    {claw}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-neutral-600 pt-2">
              No AIs were harmed in the making of this disclaimer. Several fish
              were.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default function Home() {
  useDocumentTitle(
    "Clawed Chat — Deploy Your AI Agent. Talk to It on Glasses. 🦞",
    {
      suffix: "",
    },
  );
  return (
    <>
      <ThemeToggle />
      <Hero />
      <SectionDivider />
      <ProblemSolution />
      <SectionDivider />
      <Pillars />
      <HowItWorks />
      <Capabilities />
      <DeploymentOptions />
      <SectionDivider />
      <GlassesSection />
      <Testimonials />
      <SectionDivider />
      <WhyTheClaw />
      <BetaCTA />
      <NotClaude />
    </>
  );
}
