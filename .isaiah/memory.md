# 🧠 memory.md — Persistent Context for AI Sessions

> **Instructions for AI:** Read this file at the start of every session. Update it before ending a session or when significant decisions are made. Prune outdated info, summarize verbose sections, and keep this under ~500 lines. This is your memory across sessions — treat it as the single source of truth for "where we are."
>
> **WARNING:** Never put API keys, secrets, or tokens in this file. All secrets live in `app/.env` (gitignored).

---

## Project: clawed.chat

One-click deployment + management for OpenClaw AI agents. Talk to your agent from smart glasses. Hackathon project (YC x Browser Use, Feb 28–Mar 1, 2026).

**Repo:** `github.com/isaiahb/clawed.chat` | **Branch:** `isaiah` | **Domain:** clawed.chat

---

## Key Documents (read these for full context)

| Doc | Location | What it covers |
|-----|----------|---------------|
| SPEC.md | repo root | Full project spec — features, data model, API contracts, demo script |
| SPIKE.md | repo root | Technical research — how OpenClaw works, stack decisions, risks |
| Design Docs 01-11 | `.isaiah/files/` | Detailed per-feature design docs |
| isaiah.md | `.isaiah/isaiah.md` | Isaiah's human TODO checklist |
| agent.md | `.isaiah/agent.md` | Agent task checklist — what AI should work on next |
| .devops.md | repo root | Step-by-step log of every CLI/infra setup action taken |
| README.md | repo root | Project overview, architecture, quickstart |

---

## Architecture (mental model)

```
Clients: Web Dashboard | Desktop (ElectroBun) | Mentra Smart Glasses
    ↓ all hit the same server ↓
app/ — Single Bun + Hono server (MentraOS Mini App)
    ├── Clerk auth (identity: "who are you?")
    ├── MentraOS auth (hardware link: "which glasses session?")
    ├── API routes → services → Pulumi/GCP/Cloudflare/BrowserUse
    └── Convex (real-time DB) ← dashboard subscribes for live updates
         ↓
    Per-user GCP VMs running OpenClaw (Bun, native, systemd)
    with our custom `clawed` channel plugin
```

**Key insight:** Clerk and MentraOS auth are orthogonal:
- **Clerk** = user identity (Google OAuth, gates all features)
- **MentraOS** = glasses hardware session link (ties webview to AppSession for camera/mic/TTS)
- They stack: `<ClerkProvider>` wraps `<ConvexProviderWithClerk>` wraps `<MentraAuthProvider>` wraps `<App />`

**Key insight:** Clerk + Convex integration = no webhooks needed. Convex validates Clerk JWTs directly via `convex/auth.config.ts`. Use `ctx.auth.getUserIdentity()` in Convex functions. Use Convex's `<Authenticated>`/`<Unauthenticated>` instead of Clerk's `<SignedIn>`/`<SignedOut>`.

---

## Tech Stack

| Layer | Technology | Package |
|-------|-----------|---------|
| Runtime | Bun 1.3.10 (fullstack dev server, no Vite — also used on VMs) | `bun` |
| Backend | Hono on MentraOS AppServer | `hono`, `@mentra/sdk` |
| Frontend | React 19, Tailwind v4 | `react`, `bun-plugin-tailwind` |
| Auth (identity) | Clerk | `@clerk/clerk-react@5.61.3`, `@hono/clerk-auth@3.1.0` |
| Auth (glasses) | MentraOS | `@mentra/sdk`, `@mentra/react` |
| Database | Convex (real-time) | `convex@1.32.0` |
| Integrations | Composio | `@composio/core` |
| Infra | Pulumi Automation API | `@pulumi/pulumi`, `@pulumi/gcp`, `@pulumi/cloudflare` |
| Cloud | GCP Compute Engine | via Pulumi |
| DNS | Cloudflare | via Pulumi + direct API |
| Browser | Browser Use Cloud (remote CDP) | API calls (no SDK) |
| Desktop | ElectroBun | (low priority for hackathon) |

