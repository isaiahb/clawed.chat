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
  Star,
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
  ChevronRight,
  ArrowUpRight,
  Grid3x3,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useEffect, useState } from "react";

// ──────────────────────────────────────────────
// Theme Toggle (floating)
// ──────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      root.classList.toggle("dark", isDark);
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
      className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-800 bg-black shadow-2xl shadow-black/50 transition-all hover:scale-110 hover:border-claw-red/50 active:scale-95"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-white" />
      ) : (
        <Moon className="h-4 w-4 text-white" />
      )}
    </button>
  );
}

// ──────────────────────────────────────────────
// Shared micro-components
// ──────────────────────────────────────────────

function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 dark:border-neutral-700 bg-neutral-950 dark:bg-neutral-900 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-6">
      {Icon && <Icon className="h-3 w-3 text-claw-red" />}
      {children}
    </div>
  );
}

function GridLine({
  orientation = "horizontal",
  className = "",
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  if (orientation === "vertical") {
    return (
      <div
        className={`w-px bg-gradient-to-b from-transparent via-neutral-800/50 to-transparent ${className}`}
      />
    );
  }
  return (
    <div
      className={`h-px bg-gradient-to-r from-transparent via-neutral-800/50 to-transparent ${className}`}
    />
  );
}

// ──────────────────────────────────────────────
// 1 · Hero — Asymmetric Grid
// ──────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, oklch(0.5 0 0) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.5 0 0) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-claw-red/[0.03] blur-[180px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top stat strip */}
        <div className="grid grid-cols-3 border-b border-neutral-800/50 dark:border-neutral-800/40">
          {[
            { value: "240k+", label: "GitHub Stars" },
            { value: "30s", label: "Deploy Time" },
            { value: "920+", label: "Contributors" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center py-6 border-r last:border-r-0 border-neutral-800/50 dark:border-neutral-800/40"
            >
              <span className="text-2xl font-black text-foreground tracking-tight">
                {stat.value}
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Main hero grid */}
        <div className="grid lg:grid-cols-[1fr,1px,1fr] min-h-[70vh] lg:min-h-[75vh]">
          {/* Left — Copy */}
          <div className="flex flex-col justify-center py-16 sm:py-20 lg:py-24 lg:pr-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-claw-red/10 border border-claw-red/20 px-3.5 py-1 text-[11px] font-semibold text-claw-red w-fit mb-8 animate-fade-in">
              <Sparkles className="h-3 w-3" />
              Powered by OpenClaw
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.05] animate-slide-up">
              <span className="text-foreground">Deploy your</span>
              <br />
              <span className="text-foreground">AI agent.</span>
              <br />
              <span
                className="text-gradient-red animate-text-glow"
                style={{ animationDelay: "0.4s" }}
              >
                Talk to it
              </span>
              <br />
              <span
                className="text-gradient-red animate-text-glow"
                style={{ animationDelay: "0.4s" }}
              >
                on glasses.
              </span>
            </h1>

            <p
              className="mt-6 max-w-md text-neutral-400 leading-relaxed text-[15px] animate-fade-in"
              style={{ animationDelay: "0.25s" }}
            >
              Clawed Chat deploys an{" "}
              <a
                href="https://github.com/openclaw/openclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-claw-red hover:text-claw-red-bright underline underline-offset-2 transition-colors"
              >
                OpenClaw
              </a>{" "}
              agent in one click — on your hardware or in the cloud. Then talk
              to it from smart glasses, watch it work live, and control it from
              anywhere.
            </p>

            <div
              className="mt-8 flex flex-col sm:flex-row items-start gap-3 animate-fade-in"
              style={{ animationDelay: "0.45s" }}
            >
              <Button
                size="lg"
                asChild
                className="gap-2.5 px-8 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold border border-neutral-700 dark:border-neutral-300 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20 dark:shadow-white/10"
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
                className="gap-2 px-8 border-neutral-700 dark:border-neutral-600 text-foreground hover:bg-neutral-900 dark:hover:bg-neutral-800 hover:border-neutral-600 transition-all"
              >
                <Link to="/glasses">
                  <Glasses className="h-4 w-4 text-claw-red" />
                  Glasses demo
                </Link>
              </Button>
            </div>

            <p
              className="mt-5 text-[11px] text-neutral-600 dark:text-neutral-500 tracking-wide animate-fade-in"
              style={{ animationDelay: "0.6s" }}
            >
              30-second deploy · Smart glasses included · Free tier available
            </p>
          </div>

          {/* Vertical divider */}
          <div className="hidden lg:block w-px bg-neutral-800/50 dark:bg-neutral-800/40" />

          {/* Right — 3D Claw */}
          <div
            className="relative flex items-center justify-center py-12 lg:py-0 lg:pl-8 animate-fade-in-scale"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[350px] w-[350px] sm:h-[420px] sm:w-[420px] rounded-full bg-claw-red/[0.04] blur-[80px] animate-pulse-subtle" />
            </div>

            {/* Rotating arcs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg
                viewBox="0 0 500 500"
                className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[460px] lg:h-[460px] animate-spin-slow"
                style={{ animationDuration: "50s" }}
              >
                <circle
                  cx="250"
                  cy="250"
                  r="200"
                  fill="none"
                  stroke="var(--claw-red)"
                  strokeWidth="0.5"
                  opacity="0.1"
                  strokeDasharray="8 16"
                />
                <circle
                  cx="250"
                  cy="250"
                  r="160"
                  fill="none"
                  stroke="var(--claw-red)"
                  strokeWidth="0.3"
                  opacity="0.06"
                  strokeDasharray="4 20"
                />
                <circle
                  cx="50"
                  cy="250"
                  r="2"
                  fill="var(--claw-red)"
                  opacity="0.2"
                />
                <circle
                  cx="450"
                  cy="250"
                  r="2"
                  fill="var(--claw-red)"
                  opacity="0.15"
                />
              </svg>
            </div>

            <ClawScene
              className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[480px] lg:h-[480px]"
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

            {/* Corner accent */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] text-neutral-600">
              <div className="h-1.5 w-1.5 rounded-full bg-claw-red animate-pulse" />
              LIVE 3D
            </div>
          </div>
        </div>
      </div>

      <GridLine />
    </section>
  );
}

