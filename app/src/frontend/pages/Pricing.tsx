import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import {
  Check,
  X,
  ArrowRight,
  Glasses,
  Plug,
  ShieldCheck,
  Clock,
  Zap,
  HelpCircle,
  Building2,
  User,
  Users,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";
interface PricingTier {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  limits: {
    devices: number | "unlimited";
    connections: number | "unlimited";
    approvalsPerDay: number | "unlimited";
    retentionDays: number | "unlimited";
  };
  cta: string;
  highlighted?: boolean;
}

// ──────────────────────────────────────────────
// Tier Data
// ──────────────────────────────────────────────

const tiers: (PricingTier & {
  icon: React.ReactNode;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyPerMonth: string;
  notIncluded?: string[];
})[] = [
  {
    id: "starter",
    name: "Free",
    price: "$0",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    yearlyPerMonth: "$0",
    description:
      "Install OpenClaw on your own Mac, PC, or Linux box via our companion app. Full agent, your hardware, forever free.",
    icon: <User className="h-5 w-5" />,
    features: [
      "Mac companion app (one-click install)",
      "Full OpenClaw agent on your hardware",
      "Smart glasses integration",
      "Live desktop streaming",
      "All 15+ chat channels",
      "Browser control & Canvas",
      "Run local models (Ollama / LM Studio)",
      "Community support",
    ],
    notIncluded: [
      "Cloud-hosted VM",
      "Always-on 24/7 uptime",
      "Auto-updates & backups",
      "Priority support",
    ],
    limits: {
      devices: 1,
      connections: "unlimited",
      approvalsPerDay: "unlimited",
      retentionDays: "unlimited",
    },
    cta: "Download free",
  },
  {
    id: "pro",
    name: "Cloud Starter",
    price: "$19/mo",
    monthlyPrice: "$19/mo",
    yearlyPrice: "$190/yr",
    yearlyPerMonth: "$15.83/mo",
    description:
      "A persistent cloud VM running your OpenClaw agent 24/7. Deploy in 30 seconds, zero DevOps required.",
    icon: <Zap className="h-5 w-5" />,
    features: [
      "Dedicated cloud VM (always on)",
      "One-click deploy in 30 seconds",
      "Smart glasses integration",
      "Live desktop streaming & remote control",
      "Dashboard with agent status & skills",
      "All 15+ chat channels",
      "Browser control with dedicated Chrome",
      "2 vCPU · 4 GB RAM · 40 GB SSD",
      "Auto-updates & daily backups",
      "Fully encrypted & isolated",
      "Cloud model access (bring your keys)",
      "Email support",
    ],
    limits: {
      devices: "unlimited",
      connections: "unlimited",
      approvalsPerDay: "unlimited",
      retentionDays: 90,
    },
    cta: "Deploy now",
    highlighted: true,
  },
  {
    id: "team",
    name: "Cloud Pro",
    price: "$39/mo",
    monthlyPrice: "$39/mo",
    yearlyPrice: "$390/yr",
    yearlyPerMonth: "$32.50/mo",
    description:
      "More resources, faster models, and priority support. For power users who live in their agent every day.",
    icon: <Building2 className="h-5 w-5" />,
    features: [
      "Dedicated cloud VM (always on)",
      "One-click deploy in 30 seconds",
      "Smart glasses integration",
      "Live desktop streaming & remote control",
      "Dashboard with agent status & skills",
      "All 15+ chat channels",
      "Browser control with dedicated Chrome",
      "4 vCPU · 8 GB RAM · 80 GB SSD",
      "Auto-updates & daily backups",
      "Fully encrypted & isolated",
      "Cloud model access (bring your keys)",
      "Priority support",
      "Advanced cron & webhook automation",
      "Extended 1-year history retention",
    ],
    limits: {
      devices: "unlimited",
      connections: "unlimited",
      approvalsPerDay: "unlimited",
      retentionDays: 365,
    },
    cta: "Deploy now",
    highlighted: false,
  },
];

// ──────────────────────────────────────────────
// FAQ Data
// ──────────────────────────────────────────────

const faqs = [
  {
    q: "What is Clawed Chat?",
    a: "Clawed Chat is the easiest way to deploy and use an OpenClaw AI agent. We handle the infrastructure — one-click cloud deploy or Mac companion app — and add smart glasses integration, live desktop streaming, and a dashboard so you can control your agent from anywhere.",
  },
  {
    q: "What is OpenClaw?",
    a: "OpenClaw is the hottest open-source AI project on GitHub (240k+ stars). It's a personal AI agent that actually does things — browses the web, manages files, sends emails, controls your desktop. Clawed Chat makes it easy to deploy and use without any DevOps knowledge.",
  },
  {
    q: "What's the difference between Free and Cloud plans?",
    a: "The Free plan installs OpenClaw on your own Mac via our companion app — your hardware, your data, always free. Cloud plans spin up a dedicated VM that runs your agent 24/7 with auto-updates, backups, and zero maintenance. Both include smart glasses and live desktop streaming.",
  },
  {
    q: "Do I need smart glasses?",
    a: "No! Smart glasses are optional. You can use Clawed Chat entirely from the web dashboard, the live desktop stream, or via any of OpenClaw's 15+ chat channels (WhatsApp, Telegram, Slack, etc.). Glasses just add the hands-free, voice-first experience on top.",
  },
  {
    q: "What can the agent actually do?",
    a: "Your OpenClaw agent can browse the web, draft and send emails, review code and open PRs, manage files, control your desktop, schedule meetings, monitor prices, and much more. You can watch it work in real-time via the live desktop stream.",
  },
  {
    q: "Is my data safe?",
    a: "On the Free plan, everything runs on your own hardware — data never leaves your machine. On Cloud plans, each agent gets its own fully isolated, encrypted VM. OpenClaw also includes DM pairing, allowlists, and Docker sandboxing by default.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade from Free to Cloud anytime with one click — we'll spin up a VM and migrate your agent config. Downgrade back to self-hosted whenever you want. Your data is always yours.",
  },
  {
    q: "What models does it support?",
    a: "Any LLM — cloud or local. The project recommends Anthropic Opus 4.6 for best results. On the Free plan, you can also run local models via Ollama or LM Studio on NVIDIA RTX GPUs for completely private, free inference.",
  },
];

// ──────────────────────────────────────────────
// Comparison table data
// ──────────────────────────────────────────────

interface ComparisonRow {
  feature: string;
  starter: string | boolean;
  pro: string | boolean;
  team: string | boolean;
  category: string;
}

const comparisonRows: ComparisonRow[] = [
  // Devices & Connections
  {
    feature: "Paired devices",
    starter: "1",
    pro: "3",
    team: "Unlimited",
    category: "Devices & Connections",
  },
  {
    feature: "Connections",
    starter: "2",
    pro: "Unlimited",
    team: "Unlimited",
    category: "Devices & Connections",
  },
  {
    feature: "Glasses UI customization",
    starter: false,
    pro: true,
    team: true,
    category: "Devices & Connections",
  },
  {
    feature: "Quiet hours",
    starter: false,
    pro: true,
    team: true,
    category: "Devices & Connections",
  },
  // Safety & Approvals
  {
    feature: "Read-only mode",
    starter: true,
    pro: true,
    team: true,
    category: "Safety & Approvals",
  },
  {
    feature: "Draft-first mode",
    starter: true,
    pro: true,
    team: true,
    category: "Safety & Approvals",
  },
  {
    feature: "Assisted actions mode",
    starter: false,
    pro: true,
    team: true,
    category: "Safety & Approvals",
  },
  {
    feature: "Approvals per day",
    starter: "10",
    pro: "Unlimited",
    team: "Unlimited",
    category: "Safety & Approvals",
  },
  {
    feature: "Shared approval policies",
    starter: false,
    pro: false,
    team: true,
    category: "Safety & Approvals",
  },
  // Timeline & Data
  {
    feature: "Receipt retention",
    starter: "7 days",
    pro: "90 days",
    team: "1 year",
    category: "Timeline & Data",
  },
  {
    feature: "Timeline export",
    starter: false,
    pro: true,
    team: true,
    category: "Timeline & Data",
  },
  {
    feature: "Compliance audit logs",
    starter: false,
    pro: false,
    team: true,
    category: "Timeline & Data",
  },
  // Team
  {
    feature: "Admin dashboard",
    starter: false,
    pro: false,
    team: true,
    category: "Team & Admin",
  },
  {
    feature: "Role-based permissions",
    starter: false,
    pro: false,
    team: true,
    category: "Team & Admin",
  },
  {
    feature: "SSO / SAML",
    starter: false,
    pro: false,
    team: true,
    category: "Team & Admin",
  },
  // Support
  {
    feature: "Community support",
    starter: true,
    pro: true,
    team: true,
    category: "Support",
  },
  {
    feature: "Priority email support",
    starter: false,
    pro: true,
    team: true,
    category: "Support",
  },
  {
    feature: "Dedicated account manager",
    starter: false,
    pro: false,
    team: true,
    category: "Support",
  },
  {
    feature: "SLA guarantee",
    starter: false,
    pro: false,
    team: true,
    category: "Support",
  },
];

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-emerald-500 mx-auto" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
    );
  }
  return <span className="text-sm text-foreground font-medium">{value}</span>;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-foreground group"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-foreground">{q}</span>
        <HelpCircle
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300",
            open ? "rotate-45 text-claw-red" : "group-hover:text-foreground",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "max-h-96 pb-5 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <p className="text-sm text-muted-foreground leading-relaxed pr-8">
          {a}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Pricing Page