---

## Monorepo Structure

```
clawed.chat/
├── app/                    ← THE product (Bun + Hono MentraOS mini app)
│   └── src/
│       ├── index.ts        ← Bun.serve() entry point (static assets + HTML routes + Hono)
│       ├── backend/
│       │   ├── ClawedChat.ts       ← AppServer subclass
│       │   ├── api/                ← Hono routes (<feature>.api.ts)
│       │   │   ├── index.ts        ← Pure mount table (9 routes + /health)
│       │   │   ├── webhooks.api.ts, me.api.ts, keys.api.ts
│       │   │   ├── instances.api.ts ← WIRED: deploy/stop/start/destroy + getInstance from Convex
│       │   │   ├── chat.api.ts      ← WIRED: write to Convex + dispatch to OpenClaw gateway
│       │   │   ├── openclaw.api.ts  ← WIRED: receive agent responses → Convex + glasses TTS
│       │   │   ├── connections.api.ts (stub), llm-proxy.api.ts (partial)
│       │   │   ├── glasses.api.ts, desktop.api.ts (stubs)
│       │   ├── session/            ← glasses-dependent state
│       │   │   ├── UserSession.ts  ← per-user state (globalThis singleton)
│       │   │   └── voice.manager.ts
│       │   └── services/           ← stateless infra logic
│       │       ├── openclaw.service.ts  ← Gateway RPC via chat.send (fully implemented)
│       │       ├── encryption.ts        ← AES-256-GCM (fully implemented)
│       │       ├── llm-validation.ts    ← Per-provider key validation (implemented)
│       │       ├── composio.service.ts  ← Composio SDK wrapper (stub)
│       │       ├── instance.pulumi.ts, instance.service.ts ← WIRED: Pulumi + Convex
│       │       ├── dns.service.ts, browseruse.service.ts
│       └── frontend/               ← React dashboard
│           ├── Router.tsx          ← Route structure (site + auth-gated app)
│           ├── layouts/            ← AppLayout (glasses pill, nav), SiteLayout (header/footer)
│           ├── pages/app/          ← AgentsPage, ChatPage, ConnectionsPage, SettingsPage
│           ├── pages/              ← Home, Pricing, Docs, SignIn, NotFound (site pages)
│           ├── components/ui/      ← Shadcn UI components (19 total)
│           ├── components/shared/  ← IntroSplash, CommandBar, LobsterClaw3D, etc.
│           ├── stores/app-store.ts ← Zustand persisted state
│           ├── types/index.ts      ← Shared TypeScript types
│           └── data/mock.ts        ← Mock data (connections page still uses this)
├── convex/                 ← Schema + server functions
│   ├── schema.ts           ← 5 tables: users, instances, api_keys, connections, chat_messages
│   ├── users.ts, instances.ts, apiKeys.ts, connections.ts, chatMessages.ts
├── parth/                  ← Designer's UI mockups (Vite app, reference only)
├── openclaw-channel-clawed/← Custom OpenClaw channel plugin
│   ├── openclaw.plugin.json, package.json, src/index.ts
├── scripts/bake-image/     ← GCP VM image baking (bake.sh, setup-vm.sh, startup-script.sh)
├── .isaiah/                ← Human + agent checklists, design docs, AI memory
├── .repos/openclaw/        ← OpenClaw source for reference (git-ignored)
```

---

## Code Conventions (Isaiah's Style)

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
- `api/index.ts` = pure mount table, nothing else
- `<feature>.api.ts` = routes at top, handlers at bottom
- `<feature>.service.ts` = stateless infra logic
- `<feature>.manager.ts` = glasses-dependent, needs live AppSession
- `session/` = needs AppSession | `services/` = stateless, call anytime
- `UserSession.ts` uses `globalThis[Symbol.for()]` to prevent duplicate module bugs
- Convex schema uses snake_case field names
- Frontend auth: use Convex's `<Authenticated>`/`<Unauthenticated>`, NOT Clerk's `<SignedIn>`/`<SignedOut>`
- Frontend auth hook: use `useConvexAuth()`, NOT Clerk's `useAuth()` for checking auth state
- Frontend env vars: `BUN_PUBLIC_CLERK_PUBLISHABLE_KEY`, `BUN_PUBLIC_CONVEX_URL`

