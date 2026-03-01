import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Code2,
  FileText,
  MessageSquare,
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
} from "lucide-react";

const quickLinks = [
  {
    title: "Getting Started",
    description:
      "Deploy your OpenClaw agent in 30 seconds — cloud VM or Mac companion app. Connect glasses, start talking.",
    icon: Zap,
    href: "/docs",
    badge: "Start here",
  },
  {
    title: "Smart Glasses Setup",
    description:
      "Pair your smart glasses, configure voice commands, and talk to your agent hands-free.",
    icon: Glasses,
    href: "/docs",
  },
  {
    title: "Live Desktop Stream",
    description:
      "Watch your agent work in real-time. Take over with full remote desktop control from your browser.",
    icon: ShieldCheck,
    href: "/docs",
  },
  {
    title: "Channels & Integrations",
    description:
      "Your agent connects to WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams, and 15+ more channels.",
    icon: Plug,
    href: "/docs",
  },
];

const guides = [
  {
    title: "Deploying Your Agent",
    description:
      "Cloud VM deploy vs Mac companion app — how Clawed Chat sets up and manages your OpenClaw instance.",
    icon: MessageSquare,
    category: "Clawed Chat",
  },
  {
    title: "Smart Glasses Guide",
    description:
      "Voice commands, audio responses, and how the glasses connect to your running agent.",
    icon: Glasses,
    category: "Clawed Chat",
  },
  {
    title: "Dashboard & Desktop Stream",
    description:
      "Agent status, connected channels, active skills, and the live desktop stream with remote control.",
    icon: ShieldCheck,
    category: "Clawed Chat",
  },
  {
    title: "OpenClaw Gateway",
    description:
      "How the underlying WebSocket gateway connects channels, tools, and companion apps.",
    icon: FileText,
    category: "OpenClaw Engine",
  },
  {
    title: "Browser Control & Skills",
    description:
      "Your agent's dedicated Chrome instance, ClawHub skills registry, and workspace customization.",
    icon: MessageSquare,
    category: "OpenClaw Engine",
  },
  {
    title: "Security & Sandboxing",
    description:
      "DM pairing, allowlists, Docker sandboxing, tool permissions, and prompt injection resistance.",
    icon: ShieldCheck,
    category: "OpenClaw Engine",
  },
];

const apiSections = [
  {
    title: "Clawed Chat API",
    description:
      "Manage deployments, agent status, glasses pairing, and desktop stream sessions via the Clawed Chat API.",
    icon: KeyRound,
  },
  {
    title: "OpenClaw Configuration",
    description:
      "All config keys, model providers, channel settings, and agent workspace options for openclaw.json.",
    icon: Terminal,
  },
  {
    title: "Webhooks & Automation",
    description:
      "External triggers, Gmail Pub/Sub, scheduled cron jobs, and wakeup events for your agent.",
    icon: Webhook,
  },
  {
    title: "OpenClaw CLI",
    description:
      "openclaw gateway, agent, send, onboard, doctor, channels, nodes, pairing, and update commands.",
    icon: Code2,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen animate-page-enter">
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Documentation
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Everything you need to deploy your agent, set up smart glasses,
              and get the most out of Clawed Chat &amp; OpenClaw.
            </p>

            {/* Search bar placeholder */}
            <div className="mt-8 mx-auto max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search documentation…"
                  className="w-full border bg-background px-10 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-claw-red/25 focus:border-claw-red/30 transition-all"
                  disabled
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Search coming soon. For now, browse the sections below.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-black tracking-tight">Quick Links</h2>
        <p className="mt-2 text-muted-foreground">
          Jump to the most common topics.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.title} to={link.href}>
              <Card className="group h-full transition-all duration-200 hover:border-foreground/60">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-claw-red/8 border border-claw-red/10 text-claw-red group-hover:bg-claw-red/15 group-hover:border-claw-red/25 transition-all duration-200">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{link.title}</h3>
                      {link.badge && (
                        <Badge variant="secondary" className="text-[10px]">
                          {link.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {link.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Separator />
      </div>

      {/* Guides */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-black tracking-tight">Guides</h2>
        <p className="mt-2 text-muted-foreground">
          Step-by-step walkthroughs for every feature.
        </p>

        <div className="mt-8 space-y-8">
          {["Core Concepts", "Glasses"].map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {category}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {guides
                  .filter((g) => g.category === category)
                  .map((guide) => (
                    <Card
                      key={guide.title}
                      className="group cursor-pointer transition-all duration-200 hover:border-foreground/60"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <guide.icon className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-sm font-medium">
                            {guide.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {guide.description}
                        </p>
                        <p className="mt-3 text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Read guide <ArrowRight className="h-3 w-3" />
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Separator />
      </div>

      {/* API Reference */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              API Reference
            </h2>
            <p className="mt-2 text-muted-foreground">
              Build on top of Clawed with our REST API and SDKs.
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:flex gap-1.5">
            <Code2 className="h-3 w-3" />
            v1.0 Beta
          </Badge>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {apiSections.map((section) => (
            <Card
              key={section.title}
              className="group cursor-pointer transition-all duration-200 hover:border-foreground/60"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-muted border border-border text-muted-foreground group-hover:text-foreground group-hover:border-foreground/30 transition-all duration-200">
                  <section.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Code sample placeholder */}
        <div className="mt-8 border bg-neutral-950 p-6 text-sm">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-4 w-4 text-neutral-400" />
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Quick example
            </span>
          </div>
          <pre className="text-neutral-300 font-mono text-xs leading-relaxed overflow-x-auto">
            <code>{`// Install the SDK
// bun add @clawed/sdk

import { Clawed } from "@clawed/sdk";

const client = new Clawed({
  apiKey: process.env.CLAWED_API_KEY,
});

// Ask the assistant
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

console.log(\`\${approvals.length} actions waiting for review\`);`}</code>
          </pre>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Separator />
      </div>

      {/* Help CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border bg-muted/30 p-8 text-center sm:p-12">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold">Need help?</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Can't find what you're looking for? Reach out and we'll help you get
            set up.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Community Discord
            </Button>
            <Button className="gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Contact Support
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
