# clawed.chat — Technical Spike & Research

> Research findings, technology evaluations, and architectural decisions for the clawed.chat hackathon project.

---

## Table of Contents
1. [What is OpenClaw?](#what-is-openclaw)
2. [How OpenClaw Works](#how-openclaw-works)
3. [Current Deployment Landscape](#current-deployment-landscape)
4. [Our Tech Stack Decisions](#our-tech-stack-decisions)
5. [Pulumi & Automation API](#pulumi--automation-api)
6. [Browser Use Cloud](#browser-use-cloud)
7. [ElectroBun](#electrobun)
8. [OpenClaw Browser & Canvas Capabilities](#openclaw-browser--canvas-capabilities)
9. [Auto Sleep / Wake Architecture](#auto-sleep--wake-architecture)
10. [Hackathon Sponsor Stack](#hackathon-sponsor-stack)
11. [Competitive Landscape](#competitive-landscape)
12. [Key Risks & Mitigations](#key-risks--mitigations)

---

## What is OpenClaw?

OpenClaw (formerly Clawdbot, then Moltbot) is a free, open-source autonomous AI agent created by Peter Steinberger (PSPDFKit founder). It runs on your own devices and connects through messaging apps you already use.

**Key stats:**
- 191k+ GitHub stars, 32k+ forks, 900+ contributors
- One of the fastest-growing open-source projects in GitHub history
- MIT licensed
- Originally launched November 2025 as "Clawd" (pun on Claude)
- Renamed after Anthropic trademark complaints → Moltbot → OpenClaw (Jan 30, 2026)
- Steinberger announced joining OpenAI on Feb 14, 2026; project moving to open-source foundation

**What makes it different from ChatGPT/Claude:**
- Runs locally on YOUR machine — you own your data
- Actually executes actions: shell commands, browser automation, file management, email
- Proactive via heartbeat system (wakes up periodically to check on things)
- Connects through WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams, etc.
- Self-improving: can write its own skills and modify its own prompts
- 100+ pre-configured skills, 50+ integrations

**Core architecture:**
```
Messaging Channels (WhatsApp/Telegram/Slack/etc.)
        │
        ▼
   Gateway (Node.js, control plane, ws://127.0.0.1:18789)
        │
        ├── Agent (RPC, LLM interaction)
        ├── Browser (CDP-controlled Chromium)
        ├── Canvas (A2UI visual workspace)
        ├── Nodes (iOS/Android/macOS companions)
        ├── Cron (scheduled tasks, heartbeat)
        └── Skills (extensible plugin system)
```

**Runtime:** Node.js ≥22. Install: `npm install -g openclaw@latest`

**Recommended model:** Anthropic Claude Opus 4.6 (best prompt injection resistance + long context)

---

## How OpenClaw Works

### The Gateway
The Gateway is OpenClaw's core — a long-running Node.js service that acts as a control plane. It manages:
- WebSocket connections to all clients
- Session management (per-channel, per-user)
- Message routing between channels and the agent
- Tool orchestration (browser, canvas, nodes, cron)
- Heartbeat scheduler (configurable interval, default 30 min)

### Browser Control
OpenClaw runs a dedicated, isolated Chromium browser via Chrome DevTools Protocol (CDP). The agent can:
- Open/close/navigate tabs
- Click, type, drag, select elements
- Take snapshots (accessibility tree + screenshots)
- Fill forms, upload files
- Generate PDFs and screenshots

The browser is NOT the user's daily browser — it's a separate, agent-only profile. Multiple profiles supported (openclaw, work, remote). Supports local Chromium, remote CDP, Browserless, and remote node hosts.

**Critical for our project:** OpenClaw natively supports `browser.profiles.<name>.cdpUrl` for remote browsers. This means we can point it at Browser Use Cloud's CDP endpoint with zero code changes.

### Canvas (A2UI)
Canvas is an agent-driven visual workspace. The agent pushes HTML/CSS/JS or structured A2UI components to a panel that renders on macOS app, iOS/Android, or web browser. It's interactive — buttons/inputs flow back as tool calls to the agent. NOT a remote desktop — it's a purpose-built UI surface.

### Skills
Skills are plugins in YAML/Markdown that extend agent capabilities. Over 100 bundled, plus ClawHub registry for community skills. The agent can discover and install skills at runtime.

### Voice
Voice Wake + Talk Mode available on macOS/iOS/Android with ElevenLabs integration. "Hey OpenClaw" wake word.

---

## Current Deployment Landscape

### How people deploy OpenClaw today

**Local machine (Mac Mini trend):**
- Community went viral buying Mac Minis specifically for OpenClaw
- Creator asked people to stop: "Please don't buy a Mac Mini — sponsor a developer instead. You can run this on AWS free tier."
- Best for: iMessage support, macOS-specific features, Apple ecosystem

**VPS providers with one-click deploys:**
- Hostinger: Docker template, pre-configured, ~$15/month, sells bundled AI credits
- OVHcloud: Docker template + Traefik HTTPS, has dedicated OpenClaw landing page
- DigitalOcean: 1-Click App in marketplace, has full tutorial
- Railway / Northflank: One-click deploys listed in official OpenClaw docs

**Free tier:**
- Oracle Cloud Always Free: 4 ARM CPUs, 24GB RAM, 200GB storage — most popular free option
- AWS free tier: e2-micro, more limited

**Existing "deploy for you" projects:**
- ClawHost (github.com/bfzli/clawhost): Open source, one-click deploy to Hetzner/DigitalOcean/Vultr. Only 4 GitHub stars — hasn't gained traction.
- Cognio Labs: Managed setup service for $499

### Gaps we fill
- No existing solution combines: one-click cloud deploy + desktop companion app + smart glasses interface + auto sleep/wake for cost savings + Browser Use stealth browsing
- Hostinger is closest competitor but lacks: auto sleep, smart glasses, desktop app, Browser Use integration
- ClawHost exists but has no traction, no smart glasses, no sleep/wake

---

## Our Tech Stack Decisions

### Why Pulumi over Terraform
| | Terraform | Pulumi |
|---|----------|--------|
| Language | HCL (new DSL to learn) | TypeScript (our existing language) |
| Per-user provisioning | Awkward (shell out to CLI, template HCL) | Native (Automation API is built for this) |
| State management | Manual per-user state files | Automatic per-stack isolation |
| Type safety | None | Full TypeScript types |
| IDE support | Limited | Full VS Code autocomplete/errors |
| Dynamic infra | Hacky | Natural (loops, conditionals, functions) |

**Decision: Pulumi.** Same language as entire stack. Automation API is purpose-built for our use case (SaaS provisioning per-user infrastructure).

### Why Convex over Postgres/Supabase
- Hackathon sponsor (checkbox for judges)
- Real-time by default — dashboard shows live instance status without polling
- Free tier sufficient for hackathon + early users
- Simple schema, no migrations for prototyping

### Why ElectroBun over Tauri/Electron
- **Bun-native** — same runtime as our backend, no context switching
- **Tiny** — ~14MB bundle vs Electron's 150MB+
- **Fast** — <50ms startup, native webview (not bundled Chromium)
- **v1 just launched** (Feb 6, 2026) — production-ready, active development
- **Auto-updates** — custom bsdiff-based updater, patches as small as 14KB
- **Native bindings** — C++, ObjC, Zig; can access macOS Screen Capture API

### Why Browser Use Cloud over local Chromium
- Hackathon host's product — most important sponsor integration
- Stealth browsing: undetectable fingerprints, CAPTCHA solving, 195+ country proxies
- Smaller VMs: no Chromium memory overhead, cheaper instances, faster boot
- `live_url`: built-in live view of browser session — replaces need for noVNC/VNC
- OpenClaw already supports remote CDP natively — zero code changes needed

### Why Clerk over Firebase Auth
- Better DX for React
- Works across web + desktop app
- Polished UI out of the box
- Not locked into Google ecosystem (important if we go multi-cloud later)

---

## Pulumi & Automation API

### What is Pulumi?
Infrastructure as Code in real programming languages. Define cloud resources in TypeScript, Python, Go, etc. Same concept as Terraform but with actual programming constructs instead of a DSL.

### Key concepts
- **Program:** TypeScript code that declares infrastructure resources
- **Stack:** An isolated instance of a program (one per user in our case)
- **State:** Pulumi tracks what resources exist and computes diffs
- **Provider:** Plugin for each cloud (GCP, Cloudflare, etc.)

### Automation API (the key for our product)
Normal Pulumi: human runs `pulumi up` in terminal.
Automation API: your application calls `stack.up()` programmatically.

```typescript
// Conceptual flow in our Hono backend
import * as automation from "@pulumi/pulumi/automation";
import * as gcp from "@pulumi/gcp";
import * as cloudflare from "@pulumi/cloudflare";

async function deployInstance(userId: string, config: DeployConfig) {
  const program = async () => {
    // Create GCP VM from pre-baked image
    const instance = new gcp.compute.Instance(`openclaw-${userId}`, {
      machineType: "e2-small",
      zone: "us-west1-a",
      bootDisk: {
        initializeParams: { image: "clawed-chat-openclaw-v1" } // pre-baked
      },
      metadata: {
        "startup-script": generateStartupScript(config)
      }
    });

    // Create DNS record
    const dns = new cloudflare.Record(`dns-${userId}`, {
      zoneId: CLOUDFLARE_ZONE_ID,
      name: userId, // → userId.clawed.chat
      type: "A",
      value: instance.networkInterfaces[0].accessConfigs[0].natIp,
    });

    return {
      ip: instance.networkInterfaces[0].accessConfigs[0].natIp,
      vmName: instance.name,
    };
  };

  // Each user = isolated stack
  const stack = await automation.LocalWorkspace.createOrSelectStack({
    stackName: `user-${userId}`,
    projectName: "clawed-chat",
    program,
  });

  const result = await stack.up({ onOutput: console.log });
  return result.outputs;
}
```

**Who uses Automation API this way:** CockroachDB (per-customer databases), SANS Institute (per-instructor lab environments), various SaaS platforms for multi-tenant provisioning.

### Stop/Start for sleep/wake
Pulumi can manage instance state, but for stop/start specifically, direct GCP API calls are simpler:

```typescript
// Sleep: stop the instance (compute cost → $0)
await compute.instances.stop({ project, zone, instance: vmName });

// Wake: start the instance (~30-45 sec resume)
await compute.instances.start({ project, zone, instance: vmName });
```

### Destroy
```typescript
await stack.destroy({ onOutput: console.log });
// Removes VM, DNS record, firewall rules — everything in the stack
```

---

## Browser Use Cloud

### What it is
Browser Use is the hackathon host. They provide:
- **Cloud stealth browsers:** undetectable Chromium instances with human-like fingerprints
- **CDP access:** standard Chrome DevTools Protocol WebSocket connection
- **CAPTCHA solving:** built-in, no configuration needed
- **195+ country proxies:** residential proxies included
- **Live view URL:** `browser.live_url` — debug/watch view of the browser session
- **Custom models:** purpose-built LLMs for browser automation

### Integration with OpenClaw
OpenClaw natively supports remote CDP browsers. Configuration in `openclaw.json`:

```json
{
  "browser": {
    "enabled": true,
    "defaultProfile": "browseruse",
    "profiles": {
      "browseruse": {
        "cdpUrl": "wss://api.browser-use.com/browser?apiKey=<KEY>"
      }
    }
  }
}
```

That's it. No code changes to OpenClaw. The agent uses Browser Use Cloud instead of local Chromium.

### Live view for "watch your agent"
When creating a browser session via the SDK:
```typescript
const browser = await client.browsers.create({ proxy_country_code: "us" });
console.log(browser.live_url); // Embed this in our dashboard
```

This `live_url` can be embedded as an iframe in the clawed.chat dashboard, giving users a real-time view of what the agent is doing in the browser.

### Credits
Each hackathon participant gets $100 in Browser Use credits. Sign up at browser-use.com, claim via form.

---

## ElectroBun

### What it is
ElectroBun is a cross-platform desktop app framework (macOS, Windows, Linux) that uses Bun as the backend runtime and native webviews for rendering. Think "Electron but for the Bun era."

**Key specs:**
- ~14MB bundle size (vs Electron 150MB+)
- <50ms startup time
- Native bindings in C++, ObjC, Zig
- System webview (WebKit on macOS, Edge WebView2 on Windows, WebKitGTK on Linux)
- Custom bsdiff-based auto-updater (patches as small as 14KB)
- v1.0 launched Feb 6, 2026

### For clawed.chat desktop app
The ElectroBun app would:
1. Sign in with Clerk (same account as web)
2. Install/configure OpenClaw on the local machine
3. Establish Cloudflare Tunnel to clawed.chat backend
4. Report machine status to clawed.chat dashboard
5. Enable macOS screen sharing for remote viewing
6. Handle auto-updates for both the app and OpenClaw

### Setup
```bash
bun create electrobun my-app
cd my-app
bun dev    # hot-reload during development
bun build  # produces installer
```

The webview renders the same React dashboard UI from the web app, loaded locally. Typed RPC between main process and webview for native operations.

---

## OpenClaw Browser & Canvas Capabilities

### What OpenClaw CAN do (browser)
- Full CDP browser control: navigate, click, type, drag, select, scroll
- Intelligent snapshots: accessibility tree + visual screenshots
- Form automation: text fields, checkboxes, radio buttons, dropdowns, file uploads
- Tab management: open, close, focus, list
- Screenshot and PDF generation
- Multi-profile support
- Remote CDP connection (used for Browser Use Cloud integration)

### What OpenClaw CAN do (canvas)
- Push HTML/CSS/JS content to connected nodes
- Push structured A2UI components (text, buttons, lists, inputs)
- Interactive — user actions flow back as tool calls
- Live reload when content changes
- Works on macOS app, iOS, Android, web browser

### What OpenClaw CANNOT do (relevant to us)
- No built-in live browser streaming to end users (agent sees snapshots, not video)
- No TeamViewer-style remote desktop
- No built-in "watch the agent work" UI for end users
- Canvas is agent-controlled UI, not screen mirroring

### Our solution
Browser Use `live_url` fills the "watch your agent" gap. For Mac Mini users in the future, native macOS screen sharing (VNC) can provide full desktop streaming.

---

## Auto Sleep / Wake Architecture

### The problem
Running a VM 24/7 costs $15-25/month. Most OpenClaw agents are idle 90%+ of the time.

### Our solution
```
User sends message
       │
       ▼
  Hono Backend
       │
       ├── Instance status = "running"?
       │   YES → Forward message to OpenClaw instance
       │
       ├── Instance status = "sleeping"?
       │   YES → Call GCP API to start VM
       │        → Wait for boot (~30-45 sec)
       │        → Forward message
       │        → Return response
       │
       └── Update last_active_at in Convex
```

### Cost comparison
| Scenario | Always-on (competitors) | clawed.chat (sleep/wake) |
|----------|------------------------|-------------------------|
| VM running 24/7 | ~$15-25/month | — |
| VM running 4 hrs/day, sleeping 20 hrs | — | ~$3-5/month + pennies for disk |
| User sends 1st message after sleep | Instant | ~30-45 sec wake time |

### Implementation
- Convex stores `last_active_at` per instance
- Bun backend runs a cron (or Convex scheduled function) checking for idle instances
- Idle threshold: 30 minutes (configurable)
- GCP Compute Engine API: `instances.stop()` / `instances.start()`
- Stopped instances: $0 compute, ~$0.04/month for 10GB disk

---

## Hackathon Sponsor Stack

### Must Integrate
| Sponsor | How We Use It | Credits |
|---------|--------------|---------|
| **Browser Use** | Core browser backend for all OpenClaw instances (remote CDP + live_url) | $100 |
| **Convex** | Primary database (users, instances, API keys) | Free tier |

### Should Integrate
| Sponsor | How We Use It | Credits |
|---------|--------------|---------|
| **Laminar** | Agent observability — trace panel in dashboard | $150 |
| **AgentMail** | Pre-installed email skill on every instance | Free dev plan |
| **Supermemory** | Persistent memory that survives VM sleep/wake cycles | $100 |

### Nice to Have
| Sponsor | How We Use It | Credits |
|---------|--------------|---------|
| **Google DeepMind** | Gemini as LLM option | $20 |
| **OpenAI** | GPT as LLM option | Credits (form) |
| **Minimax** | Minimax as LLM option (popular in OpenClaw community) | $30 |
| **Daytona** | Alternative sandbox compute backend | $100 |
| **HUD** | Agent evaluation metrics in dashboard | $200 |

### Tools for Building
| Sponsor | How We Use It | Credits |
|---------|--------------|---------|
| **Vercel / V0** | Rapid UI component generation for dashboard | $50 |
| **Cubic** | Code review during hackathon | 1 month free |
| **Superset** | IDE during hackathon | Free |
| **MongoDB** | Backup/alternative to Convex if needed | Free cluster |
| **An.dev** | Potentially for MentraOS agent SDK | $50 |

---

## Competitive Landscape

| Product | Price | One-Click | Sleep/Wake | Smart Glasses | Desktop App | Stealth Browser |
|---------|-------|-----------|-----------|---------------|-------------|-----------------|
| Hostinger OpenClaw | $5-15/mo | ✅ | ❌ | ❌ | ❌ | ❌ |
| OVHcloud OpenClaw | ~$5/mo | ✅ | ❌ | ❌ | ❌ | ❌ |
| ClawHost (OSS) | Varies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Oracle Free Tier | $0 | ❌ (manual) | ❌ | ❌ | ❌ | ❌ |
| Cognio Labs | $499 setup | Managed | ❌ | ❌ | ❌ | ❌ |
| **clawed.chat** | **TBD** | **✅** | **✅** | **✅** | **✅** | **✅** |

**Our differentiators:**
1. Only platform with smart glasses integration
2. Only platform with auto sleep/wake (real cost savings)
3. Only platform with Browser Use stealth browsing by default
4. Hybrid cloud + local Mac support via desktop companion app
5. Designed as a real product, not just a VPS template

---

## Key Risks & Mitigations

### Risk: Live demo fails
**Mitigation:** Pre-provision an instance before the demo. Record a backup video. Have the "watch your agent" Browser Use live view pre-loaded. Demo script has natural fallback points.

### Risk: GCP provisioning takes too long
**Mitigation:** Pre-baked GCP image eliminates install time. VM just boots and starts services. Target: 60-90 seconds. Fallback: "here's one I prepared earlier" (pre-provisioned instance).

### Risk: Browser Use Cloud has latency/issues
**Mitigation:** $100 in credits is plenty. Test extensively before demo. Have a local Chromium fallback config ready (just change the profile in openclaw.json).

### Risk: OpenClaw security concerns (prompt injection, etc.)
**Mitigation:** Acknowledge in Q&A if asked. Our value prop includes "we handle security hardening so you don't have to." Post-hackathon: curated skill whitelist, Docker sandboxing, monitoring.

### Risk: Convex free tier limits
**Mitigation:** Free tier supports 1-6 developers and 40 deployment limit. More than enough for hackathon. Upgrade path available.

### Risk: ElectroBun is very new (v1 three weeks ago)
**Mitigation:** For hackathon, desktop app just needs basic functionality (auth, install OpenClaw, establish tunnel). We're not pushing ElectroBun's limits. If major issues, scope it to "download and install" rather than full management.

---

## Open Questions (Resolved)

| Question | Decision | Rationale |
|----------|---------|-----------|
| Auth | Clerk | Polished, cross-platform, Google OAuth |
| Database | Convex | Sponsor, real-time, free tier |
| IaC | Pulumi (TypeScript) | Same language, Automation API for per-user provisioning |
| Browser | Browser Use Cloud (remote CDP) | Hackathon host, stealth, smaller VMs, live_url |
| Desktop framework | ElectroBun | Bun-native, tiny, fast |
| "Watch agent" | Browser Use live_url | Simpler than noVNC, more relevant (shows browser not desktop) |
| Remote desktop | Future feature (noVNC for Mac users) | Not hackathon scope |
| DNS | Cloudflare API wildcard + per-user A records | Learnable, automatable via Pulumi |
| LLM keys | BYOK (bring your own key) | Simplest for hackathon, bundled credits later |
| VM sleep | GCP stop/start API | $0 compute when sleeping, ~30s wake |
| Prize tracks | Most Hardcore Infra + Best Devtool | Strong fits for our project |
| Pre-baked image | Build as first hackathon task | Clear "project work," ~30 min setup |

---

## Useful Links

- OpenClaw GitHub: https://github.com/openclaw/openclaw
- OpenClaw Docs: https://docs.openclaw.ai
- OpenClaw VPS Hosting Guide: https://docs.openclaw.ai/vps
- Browser Use Cloud Docs: https://docs.cloud.browser-use.com
- Browser Use Browser API: https://docs.cloud.browser-use.com/guides/browser-api
- Pulumi GCP Provider: https://www.pulumi.com/registry/packages/gcp/
- Pulumi Automation API: https://www.pulumi.com/automation/
- Pulumi Automation API Examples: https://github.com/pulumi/automation-api-examples
- ElectroBun Docs: https://blackboard.sh/electrobun/docs/
- ElectroBun GitHub: https://github.com/blackboardsh/electrobun
- Convex Docs: https://docs.convex.dev
- Clerk Docs: https://clerk.com/docs
- Cloudflare DNS API: https://developers.cloudflare.com/api/resources/dns/
- ClawHost (competitor): https://github.com/bfzli/clawhost
- Hackathon Details: https://browser-use.com/hackathon