---

## Accounts & Keys Status

All keys live in `app/.env` (gitignored). See `.env.example` for the template.

### ✅ Fully Set Up
- Bun 1.3.10
- MentraOS app: `com.isaiah.clawed` (MICROPHONE + CAMERA), ngrok URL `isaiah-tpa.ngrok.app`
- GCP: project `clawed-chat`, billing, APIs, SA, firewall
- Pulumi: authed as `isaiahb`
- Convex: project `clawed-chat`, deployment `dev:adorable-sturgeon-328`, schema pushed
- Clerk: keys obtained, Convex integration activated (no webhooks needed), `convex/auth.config.ts` created
- Browser Use: API key obtained
- Cloudflare: zone ID + API token obtained for `clawed.chat`
- Composio: API key obtained, CLI installed, 3 auth configs created (Gmail, Calendar, GitHub)
- Encryption: `KEY_ENCRYPTION_SECRET` + `COOKIE_SECRET` generated
- Anthropic: API key obtained (for demo/local dev)

### ⏳ Still Need
- GCP pre-baked VM image (scripts exist, need to run `./scripts/bake-image/bake.sh`)
- OpenClaw local dev install (`bun i -g openclaw`)
- Rotate leaked keys before making repo public
- Scrub git history of old secrets

---

## GCP Project Details

| Resource | Value |
|----------|-------|
| Project ID | `clawed-chat` |
| Zone | `us-west1-a` |
| Service Account | `pulumi-provisioner@clawed-chat.iam.gserviceaccount.com` |
| Firewall | `allow-openclaw` → tcp:18789,80,443 → tag `openclaw-instance` |

---

## Design Doc Corrections Status

All corrections from Doc 09 have been applied. ✅

---

## Important Gotchas

1. **MentraOS has built-in TTS** — `appSession.audio.speak(text)` handles it. No ElevenLabs needed.
2. **VMs use Bun, not Node.js** — OpenClaw officially supports Bun. Entire stack is Bun.
3. **Native OpenClaw on VMs, not Docker** — faster startup (~3s), simpler plugin install, runs as systemd service.
4. **Clerk + Convex native integration** — no webhooks needed. `convex/auth.config.ts` + `ConvexProviderWithClerk` handles everything. Use `ctx.auth.getUserIdentity()` in Convex functions.
5. **Bun uses `BUN_PUBLIC_` prefix** (not `VITE_`) for frontend env vars.
6. **@hono/clerk-auth@3.1.0** — official Clerk middleware for Hono. No custom auth needed.
7. **Convex must be at repo root** — CLI expects `convex/` relative to where you run it.
8. **OpenClaw `chat.send`** — validated against real source code. Standard gateway RPC method for sending messages (same as webchat UI). Channel plugin handles outbound via HTTP POST callback.
9. **Channel plugin types are inline** — `openclaw/plugin-sdk` only exists on VMs. Plugin uses inline type definitions.
10. **Keys leaked in git history** — Clerk secret key, MentraOS API key, Pulumi token in old commits. Must rotate + scrub before making repo public.
11. **No Clerk CLI** — all config is via dashboard or SDK only.
12. **Composio CLI** — installed at `~/.composio/composio`, logged in as `isaiahballah@gmail.com`. Supports `auth-configs create`, `connected-accounts link`, etc.
13. **Bun.serve static assets** — `routes: {"/*": indexHtml}` catch-all intercepts everything. Static files must be served via a `/assets/*` route handler *before* the catch-all, not in the `fetch` handler (which only runs for non-route matches).
14. **Zustand persist + theme** — changing the default theme in code doesn't affect users who already have a persisted value in localStorage. Must clear `localStorage.removeItem("clawed-app-store")` or add a store version migration.
15. **3D model sizes** — STL files can be huge (56MB+). Always decimate and export as GLB for web. The lobster claw model was reduced from 213K faces → 15K faces (56MB → 263KB) using `fast-simplification` via Python.

