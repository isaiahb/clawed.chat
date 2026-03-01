# clawed.chat — Project Spec

> Deploy your own OpenClaw AI agent in 30 seconds. Talk to it from your smart glasses.

**Hackathon:** YC x Browser Use Web Agents Hackathon (Feb 28–Mar 1, 2026)
**Demo:** 3 min live demo + 1 min Q&A
**Domain:** clawed.chat

---

## One-Liner

clawed.chat is the fastest way to deploy, manage, and talk to a personal OpenClaw AI agent — from the cloud or your own hardware, controllable from smart glasses.

---

## What is OpenClaw?

OpenClaw is an open-source personal AI agent (191k+ GitHub stars) that runs on your own infrastructure. Unlike ChatGPT or Claude's web interface, OpenClaw *does things* — it browses the web, manages files, sends emails, fills out forms, controls your desktop, and runs automations proactively via a heartbeat system. It connects through messaging apps (WhatsApp, Telegram, Slack, Discord, Signal, etc.) and supports voice interaction.

**The problem:** Setting up OpenClaw requires serious technical knowledge — CLI, SSH, Docker, API keys, firewall config, DNS. The creator's own maintainer warned: "if you can't understand how to run a command line, this is far too dangerous for you to use."

**Our solution:** One-click deployment. Beautiful dashboard. Smart glasses interface. No terminal required.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      clawed.chat                          │
│                                                          │
│  Clients:                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ Landing    │  │ Desktop    │  │ Mentra Smart       │ │
│  │ Page       │  │ (Electro-  │  │ Glasses            │ │
│  │ (web/)     │  │  Bun)      │  │                    │ │
│  └────────────┘  └─────┬──────┘  └────────┬───────────┘ │
│                        │                   │             │
│                        ▼                   ▼             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  app/ — MentraOS Mini App (Bun + Hono)            │  │
│  │  ┌─────────────┐  ┌──────────────────────────┐    │  │
│  │  │ frontend/   │  │ backend/                  │    │  │
│  │  │ (dashboard  │  │ ├── api/ (route files)    │    │  │
│  │  │  webview)   │  │ ├── session/ (glasses)    │    │  │
│  │  │             │  │ └── services/ (infra/biz) │    │  │
│  │  └─────────────┘  └────────────┬─────────────┘    │  │
│  └─────────────────────────────────┼─────────────────┘  │
│                                    │                     │
│              ┌─────────────────────┼──────────┐          │
│              │                     │          │          │
│     Pulumi Automation API    Convex DB   Browser Use    │
│              │                               Cloud      │
│    ┌─────────┴─────────┐                                │
│    │                   │                                │
│  GCP Compute      Cloudflare                            │
│  Engine (VMs)     DNS (subdomains)                      │
│    │                                                    │
│    └── Per-user VM                                      │
│        ├── OpenClaw Gateway                             │
│        ├── Browser Use Cloud (remote CDP)               │
│        └── Node.js runtime                              │
└──────────────────────────────────────────────────────────┘
```

**Key insight:** The MentraOS mini app and the clawed.chat backend are the same Hono/Bun server. The glasses are just another client hitting the same API. Session-dependent logic (live glasses connection, voice streaming) lives in `session/`. Stateless infrastructure and business logic lives in `services/`.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **App (Backend + Glasses)** | Bun + Hono (TypeScript) — MentraOS Mini App | Single server serves dashboard, API, and glasses routes |
| **App (Frontend)** | React (dashboard webview) | Embedded in mini app, also loadable from desktop app |
| **Landing Page** | Separate site in `web/` (Cloudflare Pages) | Marketing/SEO, designer builds independently |
| **Auth** | Clerk | Polished, easy Google OAuth, works across web + desktop |
| **Database** | Convex | Real-time by default (live dashboard updates), hackathon sponsor |
| **Infra Provisioning** | Pulumi (TypeScript) everywhere | Automation API for per-user VMs, also CI/CD for our own backend |
| **Cloud Provider** | GCP Compute Engine | Pre-baked VM images, scalable |
| **DNS** | Cloudflare API (wildcard on *.clawed.chat) | Auto-assign subdomains per user |
| **Desktop App** | ElectroBun | Bun-native, 14MB bundle, native feel, auto-updates |
| **Smart Glasses** | Mentra Live glasses via MentraOS | Voice in/out — same Hono backend, glasses-specific routes |
| **Browser Automation** | Browser Use Cloud | Stealth browsers, CAPTCHA solving, hackathon host sponsor |
| **Observability** | Laminar | AI agent tracing, hackathon sponsor |
| **CI/CD** | GitHub Actions + Pulumi | Push to main → Pulumi deploys backend to GCP |

---

## Core Features (Hackathon Scope)

### 1. One-Click Cloud Deploy
- User signs in via Clerk (Google OAuth)
- Clicks "Deploy new agent"
- Backend triggers Pulumi Automation API
- Pulumi creates: GCP VM (from pre-baked image), Cloudflare DNS A record (username.clawed.chat)
- VM boots with OpenClaw pre-installed, pre-configured with Browser Use Cloud as browser backend
- User gets a live dashboard within ~60-90 seconds

### 2. Agent Dashboard
- Real-time instance status (provisioning → running → sleeping)
- "Watch your agent" — embedded Browser Use live_url showing what the agent is browsing
- Chat interface (proxied WebChat to OpenClaw instance)
- Start / Stop / Destroy instance controls
- Connected channels overview

### 3. Smart Glasses Interface (MentraOS)
- Voice input → transcribed to text → sent to Hono backend → proxied to OpenClaw instance
- OpenClaw response → sent back to MentraOS → spoken aloud
- Purely voice in / voice out — no visual desktop stream on glasses
- Same Hono server as the dashboard — glasses are just another client
- Session-dependent logic (voice streaming) lives in `session/` folder

### 4. Desktop Companion App (ElectroBun)
- Download and install on Mac Mini / Mac laptop
- Signs in with Clerk (same clawed.chat account)
- Automatically installs and configures OpenClaw on the local machine
- Establishes Cloudflare Tunnel back to clawed.chat
- Machine appears in clawed.chat dashboard alongside any cloud instances
- Full macOS capabilities (iMessage, native voice, Apple ecosystem)
- **Hackathon priority:** This is the fallback demo path if cloud provisioning has issues, and a standalone deliverable for Mac users who don't want cloud hosting

### 5. Browser Use Integration
- Every clawed.chat instance uses Browser Use Cloud as its browser backend (not local Chromium)
- OpenClaw configured with `browser.profiles.browseruse.cdpUrl` pointing to Browser Use Cloud
- Benefits: stealth browsing, CAPTCHA solving, 195+ country proxies, smaller/cheaper VMs
- Browser Use `live_url` embedded in dashboard for "watch your agent work" experience

---

## Sponsor Integrations

| Sponsor | Integration | Priority |
|---------|------------|----------|
| **Browser Use** | Core browser backend for all instances (remote CDP) | **MUST** — hackathon host |
| **Convex** | Primary database for users, instances, state | **MUST** — sponsor + real-time |
| **Laminar** | Agent observability/tracing in dashboard | SHOULD |
| **AgentMail** | Pre-installed email skill on every instance | SHOULD |
| **Supermemory** | Persistent memory that survives VM sleep/wake | SHOULD |
| **Google DeepMind** | Gemini as LLM option during setup | NICE |
| **OpenAI** | GPT as LLM option during setup | NICE |
| **Minimax** | Minimax as LLM option during setup | NICE |
| **Vercel / V0** | Use V0 to rapidly generate dashboard UI components | TOOL (not integration) |
| **Daytona** | Mention as alternative compute backend | MENTION in pitch |

---

## Data Model (Convex)

### users
```
id, clerk_id, email, name, created_at
```

### instances
```
id, user_id, type (cloud | local), gcp_vm_name?, gcp_zone?,
ip?, subdomain, status (provisioning | running | stopped | destroyed),
browser_use_session_id?, llm_provider, created_at
```

### api_keys
```
id, user_id, provider (anthropic | openai | google | minimax),
encrypted_key, created_at
```

---

## User Flow (Hackathon Demo Path)

1. Land on clawed.chat → "Get Started" → Clerk sign-in (Google OAuth)
2. Dashboard shows empty state → "Deploy your first agent"
3. Choose: "Cloud Deploy" or "Connect your Mac"
4. Cloud Deploy selected → Choose LLM provider → Paste API key (BYOK)
5. Click "Deploy" → progress indicator → Pulumi provisions VM + DNS
6. ~60-90 seconds later → dashboard shows instance as "Running"
7. "Watch your agent" → Browser Use live view embedded
8. Chat with agent from dashboard → agent responds, browses web, etc.
9. Talk to agent from Mentra glasses → same agent, voice interface

---

## Monorepo Structure

```
clawed-chat/
├── app/                              ← MentraOS mini app (THE product)
│   └── src/
│       ├── index.ts                  ← entry point
│       ├── backend/
│       │   ├── ClawedChat.ts         ← AppServer subclass
│       │   ├── api/
│       │   │   ├── index.ts          ← mount table (routes only)
│       │   │   ├── instances.api.ts  ← deploy, stop, destroy
│       │   │   ├── chat.api.ts       ← proxy messages to OpenClaw
│       │   │   └── glasses.api.ts    ← MentraOS voice routes
│       │   ├── session/
│       │   │   ├── UserSession.ts    ← per-user glasses state + static store
│       │   │   └── voice.manager.ts  ← live audio streaming (glasses)
│       │   └── services/
│       │       ├── instance.service.ts    ← Pulumi provisioning, GCP lifecycle
│       │       ├── instance.pulumi.ts     ← inline Pulumi program (VM + DNS)
│       │       ├── dns.service.ts         ← Cloudflare subdomain management
│       │       ├── browseruse.service.ts  ← Browser Use session lifecycle
│       │       └── openclaw.service.ts    ← proxy chat to OpenClaw WebSocket
│       └── frontend/                 ← dashboard webview (post-login UI)
├── web/                              ← clawed.chat landing page (Cloudflare Pages)
├── desktop/                          ← ElectroBun companion app
├── deploy/                           ← Pulumi config for OUR infra (CI/CD)
│   ├── index.ts                      ← Pulumi program (deploy our backend to GCP)
│   └── Pulumi.yaml
├── .github/
│   └── workflows/
│       └── deploy.yml                ← push to main → pulumi up
├── scripts/
│   └── bake-image/                   ← GCP image baking script
├── package.json                      ← Bun workspace root
├── bunfig.toml
├── SPEC.md
└── SPIKE.md
```

**Folder conventions (Isaiah's Style Guide):**
- `api/` files: `<feature>.api.ts` — routes at top, handlers at bottom
- `session/` files: `UserSession.ts` + `<feature>.manager.ts` — live glasses connection dependent
- `services/` files: `<feature>.service.ts` — stateless infra/business logic, no live session needed
- `api/index.ts` is just a mount table, nothing else
- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`