// ──────────────────────────────────────────────
// 2 · The Problem / Solution — Split Card Grid
// ──────────────────────────────────────────────

function ProblemSolution() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionLabel icon={Zap}>The Problem</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            OpenClaw is <span className="text-gradient-red">incredible</span>.
            <br className="hidden sm:block" />
            Setting it up is not.
          </h2>
          <p className="mt-4 text-neutral-500 max-w-xl mx-auto leading-relaxed">
            OpenClaw is the hottest open-source AI project — 240k+ stars on
            GitHub. It's a personal AI agent that actually does things. Think
            Jarvis, but real and open source.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-0 border border-neutral-800/60 dark:border-neutral-800/50 rounded-2xl overflow-hidden">
          {/* Without */}
          <div className="p-8 sm:p-10 bg-neutral-950/50 dark:bg-neutral-950/30 border-b md:border-b-0 md:border-r border-neutral-800/60 dark:border-neutral-800/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-3 w-3 rounded-full bg-red-600 shadow-lg shadow-red-600/30" />
              <span className="text-sm font-bold tracking-wide uppercase text-red-500">
                Without Clawed
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs mb-6">
              {[
                { text: "$ git clone openclaw && cd openclaw", error: false },
                { text: "$ docker compose up", error: false },
                { text: "ERROR: port 5432 already in use", error: true },
                { text: "Build failed. 14 errors.", error: true },
              ].map((line, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-4 py-2.5 ${line.error ? "bg-red-950/40 text-red-400 border border-red-900/30" : "bg-neutral-900 text-neutral-500 border border-neutral-800/40"}`}
                >
                  {line.text}
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              {[
                "SSH into servers, configure Docker",
                "Manage API keys, DNS, firewalls",
                "Hours of DevOps setup",
                "Something breaks, give up",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-neutral-500"
                >
                  <span className="text-red-500 text-xs">✗</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* With */}
          <div className="p-8 sm:p-10 bg-neutral-950/20 dark:bg-neutral-900/20 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-claw-red/[0.04] blur-[60px] rounded-full" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 animate-pulse" />
              <span className="text-sm font-bold tracking-wide uppercase text-emerald-500">
                With Clawed Chat
              </span>
            </div>

            <div className="rounded-xl bg-black border border-neutral-800/60 px-5 py-4 mb-6 relative z-10">
              <div className="flex items-center gap-2.5 text-emerald-400 text-sm font-mono">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Your OpenClaw agent is live.
              </div>
              <div className="mt-2 text-[11px] text-neutral-600 font-mono">
                Ready in 28 seconds.
              </div>
            </div>

            <div className="space-y-2.5 relative z-10">
              {[
                "One-click cloud deploy or Mac companion app",
                "Talk to your agent via smart glasses",
                "Watch it work — live desktop stream",
                "Dashboard for status, channels & skills",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-neutral-300"
                >
                  <span className="text-emerald-500 text-xs">✓</span>
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
// 3 · Three Pillars — Numbered Grid
// ──────────────────────────────────────────────

const pillars = [
  {
    icon: Cloud,
    title: "One-click deploy",
    desc: "Spin up a cloud VM or install on your Mac Mini — your OpenClaw agent is live in 30 seconds. No Docker, no SSH, no headaches.",
    num: "01",
  },
  {
    icon: Glasses,
    title: "Smart glasses control",
    desc: "Talk to your agent hands-free via smart glasses. Ask questions, get summaries, trigger actions — all by voice while you're on the go.",
    num: "02",
  },
  {
    icon: Tv,
    title: "Live desktop streaming",
    desc: "Watch your agent work in real-time. See it browse the web, fill forms, move files. Take over with full remote desktop control anytime.",
    num: "03",
  },
];

function Pillars() {
  return (
    <section className="relative">
      <GridLine />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-14">
          <SectionLabel icon={Grid3x3}>Core Pillars</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Deploy. Watch.{" "}
            <span className="text-gradient-red">Talk to your lobster.</span>
          </h2>
          <p className="mt-4 text-neutral-500 max-w-md mx-auto">
            We handle the infrastructure. You focus on telling your AI what to
            do.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border border-neutral-800/60 dark:border-neutral-800/50 rounded-2xl overflow-hidden">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className={`group p-8 sm:p-10 transition-all hover:bg-neutral-900/40 ${i < 2 ? "border-b md:border-b-0 md:border-r border-neutral-800/60 dark:border-neutral-800/50" : ""}`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black border border-neutral-800 group-hover:border-claw-red/30 transition-colors">
                  <p.icon className="h-5 w-5 text-claw-red" />
                </div>
                <span className="text-[40px] font-black text-neutral-800/60 dark:text-neutral-800/40 leading-none select-none group-hover:text-claw-red/20 transition-colors">
                  {p.num}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {p.title}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
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
// 4 · How It Works — Horizontal Steps
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
    <section className="relative bg-neutral-950/50 dark:bg-neutral-950/30">
      <GridLine />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-14">
          <SectionLabel icon={Play}>How it works</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            From zero to AI agent in{" "}
            <span className="text-gradient-red">30 seconds</span>
          </h2>
        </div>

        {/* Desktop: horizontal grid */}
        <div className="hidden md:grid grid-cols-5 gap-0 border border-neutral-800/60 dark:border-neutral-800/50 rounded-2xl overflow-hidden">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className={`group relative p-6 text-center transition-all hover:bg-neutral-900/50 ${i < 4 ? "border-r border-neutral-800/60 dark:border-neutral-800/50" : ""}`}
            >
              <div className="absolute top-3 left-3 text-[10px] font-bold text-claw-red">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black border border-neutral-800 mx-auto mb-4 group-hover:border-claw-red/30 transition-colors">
                <step.icon className="h-5 w-5 text-claw-red" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">
                {step.label}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {step.desc}
              </p>
              {i < 4 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden lg:flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800">
                  <ChevronRight className="h-3 w-3 text-neutral-600" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile: vertical */}
        <div className="md:hidden space-y-4">
          {steps.map((step, i) => (
            <div key={step.label} className="flex gap-4 items-start">
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black border border-neutral-800">
                  <step.icon className="h-5 w-5 text-claw-red" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-claw-red text-white text-[10px] font-bold">
                  {i + 1}
                </div>
              </div>
              <div className="pt-1">
                <h3 className="text-sm font-bold text-foreground">
                  {step.label}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <GridLine />
    </section>
  );
}

// ──────────────────────────────────────────────
// 5 · Capabilities — Dense 4×2 Bento Grid
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
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-14">
          <SectionLabel icon={Bot}>Capabilities</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Not just chat —{" "}
            <span className="text-gradient-red">real work, done for you</span>
          </h2>
          <p className="mt-4 text-neutral-500 max-w-lg mx-auto">
            Your OpenClaw agent sees your screen, uses your apps, and actually
            does things.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-800/60 dark:border-neutral-800/50 rounded-2xl overflow-hidden [&>*]:border-neutral-800/60 dark:[&>*]:border-neutral-800/50">
          {capabilities.map((cap, i) => (
            <div
              key={cap.title}
              className={`group p-6 transition-all hover:bg-neutral-900/40 ${
                i % 2 !== 1 ? "max-lg:border-r" : ""
              } ${i % 4 !== 3 ? "lg:border-r" : ""} ${
                i < 6 ? "max-lg:border-b" : ""
              } ${i < 4 ? "lg:border-b" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black border border-neutral-800 mb-4 group-hover:border-claw-red/30 transition-colors">
                <cap.icon className="h-4 w-4 text-claw-red" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">
                {cap.title}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 6 · Deployment — Side-by-Side Cards
// ──────────────────────────────────────────────

function DeploymentOptions() {
  return (
    <section className="relative bg-neutral-950/50 dark:bg-neutral-950/30">
      <GridLine />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-14">
          <SectionLabel icon={Server}>Deploy your way</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Your hardware or ours.{" "}
            <span className="text-gradient-red">You choose.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Cloud */}
          <div className="group rounded-2xl border border-neutral-800/60 dark:border-neutral-800/50 bg-black/40 p-8 sm:p-10 transition-all hover:border-claw-red/20 hover:shadow-2xl hover:shadow-claw-red/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-claw-red/[0.03] blur-[60px] rounded-full" />

            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black border border-neutral-800 group-hover:border-claw-red/30 transition-colors">
                <Cloud className="h-6 w-6 text-claw-red" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Cloud Deploy
                </h3>
                <p className="text-xs text-neutral-500 tracking-wide">
                  Instant · Always on · Zero maintenance
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-400 leading-relaxed mb-6 relative z-10">
              We spin up a persistent cloud VM for your OpenClaw agent. Pick
              your plan, click deploy, live in under 30 seconds. Automatic
              updates, backups, and scaling.
            </p>

            <div className="grid grid-cols-3 gap-0 border border-neutral-800/50 rounded-xl overflow-hidden relative z-10">
              {[
                { icon: Zap, label: "30s deploy" },
                { icon: Monitor, label: "Live stream" },
                { icon: ShieldCheck, label: "Encrypted" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-2 py-4 text-center ${i < 2 ? "border-r border-neutral-800/50" : ""}`}
                >
                  <item.icon className="h-4 w-4 text-claw-red" />
                  <span className="text-[10px] text-neutral-500 font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mac */}
          <div className="group rounded-2xl border border-neutral-800/60 dark:border-neutral-800/50 bg-black/40 p-8 sm:p-10 transition-all hover:border-claw-red/20 hover:shadow-2xl hover:shadow-claw-red/5 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-claw-red/[0.03] blur-[60px] rounded-full" />

            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black border border-neutral-800 group-hover:border-claw-red/30 transition-colors">
                <Download className="h-6 w-6 text-claw-red" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Mac Companion
                </h3>
                <p className="text-xs text-neutral-500 tracking-wide">
                  Your hardware · Your data · Your rules
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-400 leading-relaxed mb-6 relative z-10">
              Got a Mac Mini at home? Download our companion app — it installs
              OpenClaw on your machine instantly. Your data never leaves your
              hardware.
            </p>

            <div className="grid grid-cols-3 gap-0 border border-neutral-800/50 rounded-xl overflow-hidden relative z-10">
              {[
                { icon: Lock, label: "Fully local" },
                { icon: Cpu, label: "Your GPU" },
                { icon: Terminal, label: "One click" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-2 py-4 text-center ${i < 2 ? "border-r border-neutral-800/50" : ""}`}
                >
                  <item.icon className="h-4 w-4 text-claw-red" />
                  <span className="text-[10px] text-neutral-500 font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <GridLine />
    </section>
  );
}

// ──────────────────────────────────────────────
// 7 · Glasses — Immersive Section
// ──────────────────────────────────────────────

function GlassesSection() {
  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr,1px,1fr] gap-0 border border-neutral-800/60 dark:border-neutral-800/50 rounded-2xl overflow-hidden">
          {/* Left — Glasses Mockup */}
          <div className="relative flex items-center justify-center p-10 sm:p-14 bg-neutral-950/40">
            <div className="mx-auto max-w-xs w-full">
              {/* Lens shape */}
              <div className="relative overflow-hidden w-full aspect-[2/1] rounded-[50%/40%] bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 border border-white/[0.06] shadow-[0_0_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03)]">
                {/* Scan lines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.02]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
                  }}
                />
                {/* HUD content */}
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
              <div className="mx-auto -mt-1 w-8 h-3 bg-neutral-800 rounded-b-full border-x border-b border-white/[0.03]" />
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-neutral-800/60 dark:bg-neutral-800/50" />

          {/* Right — Copy */}
          <div className="p-10 sm:p-14 flex flex-col justify-center">
            <SectionLabel icon={Glasses}>Smart Glasses</SectionLabel>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Your agent,{" "}
              <span className="text-gradient-red">on your face</span>
            </h2>

            <div className="mt-5 space-y-3 text-sm text-neutral-400 leading-relaxed">
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

            <div className="mt-7 grid grid-cols-2 gap-2">
              {[
                { icon: Mic, label: "Voice commands" },
                { icon: Radio, label: "Audio responses" },
                { icon: Eye, label: "Live desktop view" },
                { icon: Smartphone, label: "Works on the go" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800/60 bg-black/40 px-3 py-2.5 text-xs text-neutral-400"
                >
                  <item.icon className="h-3.5 w-3.5 text-claw-red shrink-0" />
                  {item.label}
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
// 8 · Testimonials — Masonry-ish Grid
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
    <section className="relative bg-neutral-950/50 dark:bg-neutral-950/30">
      <GridLine />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-14">
          <SectionLabel icon={Quote}>Community</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            People are{" "}
            <span className="text-gradient-red">obsessed with the engine</span>
          </h2>
          <p className="mt-4 text-neutral-500 max-w-md mx-auto">
            What people say about OpenClaw — the AI that powers every Clawed
            deployment.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-neutral-800/60 dark:border-neutral-800/50 bg-black/30 p-6 transition-all hover:border-neutral-700 hover:bg-neutral-900/40"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="h-3 w-3 fill-claw-red text-claw-red"
                  />
                ))}
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed mb-5">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-neutral-800/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black border border-neutral-800 text-claw-red text-[11px] font-bold">
                  {t.author[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {t.author}
                  </p>
                  <p className="text-[10px] text-neutral-600">{t.handle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <GridLine />
    </section>
  );
}

// ──────────────────────────────────────────────
// 9 · Why the Claw — Story Grid
// ──────────────────────────────────────────────

function WhyTheClaw() {
  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr,1px,1.2fr] gap-0 border border-neutral-800/60 dark:border-neutral-800/50 rounded-2xl overflow-hidden">
          {/* Left — 3D claw */}
          <div className="relative flex items-center justify-center p-8 sm:p-12 bg-neutral-950/40">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[250px] w-[250px] rounded-full bg-claw-red/[0.04] blur-[60px] animate-pulse-subtle" />
            </div>
            <ClawScene
              className="w-[250px] h-[250px] sm:w-[300px] sm:h-[300px]"
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

          {/* Divider */}
          <div className="hidden lg:block w-px bg-neutral-800/60 dark:bg-neutral-800/50" />

          {/* Right — story */}
          <div className="p-8 sm:p-12">
            <SectionLabel icon={Heart}>Origin Story</SectionLabel>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Built on the{" "}
              <span className="text-gradient-red">hottest AI project</span> in
              the world
            </h2>

            <div className="mt-5 space-y-3 text-sm text-neutral-400 leading-relaxed">
              <p>
                <a
                  href="https://github.com/openclaw/openclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-claw-red hover:text-claw-red-bright underline underline-offset-2 transition-colors"
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
                  className="text-claw-red hover:text-claw-red-bright underline underline-offset-2 transition-colors"
                >
                  ScroffyToffee on Thingiverse
                </a>{" "}
                under Creative Commons.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 border-neutral-700 hover:bg-neutral-900 hover:border-neutral-600 text-xs font-semibold"
              >
                <a
                  href="https://github.com/openclaw/openclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-3 w-3" />
                  OpenClaw on GitHub
                  <ArrowUpRight className="h-3 w-3 opacity-50" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 border-neutral-700 hover:bg-neutral-900 hover:border-neutral-600 text-xs font-semibold"
              >
                <a
                  href="https://openclaw.ai/blog/introducing-openclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                  The OpenClaw story
                  <ArrowUpRight className="h-3 w-3 opacity-50" />
                </a>
              </Button>
            </div>

            <p className="mt-5 text-[10px] text-neutral-600">
              3D model: CC-BY · ScroffyToffee · Thingiverse
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 10 · CTA — Bold Final Section
// ──────────────────────────────────────────────

function BetaCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section className="relative bg-neutral-950/50 dark:bg-neutral-950/30">
      <GridLine />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="relative rounded-2xl border border-neutral-800/60 dark:border-neutral-800/50 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-claw-red/[0.04] blur-[120px]" />
          </div>

          <div className="relative z-10 p-10 sm:p-16 text-center">
            <SectionLabel icon={Sparkles}>Get Started</SectionLabel>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Ready to deploy your lobster? 🦞
            </h2>
            <p className="mt-4 text-neutral-400 max-w-md mx-auto leading-relaxed">
              Deploy your own OpenClaw agent in 30 seconds, watch it work from
              anywhere, and talk to it from your smart glasses.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                asChild
                className="gap-2.5 px-10 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold border border-neutral-700 dark:border-neutral-300 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20 dark:shadow-white/10 text-base"
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
                className="gap-2 px-8 border-neutral-700 dark:border-neutral-600 text-foreground hover:bg-neutral-900 dark:hover:bg-neutral-800 transition-all"
              >
                <Link to="/pricing">
                  View pricing
                  <ArrowRight className="h-4 w-4 opacity-50" />
                </Link>
              </Button>
            </div>

            {/* Waitlist */}
            <div className="mt-12 pt-8 border-t border-neutral-800/50 max-w-md mx-auto">
              <p className="text-xs text-neutral-500 mb-4 uppercase tracking-widest">
                Or join the waitlist
              </p>

              {submitted ? (
                <div className="rounded-xl border border-claw-red/20 bg-claw-red/5 px-6 py-5 animate-fade-in-scale">
                  <p className="text-sm font-bold text-claw-red-bright">
                    You're on the list! 🦞
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
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
                    className="flex-1 h-11 rounded-xl border border-neutral-800 bg-black px-4 text-sm text-foreground placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-claw-red/30 focus:border-claw-red/40 transition-all"
                  />
                  <Button
                    type="submit"
                    className="h-11 px-6 bg-claw-red hover:bg-claw-red-bright text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
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
      <GridLine />
    </section>
  );
}

// ──────────────────────────────────────────────
// 11 · Easter Egg — "Not Claude"
// ──────────────────────────────────────────────

function NotClaude() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="relative py-14">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="group inline-flex items-center gap-2 text-neutral-600 hover:text-claw-red transition-colors text-xs cursor-pointer"
          >
            <AlertTriangle className="h-3 w-3" />
            <span className="underline underline-offset-2 decoration-dotted">
              Important legal disclaimer
            </span>
          </button>
        ) : (
          <div className="animate-fade-in-scale space-y-5">
            <div className="flex items-center gap-4 justify-center">
              <div className="h-px w-16 bg-neutral-800" />
              <span className="text-lg">🦞</span>
              <div className="h-px w-16 bg-neutral-800" />
            </div>

            <h3 className="text-base font-black text-foreground">
              Not to be confused with Claude.
            </h3>

            <div className="space-y-3 text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
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

            {/* Comparison */}
            <div className="mt-6 rounded-xl border border-neutral-800/60 overflow-hidden text-xs max-w-sm mx-auto">
              <div className="grid grid-cols-3 bg-black font-bold text-foreground border-b border-neutral-800/60">
                <div className="px-4 py-3 text-left" />
                <div className="px-4 py-3 text-center border-x border-neutral-800/60">
                  Claude
                </div>
                <div className="px-4 py-3 text-center text-claw-red">
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
                  className={`grid grid-cols-3 ${i % 2 === 0 ? "bg-neutral-950/50" : "bg-neutral-900/20"}`}
                >
                  <div className="px-4 py-2 text-left text-neutral-500">
                    {label}
                  </div>
                  <div className="px-4 py-2 text-center text-neutral-600 border-x border-neutral-800/40">
                    {claude}
                  </div>
                  <div className="px-4 py-2 text-center text-neutral-300">
                    {claw}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-neutral-700 pt-2">
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
    { suffix: "" },
  );
  return (
    <>
      <ThemeToggle />
      <Hero />
      <ProblemSolution />
      <Pillars />
      <HowItWorks />
      <Capabilities />
      <DeploymentOptions />
      <GlassesSection />
      <Testimonials />
      <WhyTheClaw />
      <BetaCTA />
      <NotClaude />
    </>
  );
}
