# 🐾 clawed.chat

> Deploy your own OpenClaw AI agent in 30 seconds. Talk to it from your smart glasses.

**Hackathon:** YC x Browser Use Web Agents Hackathon (Feb 28–Mar 1, 2026)
**Domain:** [clawed.chat](https://clawed.chat)

---

## What is this?

clawed.chat is the fastest way to deploy, manage, and talk to a personal [OpenClaw](https://github.com/openclaw/openclaw) AI agent — from the cloud or your own hardware, controllable from smart glasses.

**The problem:** OpenClaw is incredible (191k+ GitHub stars, actually *does things* — browses the web, sends emails, manages files, runs automations). But setting it up requires CLI fluency, SSH, Docker, API keys, firewall config, and DNS. The creator's own maintainer warned: "if you can't understand how to run a command line, this is far too dangerous for you to use."

**Our solution:** One-click deployment. Beautiful dashboard. Smart glasses interface. No terminal required.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      clawed.chat                          │
│                                                          │
│  Clients:                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ Web        │  │ Desktop    │  │ Mentra Smart       │ │
│  │ Dashboard  │  │ (Electro-  │  │ Glasses            │ │
│  │            │  │  Bun)      │  │                    │ │
│  └─────┬──────┘  └─────┬──────┘  └────────┬───────────┘ │
│        │               │                   │             │
│        └───────────────┼───────────────────┘             │
│                        ▼                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │  app/ — Bun + Hono (MentraOS Mini App)            │  │
│  │  API + Dashboard + Glasses routes — one server     │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │                                   │
│         ┌────────────┼────────────┐                      │
│         │            │            │                      │
│    Pulumi API    Convex DB   Browser Use Cloud           │
│         │                                                │
│    GCP Compute + Cloudflare DNS                          │
│         │                                                │
│    Per-user VMs running OpenClaw                         │
└──────────────────────────────────────────────────────────┘
```

**Key insight:** The MentraOS mini app and the clawed.chat backend are the **same Hono/Bun server**. Glasses, dashboard, and desktop app are all just clients hitting the same API.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Bun | Fullstack dev server, fast, TypeScript-native |
| **Backend** | Hono (on `@mentra/sdk` AppServer) | Lightweight, runs on Bun, MentraOS integration built-in |
| **Frontend** | React 19, Tailwind v4 | Bun bundles TSX/CSS natively, no Vite needed |
| **Auth** | Clerk | Google OAuth, works across web + desktop + glasses |
| **Database** | Convex | Real-time by default — dashboard updates without polling |
| **Infra Provisioning** | Pulumi Automation API | Per-user GCP VMs created programmatically from TypeScript |
| **Cloud** | GCP Compute Engine | Pre-baked VM images, scalable |
| **DNS** | Cloudflare API | Wildcard `*.clawed.chat`, per-user A records |
| **Browser Automation** | Browser Use Cloud | Stealth browsers, CAPTCHA solving, live view |
| **Desktop App** | ElectroBun | Bun-native, 14MB bundle, native webview |
| **Smart Glasses** | Mentra Live (MentraOS) | Voice in/out, same backend |

---

## Monorepo Structure

```
clawed.chat/
├── app/                    ← THE product (Bun + Hono MentraOS mini app)
│   └── src/
│       ├── index.ts        ← Bun.serve() entry point
│       ├── backend/
│       │   ├── ClawedChat.ts       ← AppServer subclass (glasses lifecycle)
│       │   ├── UserSession.ts      ← per-user state (glasses + instance ref)
│       │   ├── api/                ← Hono route files (<feature>.api.ts)
│       │   ├── session/            ← glasses-dependent state (voice manager)
│       │   └── services/           ← stateless infra logic (pulumi, dns, browseruse, openclaw)
│       └── frontend/               ← React dashboard (Bun fullstack, no Vite)
├── convex/                 ← Database schema + server functions
├── web/                    ← Landing page (Cloudflare Pages)
├── desktop/                ← ElectroBun companion app
├── deploy/                 ← Pulumi config for OUR infra (CI/CD)
├── scripts/                ← Image baking, utilities
├── .github/workflows/      ← CI/CD pipeline
├── mentra-mini-app-example/← Reference template (read-only)
├── SPEC.md                 ← Full project spec
├── SPIKE.md                ← Technical research + decisions
└── isaiah.md               ← Third-party setup checklist
```

Every folder has a `README.md` with detailed context, conventions, and planned structure.

---

## Quickstart

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.2
- Third-party accounts set up (see [`isaiah.md`](./isaiah.md) for full checklist)

### Setup

```bash
# Clone and enter
git clone https://github.com/BallahTech/clawed.chat.git
cd clawed.chat

# Copy environment template and fill in your keys
cp .env.example app/.env

# Install all workspace dependencies
bun install

# Start Convex (separate terminal)
bunx convex dev

# Start the app
bun run dev

# Expose to MentraOS (separate terminal)
ngrok http --url=<your-static-url> 3000
```

### Verify

- `http://localhost:3000` → dashboard UI
- `http://localhost:3000/api/health` → `{"status": "ok"}`

---

## Core Features

### 1. One-Click Cloud Deploy
User clicks "Deploy" → Pulumi Automation API creates a GCP VM (from pre-baked image) + Cloudflare DNS record → OpenClaw running at `username.clawed.chat` in ~60 seconds.

### 2. Agent Dashboard
Real-time instance status via Convex. "Watch your agent" via Browser Use `live_url` iframe. Chat interface proxied to OpenClaw gateway. Start/stop/destroy controls.

### 3. Smart Glasses Interface
Voice in → transcribed on glasses → sent to Hono backend → proxied to OpenClaw → response spoken aloud on glasses. Same server, same agent, no extra setup.

### 4. Browser Use Integration
Every instance uses Browser Use Cloud as its browser backend. Stealth browsing, CAPTCHA solving, 195+ country proxies. Zero config — OpenClaw supports remote CDP natively.

### 5. Desktop Companion (ElectroBun)
For users who want OpenClaw on their own Mac. Signs in with Clerk, installs OpenClaw locally, tunnels back to clawed.chat dashboard.

---

## Folder Conventions

| Convention | Rule |
|---|---|
| API routes | `<feature>.api.ts` — routes at top, handlers at bottom |
| API mount table | `api/index.ts` — pure mount table, nothing else |
| Session managers | `<feature>.manager.ts` — needs live `AppSession` |
| Services | `<feature>.service.ts` — stateless, no live session |
| Pages | `<PageName>Page.tsx` — in `frontend/pages/` |
| Components | PascalCase `.tsx` — in `frontend/components/` |
| Style | No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }` |

---

## Key Docs

| Document | What it covers |
|----------|---------------|
| [`SPEC.md`](./SPEC.md) | Full project spec — features, data model, API contracts, demo script |
| [`SPIKE.md`](./SPIKE.md) | Technical research — how OpenClaw works, stack decisions, risks |
| [`isaiah.md`](./isaiah.md) | Third-party setup checklist — GCP, Clerk, Convex, Browser Use, etc. |
| [`app/README.md`](./app/README.md) | App workspace — architecture, running, folder conventions |
| [`convex/README.md`](./convex/README.md) | Database — schema, functions, how services talk to Convex |
| [`deploy/README.md`](./deploy/README.md) | Our infra — Pulumi CI/CD for the backend itself |

---

## License

MIT