---

## Feature Build Order

```
08 LLM Key Management  ← foundational
    ↓
01 Auth & Onboarding   ← gates everything
    ↓
02 Cloud Provisioning  ← core product
    ↓
03 Agent Dashboard     ← needs instances
    ↓
04 Connections         ← enhances agents
    ↓
06 Smart Glasses       ← talks to agents

Independent: 05 Desktop, 07 Landing Page
```

---

## What's Been Done (Sessions 1-3)

### Session 1
- Scaffolded entire monorepo, all config files
- Created backend stubs, frontend shell, Convex schema
- Installed + authed: gcloud, pulumi, convex, mentra, clerk
- Created GCP project, MentraOS app

### Session 2 (post-design-review)
- Applied all design review changes (Docs 10 + 11)
- Moved `isaiah.md` → `.isaiah/isaiah.md`, created `agent.md`
- Fixed Docker→Bun native in all docs/scripts
- Updated Convex schema: 5 tables, all snake_case, created server functions for all
- Created 6 new API route stubs + updated mount table (9 routes total)
- Created 3 new services: `encryption.ts`, `llm-validation.ts` (both implemented), `composio.service.ts` (stub)
- Rewrote `openclaw.service.ts` for Gateway RPC, updated `chat.api.ts` for async model
- Created `openclaw-channel-clawed/` plugin, image baking scripts
- Moved `UserSession.ts` to `session/`
- Set up `.env` with all keys + generated secrets
- Cloned OpenClaw repo to `.repos/` for reference
- Set up Clerk + Convex native integration (`convex/auth.config.ts`, `ConvexProviderWithClerk`)
- Wired frontend provider stack: Clerk → Convex → MentraAuth → App
- Built sign-in screen, auth-aware dashboard shell with `<Authenticated>`/`<Unauthenticated>`
- Installed Composio CLI, created 3 auth configs (Gmail, Calendar, GitHub) via CLI
- Set up all env vars: Browser Use, Cloudflare, Composio, secrets, Anthropic
- Started building frontend components: DeployModal, InstanceCard

### Session 3 (design integration + chat wiring)
- **Parth's design integration**: Extracted `origin/parth` branch to `parth/` reference folder. Ported into `app/`:
  - 19 Shadcn UI components (`components/ui/`)
  - 10 shared components (IntroSplash, CommandBar, LobsterClaw3D, ParticleField, etc.)
  - Full `index.css` (~1800 lines — dark mode theme, glassmorphism, animations)
  - SiteLayout + AppLayout, all site pages (Home, Pricing, Docs, SignIn, NotFound)
  - Zustand store, custom hooks, TypeScript types, mock data
  - react-router-dom, @tanstack/react-query, three.js, zustand added to deps
- **3D model fix**: Decimated lobster claw STL (56MB → 263KB GLB) using trimesh + fast-simplification. Switched `LobsterClaw3D` from STLLoader to useGLTF.
- **Static asset routing fix**: Moved `/assets/*` handler into Bun.serve `routes` so it takes priority over the `/*` HTML catch-all.
- **Route restructure**:
  - `/app/agents` → AgentsPage (instance list, deploy, manage)
  - `/app/chat/:instanceId` → ChatPage (full-page chat + browser view side panel)
  - `/app` → redirects to `/app/agents`
  - Sign-in redirects to `/app/agents`
  - Nav: Agents | Connections | Settings
  - Removed old "AskPage" concept