---

## API Contracts (Backend ↔ Frontend)

### POST /api/instances/create
```json
Request: { "llm_provider": "anthropic", "api_key": "sk-..." }
Response: { "instance_id": "...", "subdomain": "alice.clawed.chat", "status": "provisioning" }
```

### GET /api/instances/:id
```json
Response: {
  "id": "...", "status": "running", "subdomain": "alice.clawed.chat",
  "ip": "34.x.x.x", "browser_use_live_url": "https://...",
  "last_active_at": "...", "created_at": "..."
}
```

### POST /api/instances/:id/stop
```json
Response: { "status": "stopped" }
```

### DELETE /api/instances/:id
```json
Response: { "status": "destroyed" }
```

### POST /api/chat/:instance_id
```json
Request: { "message": "Check my emails" }
Response: { "response": "You have 3 new emails..." }
```

---

## Prize Track Strategy

| Track | Apply? | Rationale |
|-------|--------|-----------|
| Top 3 Overall | Auto-entered | Strong impact potential (40% weight) — real product, real users |
| Founders Prize | Auto-entered | Unique product vision, cross-sell hardware angle |
| Most Viral | Auto-entered | Smart glasses demo is inherently shareable |
| **Most Hardcore Infra** | **YES — apply** | Pulumi Automation API, per-user GCP provisioning, auto sleep/wake, Browser Use Cloud integration, Cloudflare DNS automation, ElectroBun desktop app |
| **Best Devtool** | **YES — apply** | Developer tool for deploying/managing OpenClaw instances |
| Best Design | Maybe | Depends on dashboard polish |
| Best Use of Real-Time Data | No | Not a strong fit |