// ──────────────────────────────────────────────

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="flex flex-col animate-page-enter">
      {/* ── Hero ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 text-center">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 px-3 py-1 text-[11px]"
          >
            <Sparkles className="h-3 w-3" />
            Simple, transparent pricing
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Pick the plan that fits
            <br className="hidden sm:block" />
            <span className="text-muted-foreground"> how you work</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            Start free, upgrade when you need more devices, connections, or team
            controls. Every plan includes the core assistant experience with
            safety modes and receipts.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Label
              htmlFor="billing-toggle"
              className={cn(
                "text-sm cursor-pointer transition-colors",
                !annual
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={annual}
              onCheckedChange={setAnnual}
            />
            <Label
              htmlFor="billing-toggle"
              className={cn(
                "text-sm cursor-pointer transition-colors",
                annual
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              Annual
            </Label>
            {annual && (
              <Badge
                variant="secondary"
                className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              >
                Save ~17%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ──────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 -mt-2 pb-20">
        <div className="grid gap-6 md:grid-cols-3 lg:gap-8 items-start">
          {tiers.map((tier) => {
            const displayPrice = annual
              ? tier.yearlyPerMonth
              : tier.monthlyPrice;
            const billingNote = annual
              ? tier.yearlyPrice !== "$0"
                ? `Billed ${tier.yearlyPrice}`
                : "Free forever"
              : tier.monthlyPrice !== "$0"
                ? "Billed monthly"
                : "Free forever";

            return (
              <Card
                key={tier.id}
                className={cn(
                  "relative flex flex-col transition-all duration-200",
                  tier.highlighted
                    ? "border-claw-red shadow-[0_0_0_1px_var(--claw-red),0_8px_30px_oklch(0.55_0.22_25/0.1)] scale-[1.02] z-10"
                    : "hover:border-foreground/40",
                )}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 py-0.5 text-[10px] shadow-sm bg-claw-red text-white border-claw-red-dark">
                      Most popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center",
                        tier.highlighted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tier.icon}
                    </div>
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">
                      {displayPrice === "$0" ? "Free" : displayPrice}
                    </span>
                    {displayPrice !== "$0" && (
                      <span className="text-sm text-muted-foreground">
                        {tier.id === "team" ? "/user" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {billingNote}
                  </p>

                  <CardDescription className="mt-3 text-sm leading-relaxed">
                    {tier.description}
                  </CardDescription>
                </CardHeader>

                <Separator />

                <CardContent className="flex-1 pt-5">
                  {/* Key limits */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <LimitBadge
                      icon={<Glasses className="h-3.5 w-3.5" />}
                      label="Devices"
                      value={
                        tier.limits.devices === "unlimited"
                          ? "∞"
                          : String(tier.limits.devices)
                      }
                    />
                    <LimitBadge
                      icon={<Plug className="h-3.5 w-3.5" />}
                      label="Connections"
                      value={
                        tier.limits.connections === "unlimited"
                          ? "∞"
                          : String(tier.limits.connections)
                      }
                    />
                    <LimitBadge
                      icon={<ShieldCheck className="h-3.5 w-3.5" />}
                      label="Approvals/day"
                      value={
                        tier.limits.approvalsPerDay === "unlimited"
                          ? "∞"
                          : String(tier.limits.approvalsPerDay)
                      }
                    />
                    <LimitBadge
                      icon={<Clock className="h-3.5 w-3.5" />}
                      label="Retention"
                      value={
                        tier.limits.retentionDays === "unlimited"
                          ? "∞"
                          : tier.limits.retentionDays >= 365
                            ? `${Math.round(tier.limits.retentionDays / 365)}yr`
                            : `${tier.limits.retentionDays}d`
                      }
                    />
                  </div>

                  {/* Feature list */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    What's included
                  </p>
                  <ul className="space-y-2.5">
                    {tier.features.map((feature: string) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {tier.notIncluded && tier.notIncluded.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Not included
                      </p>
                      <ul className="space-y-2.5">
                        {tier.notIncluded.map((feature: string) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5 text-sm text-muted-foreground"
                          >
                            <X className="h-4 w-4 shrink-0 mt-0.5 opacity-40" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>

                <CardFooter className="pt-2">
                  <Button
                    className="w-full gap-1.5"
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                    asChild
                  >
                    <Link to="/sign-in">
                      {tier.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Feature Comparison Table ───────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Compare plans in detail
            </h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Every feature, limit, and capability side by side.
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-4 font-medium text-muted-foreground w-[40%]">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center font-medium w-[20%]">
                    <div className="flex flex-col items-center gap-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Starter</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center font-medium w-[20%]">
                    <div className="flex flex-col items-center gap-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-primary">Pro</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center font-medium w-[20%]">
                    <div className="flex flex-col items-center gap-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>Team</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastCategory = "";
                  return comparisonRows.map((row, i) => {
                    const showCategory = row.category !== lastCategory;
                    lastCategory = row.category;
                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b last:border-b-0",
                          showCategory ? "" : "",
                        )}
                      >
                        <td className="px-6 py-3">
                          {showCategory && (
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-2">
                              {row.category}
                            </p>
                          )}
                          <span className="text-foreground">{row.feature}</span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <ComparisonCell value={row.starter} />
                        </td>
                        <td className="px-6 py-3 text-center bg-primary/[0.02]">
                          <ComparisonCell value={row.pro} />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <ComparisonCell value={row.team} />
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Mobile comparison cards */}
          <div className="md:hidden space-y-6">
            {tiers.map((tier) => (
              <Card key={tier.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    {tier.icon}
                    <CardTitle className="text-base">{tier.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparisonRows.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 text-sm border-b last:border-b-0"
                    >
                      <span className="text-muted-foreground">
                        {row.feature}
                      </span>
                      <ComparisonCell
                        value={
                          tier.id === "starter"
                            ? row.starter
                            : tier.id === "pro"
                              ? row.pro
                              : row.team
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────── */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Everything you need to know about Clawed pricing and plans.
            </p>
          </div>

          <div className="divide-y border bg-card px-6">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Ready to join the beta?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Start free with the Starter plan. No credit card required. Upgrade
            anytime as your needs grow.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link to="/sign-in" className="gap-1.5">
                Join beta — free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/docs">See how it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            <Users className="inline h-3 w-3 mr-1" />
            Need a custom plan for your organization?{" "}
            <Link
              to="/docs"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Contact sales
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────
// Limit badge sub-component
// ──────────────────────────────────────────────

function LimitBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 backdrop-blur-sm px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">
          {label}
        </p>
        <p className="text-sm font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}
