import type { LucideIcon } from "lucide-react";
import {
  Glasses,
  Cpu,
  FileCheck,
  ThumbsUp,
  Receipt,
  ArrowDown,
  MessageSquare,
  Monitor,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Flow step data
// ──────────────────────────────────────────────

interface FlowStep {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
  color: string;
  iconBg: string;
}

const flowSteps: FlowStep[] = [
  {
    number: 1,
    icon: MessageSquare,
    title: "You ask",
    description: "From glasses or web",
    detail:
      "Say it, type it, or pick a suggested prompt. Glasses capture your voice in under 3 seconds. The web hub gives you a full command bar with context chips for email, calendar, and more.",
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950",
  },
  {
    number: 2,
    icon: Cpu,
    title: "OpenClaw runs tools",
    description: "Reads, searches, and drafts",
    detail:
      "The assistant connects to your email, chat, calendar, and the web. It reads what's relevant, searches when needed, and assembles a result — all in under 5 seconds.",
    color: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950",
  },
  {
    number: 3,
    icon: FileCheck,
    title: "We show a draft or result",
    description: "Preview before anything happens",
    detail:
      "You see a card with the answer, a draft message, or a proposed action. Nothing leaves your account until you say so. Sources are always shown so you know where info came from.",
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950",
  },
  {
    number: 4,
    icon: ThumbsUp,
    title: "You approve",
    description: "One tap, one word, or edit first",
    detail:
      'On glasses, say "approve" or nod. On the web, click the button. Want to tweak the draft? Edit it inline before approving. Sensitive actions show risk labels so you know what you\'re confirming.',
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
  },
  {
    number: 5,
    icon: Receipt,
    title: "We log a receipt",
    description: "Full audit trail, always",
    detail:
      "Every completed action produces a receipt: what was done, where, when, what data was used, and how to undo it. Your Timeline is a complete, searchable record of everything the assistant has ever done.",
    color: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950",
  },
];

// ──────────────────────────────────────────────
// Principles section
// ──────────────────────────────────────────────

interface Principle {
  icon: LucideIcon;
  title: string;
  description: string;
}

const principles: Principle[] = [
  {
    icon: Glasses,
    title: "Glasses for capture and guidance",
    description:
      "Quick prompts, glanceable cards, voice-first interaction. Two lines max. One action per card.",
  },
  {
    icon: Monitor,
    title: "Web hub for control and depth",
    description:
      "Review history, manage approvals, connect services, configure devices. Full keyboard and screen when you need it.",
  },
  {
    icon: ShieldCheck,
    title: "Safety at every step",
    description:
      "Three modes from read-only to assisted. Sensitive actions always require confirmation. Receipts for everything.",
  },
];

// ──────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Sparkles className="h-3 w-3" />
              Simple by design
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              How Clawed works
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Five steps from question to receipt. No surprises, no hidden
              actions, no regrets.
            </p>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />
      </section>

      {/* ── Flow diagram ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {flowSteps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === flowSteps.length - 1;

              return (
                <div key={step.number} className="relative">
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-6 top-[4.5rem] bottom-0 w-px bg-border sm:left-8" />
                  )}

                  <div className="relative flex gap-5 pb-14 sm:gap-7">
                    {/* Step icon */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm sm:h-16 sm:w-16",
                          step.iconBg,
                        )}
                      >
                        <Icon
                          className={cn("h-5 w-5 sm:h-6 sm:w-6", step.color)}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white",
                            step.color.includes("blue")
                              ? "bg-blue-600"
                              : step.color.includes("violet")
                                ? "bg-violet-600"
                                : step.color.includes("amber")
                                  ? "bg-amber-600"
                                  : step.color.includes("emerald")
                                    ? "bg-emerald-600"
                                    : "bg-rose-600",
                          )}
                        >
                          {step.number}
                        </span>
                        <h3 className="text-lg font-semibold sm:text-xl">
                          {step.title}
                        </h3>
                      </div>

                      <p className={cn("text-sm font-medium mb-2", step.color)}>
                        {step.description}
                      </p>

                      <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                        {step.detail}
                      </p>
                    </div>
                  </div>

                  {/* Arrow between steps */}
                  {!isLast && (
                    <div className="flex justify-center -mt-8 mb-2 sm:hidden">
                      <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Compact flow diagram (horizontal, for desktop) ── */}
      <section className="hidden lg:block py-16 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-10">
            The full loop at a glance
          </h2>
          <div className="flex items-center justify-between gap-2">
            {flowSteps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === flowSteps.length - 1;

              return (
                <div
                  key={step.number}
                  className="flex items-center gap-2 flex-1"
                >
                  <div className="flex flex-col items-center text-center flex-1">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm mb-3",
                        step.iconBg,
                      )}
                    >
                      <Icon className={cn("h-6 w-6", step.color)} />
                    </div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                  {!isLast && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Separator className="hidden lg:block" />

      {/* ── Design principles ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Two surfaces, one philosophy
            </h2>
            <p className="mt-3 text-muted-foreground">
              Glasses are for speed. The web hub is for trust. Safety connects
              them.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {principles.map((p) => {
              const Icon = p.icon;
              return (
                <Card
                  key={p.title}
                  className="group transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Example scenarios ── */}
      <section className="border-t bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              See it in action
            </h2>
            <p className="mt-3 text-muted-foreground">
              Real workflows, from ask to receipt.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "📨",
                title: "Inbox skim",
                ask: '"What needs my attention?"',
                result:
                  "Top 3 messages with one-line summaries. Tap to draft a reply.",
                receipt: "Summarized 12 emails — read only, nothing sent.",
              },
              {
                emoji: "✍️",
                title: "Reply assist",
                ask: '"Reply yes and propose two times tomorrow"',
                result:
                  "Two draft replies to choose from. Preview before sending.",
                receipt:
                  "Sent reply to Alex Chen on Slack. Undo available for 30s.",
              },
              {
                emoji: "📅",
                title: "Calendar check",
                ask: '"What\'s next and how do I get there?"',
                result:
                  "Next meeting in 45 min, Zoom link, prep notes, travel time.",
                receipt: "Read calendar — no changes made.",
              },
              {
                emoji: "📝",
                title: "Capture a note",
                ask: '"Remember this: 3 action items from the review"',
                result: "Note saved, tagged, and synced to your hub.",
                receipt: "Created note with 3 items. Synced to Notion.",
              },
              {
                emoji: "🔍",
                title: "Web lookup",
                ask: '"Compare flights SFO to NYC next Thursday"',
                result:
                  "Top 3 options with prices. Sources shown. No booking without confirm.",
                receipt: "Searched Google Flights — read only.",
              },
              {
                emoji: "🗂️",
                title: "Auto-archive",
                ask: "Assisted mode rule: archive newsletters older than 7 days",
                result: "12 newsletters archived automatically.",
                receipt:
                  "Archived 12 emails from 3 senders. Undo all available.",
              },
            ].map((scenario) => (
              <Card key={scenario.title} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="border-b bg-muted/50 px-5 py-3 flex items-center gap-2.5">
                    <span className="text-lg">{scenario.emoji}</span>
                    <h3 className="text-sm font-semibold">{scenario.title}</h3>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Ask */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        You ask
                      </p>
                      <p className="text-sm font-medium italic text-foreground">
                        {scenario.ask}
                      </p>
                    </div>

                    {/* Result */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        You see
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {scenario.result}
                      </p>
                    </div>

                    {/* Receipt */}
                    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        Receipt
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scenario.receipt}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Zap className="h-7 w-7" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to try it?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start with Draft First mode — the safest default. Upgrade to
              Assisted when you're comfortable.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/sign-in" className="gap-1.5">
                  Join the beta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/security">Learn about safety</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