- **Header pill**: Replaced "Agent Live" status dropdown with "Glasses Connected/Offline" pill (wired to useMentraAuth)
- **Dark mode default**: Flipped zustand store default from "light" to "dark"
- **Empty state cleanup**: Removed non-clickable feature chips from agents page, simplified to icon + CTA
- **Intro splash optimization**: Throttled fish swim animation from 60fps to ~15fps, slowed claw movement (280ms→400ms intervals), smoother transitions. Added `?intro=1` query param to force replay for demos.
- **Full-height layout fix**: Added `min-h-screen` to main app wrapper to prevent half-page rendering.
- **Chat flow wired end-to-end**:
  - `chat.api.ts`: Verifies instance ownership, writes user message to Convex `chatMessages`, dispatches to OpenClaw gateway RPC, touches `last_active_at`
  - `openclaw.api.ts`: Validates token, writes agent response to Convex `chatMessages` (triggers real-time frontend update), triggers glasses TTS via MentraOS
  - `instances.api.ts`: `getInstance` now fetches from Convex with ownership verification
  - ChatPage frontend already subscribes via `useQuery(api.chatMessages.listByInstance)` — messages appear in real-time

---

## Next Priorities

### Isaiah still needs to:
- OpenClaw local dev install (`bun i -g openclaw`)
- Bake GCP VM image (`./scripts/bake-image/bake.sh`)
- Sponsor credit signups
- Rotate leaked keys + scrub git history

### What's wired and working:
- ✅ Clerk auth (sign in/out, JWT validation)
- ✅ Convex real-time DB (schema, all server functions)
- ✅ Instance deploy/stop/start/destroy (Pulumi → GCP + Cloudflare)
- ✅ CI/CD (GitHub Actions → GCP VM, 1m35s deploys)
- ✅ Chat backend (user msg → Convex → OpenClaw gateway → agent response → Convex → frontend)
- ✅ LLM Proxy (partial — forwards to Anthropic/OpenAI/Google, token verification stubbed)
- ✅ Frontend route structure, dark mode, design system
- ✅ `keys.api.ts` — list/add/delete wired to encryption + LLM validation + Convex
- ✅ `connections.api.ts` — list/initiate/callback/disconnect wired to Composio service + Convex
- ✅ `me.api.ts` — fetches user profile from Convex, graceful fallback for unsynced users
- ✅ `desktop.api.ts` — register-local + heartbeat wired to Convex instances
- ✅ API Keys UI in SettingsPage — list masked keys, add with validation, delete (wired to `/api/keys`)
- ✅ ConnectionsPage frontend — wired to real `/api/connections` with service catalog merge, OAuth flow, loading states
- ✅ Browser Use integration — real API calls in `browseruse.service.ts` (create/get/destroy/ensureSession), wired into deploy/start/destroy flows
- ✅ Browser Use session stored in Convex (`browser_use_session_id` + `browser_use_live_url`) — ChatPage BrowserView reads `live_url`

### What's still mocked/stubbed:
- ❌ SettingsPage account/appearance/safety — local zustand state, no backend persistence
- ❌ Composio SDK calls — `composio.service.ts` has real structure but SDK calls are still TODOs (needs real testing)
- ❌ End-to-end chat — blocked on OpenClaw running on VM
- ❌ Browser Use live test — service is wired but needs a real deploy to confirm `live_url` renders in iframe

### Agent should work on next:
1. **End-to-end chat test** — blocked on Isaiah: OpenClaw on VM
2. **Landing page polish** — Home.tsx is big but could use refinements
3. **Settings page backend persistence** — save account/preferences to Convex
4. **Composio SDK calls** — replace stubs with real SDK in `composio.service.ts`

---

*Last updated: 2026-03-01 (session 4 — wired all remaining APIs to Convex + services, added Keys UI, wired ConnectionsPage frontend, implemented real Browser Use Cloud integration in deploy/start/destroy flows)*