import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Button } from "../components/ui/button";

import {
  ArrowRight,
  Glasses,
  Sparkles,
  Zap,
  Lock,
  AlertTriangle,
  Terminal,
  Server,
  Monitor,
  Check,
  X,
  ChevronRight,
  Cloud,
  Eye,
  Download,
  Cpu,
  Mic,
  Radio,
  ShieldCheck,
  Smartphone,
  Quote,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

// ── Visual enhancement imports ──
import { useScrollReveal, useStaggerReveal } from "../hooks/useScrollReveal";
import { ParticleField } from "../components/shared/ParticleField";
import { GlowCursor, CardGlow } from "../components/shared/GlowCursor";
import { ScrollProgress } from "../components/shared/ScrollProgress";
import { WordRotator, Typewriter } from "../components/shared/AnimatedText";
import { LobsterClaw3D } from "../components/shared/LobsterClaw3D";

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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-claw-red/5 border border-claw-red/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-claw-red backdrop-blur-sm">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

function SectionDivider() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent rounded-full" />
    </div>
  );
}

// ──────────────────────────────────────────────
// Animated Terminal Lines
// ──────────────────────────────────────────────

const terminalLines = [
  { text: "$ git clone openclaw && cd openclaw", ok: true },
  { text: "$ docker compose up", ok: true },
  { text: "ERROR: port 5432 already in use", ok: false },
  { text: "Build failed. 14 errors.", ok: false },
];