---

## Demo Script (3 minutes)

**Intro (15 sec):**
"Hey everyone, we are Clawed Chat. *(Anthropic, please don't sue.)* We built a way to deploy your own OpenClaw AI agent in under 30 seconds and talk to it from smart glasses."

**Context (30 sec):**
Brief on OpenClaw (190k stars, AI agent that actually does things), the problem (setup takes hours, requires DevOps knowledge), our solution.

**Live Demo (2 min):**
1. Go to clawed.chat, create account (Clerk, one click)
2. Click deploy → show provisioning (or switch to pre-provisioned instance)
3. Dashboard — show live agent status, "watch your agent" via Browser Use live view
4. Chat with agent from dashboard — ask it to do something visible (browse HN, check email)
5. Put on Mentra glasses → voice command to same agent → agent responds via voice
6. **Money shot:** audience sees Browser Use live view on projector showing agent working while presenter talks hands-free through glasses

**Wrap (15 sec):**
"Deploy your AI agent in 30 seconds, watch it work from anywhere, talk to it from your glasses. clawed.chat."

**Backup:** Pre-recorded video of the full flow in case of live demo issues.

---

## Future (Post-Hackathon — discussed but out of scope)

### Auto Sleep / Wake
- Monitor `last_active_at` per instance, stop VMs after idle threshold (30 min)
- GCP stop/start API — $0 compute when sleeping, ~30-45s wake on next message
- Backend transparently wakes VM when user sends a message from any client (web, glasses, desktop)
- Huge cost savings vs always-on competitors (est. $3-5/mo vs $15-25/mo)