function TerminalLines({ revealed }: { revealed: boolean }) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!revealed) {
      setVisibleLines(0);
      return;
    }
    let i = 0;
    const show = () => {
      i++;
      setVisibleLines(i);
      if (i < terminalLines.length) {
        const delay = terminalLines[i]?.ok ? 400 : 700;
        setTimeout(show, delay);
      }
    };
    const initial = setTimeout(show, 300);
    return () => clearTimeout(initial);
  }, [revealed]);

  return (
    <div className="space-y-2 mb-8">
      {terminalLines.map((line, i) => (
        <div
          key={i}
          className={`font-mono text-[12px] rounded-lg px-4 py-2.5 transition-all duration-500 ${
            i < visibleLines
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4"
          } ${
            line.ok
              ? "bg-muted/60 backdrop-blur-sm text-muted-foreground"
              : "bg-destructive/10 text-destructive rounded-lg border border-destructive/20"
          }`}
          style={{ transitionDelay: `${i * 80}ms` }}
        >
          {i < visibleLines && line.ok ? (
            <Typewriter
              text={line.text}
              speed={20}
              delay={i * 200}
              cursor={i === visibleLines - 1 && line.ok}
              cursorChar="_"
            />
          ) : i < visibleLines ? (
            <span className="animate-fade-in">{line.text}</span>
          ) : (
            <span className="invisible">{line.text}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// 1 · Hero
// ──────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[10%] right-[20%] h-[600px] w-[600px] bg-claw-red/[0.04] blur-[150px]" />
        <div className="absolute bottom-[10%] left-[10%] h-[400px] w-[400px] bg-claw-red/[0.02] blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Interactive particle field */}
      <div className="absolute inset-0 -z-[5]">
        <ParticleField
          count={35}
          hue={10}
          hueSpread={25}
          opacity={0.6}
          speed={0.7}
        />
      </div>

      {/* Cursor glow */}
      <GlowCursor size={500} opacity={0.05} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center min-h-[calc(100vh-5rem)] py-16 sm:py-20 lg:py-0">
          {/* Left — Content */}
          <div className="flex flex-col max-w-xl lg:max-w-lg xl:max-w-xl order-2 lg:order-1">
            {/* Badge */}
            <div className="mb-6 animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full bg-claw-red/8 border border-claw-red/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-claw-red backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full animate-ping bg-claw-red opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-claw-red" />
                </span>
                Beta
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(2.2rem,5vw,3.75rem)] font-black leading-[1.08] tracking-tight animate-slide-up">
              <span className="text-foreground">Your AI agent,</span>
              <br />
              <WordRotator
                words={["deployed", "running", "live", "working"]}
                interval={3000}
                transition="blur"
                className="min-w-[3ch]"
                wordClassName="text-gradient-red"
              />{" "}
              <span className="text-gradient-red">in 30 seconds.</span>
            </h1>

            {/* Sub */}
            <p className="mt-5 text-[16px] sm:text-[17px] leading-relaxed text-muted-foreground animate-fade-in [animation-delay:200ms]">
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
                className="group/btn gap-2 px-7 h-12 bg-claw-red hover:bg-claw-red-bright text-white font-bold text-[15px] transition-all active:translate-y-px shadow-md hover:shadow-lg hover:shadow-claw-red/20"
              >
                <Link to="/sign-in">
                  Deploy your agent
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="gap-2 px-7 h-12 text-muted-foreground hover:text-foreground font-semibold text-[15px] transition-all"
              >
                <Link to="/app">
                  <Glasses className="h-4 w-4 text-claw-red" />
                  Try the demo
                </Link>
              </Button>
            </div>

            {/* Trust line */}
            <div className="mt-8 flex items-center gap-4 text-[12px] text-muted-foreground animate-fade-in [animation-delay:600ms]">
              <span className="flex items-center gap-1.5 rounded-full bg-card/50 border border-border/40 px-3 py-1 backdrop-blur-sm">
                <Check className="h-3 w-3 text-claw-red" />
                Free tier available
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-card/50 border border-border/40 px-3 py-1 backdrop-blur-sm">
                <Check className="h-3 w-3 text-claw-red" />
                Smart glasses ready
              </span>
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-card/50 border border-border/40 px-3 py-1 backdrop-blur-sm">
                <Check className="h-3 w-3 text-claw-red" />
                No DevOps required
              </span>
            </div>

            {/* Hackathon attribution */}
            <div className="mt-5 animate-fade-in [animation-delay:800ms]">
              <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground/70">
                Built with
                <a
                  href="https://browser-use.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-dotted decoration-muted-foreground/30 hover:decoration-foreground/40"
                >
                  Browser Use
                </a>
                ·
                <a
                  href="https://mentra.glass"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-dotted decoration-muted-foreground/30 hover:decoration-foreground/40"
                >
                  MentraOS
                </a>
              </span>
            </div>
          </div>

          {/* Right — 3D Claw (STL) */}
          <div className="relative flex items-center justify-center order-1 lg:order-2 animate-fade-in-scale [animation-delay:300ms]">
            {/* Ambient glow behind claw */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] bg-claw-red/[0.05] blur-[80px] animate-pulse-subtle" />
            </div>

            <div className="w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] lg:w-[460px] lg:h-[460px] xl:w-[520px] xl:h-[520px]">
              <LobsterClaw3D className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 2 · The Problem / Solution
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// 2.5 · How It Works — 3-step flow
// ──────────────────────────────────────────────

function HowItWorks() {
  const { ref: titleRef, isRevealed: titleRevealed } = useScrollReveal();
  const { containerRef, revealedSet } = useStaggerReveal(3, {
    staggerMs: 200,
    threshold: 0.15,
  });

  const steps: { number: string; title: string; description: string; icon: typeof Zap }[] = [
    {
      number: "01",
      title: "Deploy",
      description:
        "Pick a provider, paste your API key (or use ours), click deploy. Your OpenClaw agent is live on a dedicated VM in under 30 seconds.",
      icon: Cloud,
    },
    {
      number: "02",
      title: "Chat",
      description:
        "Send tasks from your dashboard or smart glasses. Your agent browses the web, manages files, sends emails — whatever you need.",
      icon: Terminal,
    },
    {
      number: "03",
      title: "Watch",
      description:
        "See your agent's browser in real-time via Browser Use. Watch it click, scroll, and complete tasks — live from your dashboard.",
      icon: Eye,
    },
  ];

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div
          ref={titleRef}
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${titleRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <Tag icon={Sparkles}>How It Works</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            Three steps. <span className="text-gradient-red">That's it.</span>
          </h2>
        </div>

        <div ref={containerRef} className="grid sm:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 transition-all duration-500 hover:border-claw-red/25 hover:shadow-[0_4px_24px_oklch(0_0_0/0.08)] hover:-translate-y-0.5 overflow-hidden ${revealedSet.has(i) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-[0.97]"}`}
            >
              <CardGlow color="oklch(0.55 0.22 28)" opacity={0.03} />

              {/* Step number */}
              <div className="relative z-10 mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-claw-red/8 border border-claw-red/15 text-claw-red font-black text-[14px] tracking-tight transition-colors group-hover:bg-claw-red/12">
                  {step.number}
                </span>
                <step.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-claw-red" />
              </div>

              {/* Content */}
              <h3 className="relative z-10 text-lg font-bold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="relative z-10 text-[13px] text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Connector line (between cards on desktop) */}
              {i < 2 && (
                <div className="hidden sm:block absolute top-1/2 -right-3 w-6 h-px bg-border z-20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 3 · Problem / Solution
// ──────────────────────────────────────────────

function ProblemSolution() {
  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: withoutRef, isRevealed: withoutRevealed } = useScrollReveal({
    delay: 100,
  });
  const { ref: withRef, isRevealed: withRevealed } = useScrollReveal({
    delay: 250,
  });

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`max-w-2xl mb-16 transition-all duration-700 ${headerRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <Tag icon={Zap}>The Problem</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            OpenClaw is <span className="text-gradient-red">incredible</span>.
            <br />
            Setting it up is not.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg">
            OpenClaw is the hottest open-source AI agent — it browses the web,
            manages files, sends emails, controls your desktop. The hard part?
            Getting it running.
          </p>
        </div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Without */}
          <div
            ref={withoutRef}
            className={`rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 sm:p-10 relative overflow-hidden transition-all duration-700 shadow-sm ${withoutRevealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
          >
            <CardGlow color="oklch(0.55 0.22 28)" opacity={0.04} />
            <div className="flex items-center gap-2.5 mb-8">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-[0.12em]">
                Without Clawed
              </span>
            </div>

            <TerminalLines revealed={withoutRevealed} />

            <div className="space-y-3">
              {[
                "SSH into servers, configure Docker",
                "Manage API keys, DNS, firewalls",
                "Hours of DevOps setup",
                "Something breaks, give up",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-[14px] text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 text-destructive/70 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* With */}
          <div
            ref={withRef}
            className={`rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 sm:p-10 relative overflow-hidden transition-all duration-700 shadow-sm ${withRevealed ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
          >
            <CardGlow color="oklch(0.55 0.2 145)" opacity={0.05} />
            <div className="absolute -top-20 -right-20 h-40 w-40 bg-emerald-500/[0.06] blur-[60px]" />

            <div className="flex items-center gap-2.5 mb-8 relative z-10">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.12em]">
                With Clawed Chat
              </span>
            </div>

            <div
              className={`rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] backdrop-blur-sm px-5 py-4 mb-8 relative z-10 transition-all duration-700 ${withRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
              style={{ transitionDelay: "400ms" }}
            >
              <div className="flex items-center gap-2.5 text-emerald-400 font-mono text-[13px]">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {withRevealed ? (
                  <Typewriter
                    text="Your OpenClaw agent is live."
                    speed={35}
                    delay={600}
                  />
                ) : (
                  <span className="opacity-0">
                    Your OpenClaw agent is live.
                  </span>
                )}
              </div>
              <div
                className={`mt-1.5 text-[11px] text-muted-foreground font-mono transition-opacity duration-500 ${withRevealed ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: "1800ms" }}
              >
                Deployed in 28 seconds · 3 channels active
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              {[
                "One-click cloud deploy or Mac companion app",
                "Talk to your agent via smart glasses",
                "Watch it work — live desktop stream",
                "Dashboard for status, channels & skills",
              ].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 text-[14px] text-foreground transition-all duration-500 ${withRevealed ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
                  style={{ transitionDelay: `${800 + i * 150}ms` }}
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
// 3 · Deployment Options
// ──────────────────────────────────────────────

function DeploymentOptions() {
  const { ref: titleRef, isRevealed: titleRevealed } = useScrollReveal();
  const { ref: cloudRef, isRevealed: cloudRevealed } = useScrollReveal({
    delay: 100,
  });
  const { ref: macRef, isRevealed: macRevealed } = useScrollReveal({
    delay: 250,
  });

  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-muted" />
      <div className="absolute inset-0 bg-dots opacity-30 dark:opacity-15 pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          ref={titleRef}
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${titleRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <Tag icon={Server}>Deploy your way</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            Your hardware or ours.{" "}
            <span className="text-gradient-red">You choose.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Cloud */}
          <div
            ref={cloudRef}
            className={`group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-foreground/25 hover:-translate-y-1 hover:shadow-[0_8px_30px_oklch(0_0_0/0.08)] relative ${cloudRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <CardGlow />
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-claw-red/8 border border-claw-red/10 backdrop-blur-sm">
                  <Cloud className="h-6 w-6 text-claw-red" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Cloud Deploy
                  </h3>
                  <p className="text-[12px] text-muted-foreground">
                    Instant · Always on · Zero maintenance
                  </p>
                </div>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                We spin up a persistent cloud VM for your OpenClaw agent. Click
                deploy and you're live in under 30 seconds. Automatic updates,
                backups, and scaling — all handled.
              </p>
            </div>
            <div className="grid grid-cols-3 border-t border-border">
              {[
                { icon: Zap, label: "30s deploy" },
                { icon: Monitor, label: "Live stream" },
                { icon: ShieldCheck, label: "Encrypted" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-2 py-5 ${i < 2 ? "border-r border-border" : ""}`}
                >
                  <item.icon className="h-4 w-4 text-claw-red" />
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mac */}
          <div
            ref={macRef}
            className={`group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-foreground/25 hover:-translate-y-1 hover:shadow-[0_8px_30px_oklch(0_0_0/0.08)] relative ${macRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <CardGlow />
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-claw-red/8 border border-claw-red/10 backdrop-blur-sm">
                  <Download className="h-6 w-6 text-claw-red" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Mac Companion
                  </h3>
                  <p className="text-[12px] text-muted-foreground">
                    Your hardware · Your data · Your rules
                  </p>
                </div>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Got a Mac at home? Download our companion app — it installs
                OpenClaw on your machine instantly. One download, one click.
                Your data never leaves your hardware.
              </p>
            </div>
            <div className="grid grid-cols-3 border-t border-border">
              {[
                { icon: Lock, label: "Fully local" },
                { icon: Cpu, label: "Your GPU" },
                { icon: Terminal, label: "One click" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-2 py-5 ${i < 2 ? "border-r border-border" : ""}`}
                >
                  <item.icon className="h-4 w-4 text-claw-red" />
                  <span className="text-[11px] text-muted-foreground font-medium">
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
// 4 · Smart Glasses
// ──────────────────────────────────────────────

function GlassesSection() {
  const { ref: copyRef, isRevealed: copyRevealed } = useScrollReveal({
    delay: 200,
  });

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <div
          ref={copyRef}
          className={`transition-all duration-700 ${copyRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <Tag icon={Glasses}>Smart Glasses</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-foreground">
            Your agent, <span className="text-gradient-red">on your face.</span>
          </h2>

          <p className="mt-6 text-[15px] text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Put on your smart glasses and talk to your OpenClaw agent by voice.
            Ask it to check your email, find an article, or summarize meeting
            notes — hear the answer read back. On your dashboard, watch the
            agent's desktop stream in real-time.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {[
              { icon: Mic, label: "Voice commands" },
              { icon: Radio, label: "Audio responses" },
              { icon: Eye, label: "Live desktop view" },
              { icon: Smartphone, label: "Works on the go" },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm px-3 py-1.5 text-[12px] text-muted-foreground font-medium"
              >
                <item.icon className="h-3.5 w-3.5 text-claw-red" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// 5 · Testimonials (trimmed to 3)
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
];

function Testimonials() {
  const { ref: titleRef, isRevealed: titleRevealed } = useScrollReveal();
  const { containerRef, revealedSet } = useStaggerReveal(testimonials.length, {
    staggerMs: 120,
    threshold: 0.05,
  });

  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-muted" />
      <div className="absolute inset-0 bg-dots opacity-30 dark:opacity-15 pointer-events-none" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div
          ref={titleRef}
          className={`text-center max-w-2xl mx-auto mb-14 transition-all duration-700 ${titleRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <Tag icon={Quote}>Community</Tag>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            People are <span className="text-gradient-red">obsessed</span>.
          </h2>
          <p className="mt-3 text-[13px] text-muted-foreground">
            What the OpenClaw community is saying about the agent powering Clawed Chat.
          </p>
        </div>

        <div ref={containerRef} className="grid sm:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 transition-all duration-500 hover:border-foreground/25 hover:shadow-[0_4px_20px_oklch(0_0_0/0.08)] hover:-translate-y-0.5 relative overflow-hidden ${revealedSet.has(i) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.97]"}`}
            >
              <CardGlow size={250} opacity={0.04} />
              <p className="text-[14px] text-foreground/80 leading-relaxed mb-5 relative z-10">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-claw-red/8 border border-claw-red/10 text-claw-red text-[11px] font-bold select-none">
                  {t.author[0]}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {t.author}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.handle}
                  </p>
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
// 6 · CTA
// ──────────────────────────────────────────────

function BetaCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { ref: ctaRef, isRevealed: ctaRevealed } = useScrollReveal({
    threshold: 0.2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section className="relative py-28 sm:py-36 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-secondary" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] bg-claw-red/[0.04] blur-[150px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-border" />
      </div>

      <div
        ref={ctaRef}
        className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"
      >
        <div
          className={`text-center transition-all duration-1000 ${ctaRevealed ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-[0.97]"}`}
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-claw-red/10 border border-claw-red/15 backdrop-blur-sm">
            <Sparkles className="h-6 w-6 text-claw-red" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08] text-foreground">
            Ready to deploy
            <br />
            <span className="text-gradient-red">your lobster?</span>{" "}
            <span className="inline-block">🦞</span>
          </h2>

          <p className="mt-5 text-muted-foreground max-w-md mx-auto leading-relaxed text-[16px]">
            Deploy your own OpenClaw agent in 30 seconds, watch it work from
            anywhere, and talk to it from your smart glasses.
          </p>

          {/* Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="gap-2 px-8 h-13 bg-claw-red hover:bg-claw-red-bright text-white font-bold text-[16px] transition-all active:translate-y-px shadow-lg hover:shadow-xl hover:shadow-claw-red/20"
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
              className="gap-2 px-8 h-13 text-muted-foreground hover:text-foreground font-semibold text-[16px] transition-all"
            >
              <Link to="/pricing">
                View pricing
                <ChevronRight className="h-4 w-4 opacity-40" />
              </Link>
            </Button>
          </div>

          {/* Waitlist */}
          <div className="mt-16">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-10" />
            <div className="max-w-md mx-auto">
              <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-sm">
                <p className="text-[13px] text-foreground mb-1 font-semibold">
                  Not ready yet?
                </p>
                <p className="text-[12px] text-muted-foreground mb-6">
                  Join the waitlist — we'll let you know when your spot opens.
                </p>

                {submitted ? (
                  <div className="rounded-xl bg-claw-red/5 border border-claw-red/15 px-6 py-5 animate-fade-in-scale backdrop-blur-sm">
                    <p className="text-[15px] font-bold text-claw-red-bright">
                      You're on the list! 🦞
                    </p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
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
                      className="flex-1 h-11 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm px-4 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-claw-red/25 focus:border-claw-red/30 transition-all"
                    />
                    <Button
                      type="submit"
                      className="h-11 px-5 bg-claw-red hover:bg-claw-red-bright text-white font-bold transition-all active:translate-y-px shrink-0 shadow-sm hover:shadow-md hover:shadow-claw-red/20"
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
// 7 · Easter Egg — "Not Claude"
// ──────────────────────────────────────────────

function NotClaude() {
  const [revealed, setRevealed] = useState(false);
  const [visibleRows, setVisibleRows] = useState(0);

  const tableRows: [string, string, string][] = [
    ["Has a claw", "❌", "🦞"],
    ["Eats fish on startup", "❌", "✅"],
    ["Deploys in 30 sec", "❌", "✅"],
    ["Smart glasses", "❌", "✅"],
    ["Live desktop stream", "❌", "✅"],
    ["Named after crustacean", "❌", "Basically"],
    ["Will take over world", "Politely declines", "Too busy browsing HN"],
  ];

  useEffect(() => {
    if (!revealed) return;
    let i = 0;
    const step = () => {
      i++;
      setVisibleRows(i);
      if (i < tableRows.length) {
        setTimeout(step, 90);
      }
    };
    const initial = setTimeout(step, 600);
    return () => clearTimeout(initial);
  }, [revealed, tableRows.length]);

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="group inline-flex items-center gap-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/30 px-3 py-1.5 text-muted-foreground hover:text-claw-red transition-colors text-[12px] cursor-pointer hover:animate-shake hover:border-claw-red/20"
          >
            <AlertTriangle className="h-3 w-3 transition-transform duration-300 group-hover:rotate-12" />
            <span className="underline underline-offset-2 decoration-dotted group-hover:decoration-claw-red/50 transition-all">
              Important legal disclaimer
            </span>
          </button>
        ) : (
          <div className="animate-fade-in-scale space-y-5">
            <div className="flex items-center gap-4 justify-center">
              <div className="h-px w-16 bg-border animate-scratch-in" />
              <span
                className="text-xl animate-float"
                style={{ animationDuration: "3s" }}
              >
                🦞
              </span>
              <div className="h-px w-16 bg-border animate-scratch-in" />
            </div>

            <h3 className="text-lg font-black text-foreground">
              Not to be confused with Claude.
            </h3>

            <div className="space-y-3 text-[14px] text-muted-foreground leading-relaxed max-w-lg mx-auto">
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
            <div className="mt-8 overflow-hidden rounded-xl border border-border/50 text-[12px] max-w-sm mx-auto shadow-sm">
              <div className="grid grid-cols-3 bg-card/60 backdrop-blur-sm border-b border-border/50 animate-fade-in">
                <div className="px-4 py-3 text-left" />
                <div className="px-4 py-3 text-center font-bold text-muted-foreground border-x border-border">
                  Claude
                </div>
                <div className="px-4 py-3 text-center font-bold text-claw-red">
                  Clawed
                </div>
              </div>
              {tableRows.map(([label, claude, claw], i) => (
                <div
                  key={i}
                  className={`grid grid-cols-3 transition-all duration-400 ${
                    i < visibleRows
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-3"
                  } ${i % 2 === 0 ? "bg-background/60" : "bg-card/40"} hover:bg-muted/40 backdrop-blur-sm`}
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <div className="px-4 py-2.5 text-left text-muted-foreground">
                    {label}
                  </div>
                  <div className="px-4 py-2.5 text-center text-muted-foreground border-x border-border">
                    {claude}
                  </div>
                  <div className="px-4 py-2.5 text-center text-foreground">
                    {claw}
                  </div>
                </div>
              ))}
            </div>

            <p
              className={`text-[11px] text-muted-foreground pt-2 transition-all duration-500 ${visibleRows >= tableRows.length ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
            >
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
    <div className="animate-page-enter bg-grid-full">
      <ScrollProgress />
      <Hero />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <ProblemSolution />
      <DeploymentOptions />
      <SectionDivider />
      <GlassesSection />
      <Testimonials />
      <BetaCTA />
      <NotClaude />
    </div>
  );
}