### Billing & Monetization
- Stripe integration for subscription billing
- Tiered plans: Free (e2-micro), Pro ($15/mo, e2-small), Team
- Bundled LLM credits (proxy API calls, margin on usage) — no more BYOK required
- Browser Use usage passthrough billing (metered, margin on API calls)
- Mentra glasses cross-sell funnel from clawed.chat dashboard

### Multi-Cloud Support
- Hetzner for cheaper EU instances, DigitalOcean, Vultr
- Pulumi makes multi-cloud provisioning straightforward — same code, different providers

### Full Remote Desktop (noVNC)
- For Mac Mini users: native macOS screen sharing (VNC built into OS) tunneled via Cloudflare
- For Linux VMs: XFCE + VNC server + noVNC for full desktop streaming in browser
- TeamViewer-like experience — watch and take over your agent's desktop
- Not needed for hackathon since Browser Use `live_url` covers the "watch your agent" use case

### Security Hardening
- Per-instance Docker isolation inside VMs
- Default-deny skill policy (curated safe skills only)
- Encrypted credential storage
- Prompt injection monitoring (addressing CrowdStrike/Malwarebytes concerns about OpenClaw)

### Desktop App Enhancements
- Auto-update OpenClaw installations via ElectroBun's bsdiff updater
- Migration between local and cloud (move agent from Mac to cloud and back)
- Health monitoring and auto-restart
