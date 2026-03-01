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

### Session 3 (design integration + chat wiring) — 2026-03-01 02:00–06:00
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

### Session 5 (production deploy fixes + OpenClaw e2e) — 2026-03-01 06:00–16:00 UTC
- **Bun.serve routing fix**: Put `/api/*`, `/mentra/*`, `/clerk/*` as explicit routes before `"/*"` SPA catch-all. Bun matches more-specific patterns first, so API traffic goes to Hono while HTML bundler handles everything else (with proper CSS/JS injection).
- **jsxDEV production fix**: `development: false` in production (not `{ hmr: false }` which is truthy → still emits dev JSX). The earlier theory that `false` broke HTML routes was wrong — the crash was caused by missing `@composio/core`.
- **convex-server-stub plugin**: Created `plugins/convex-server-stub.ts` — stubs out `convex/server` for the frontend HTML bundler. The generated `convex/_generated/api.js` imports `anyApi` from `convex/server`, which Bun tried to bundle into the frontend, hitting "Unseekable reading file" on `.bun/` cache symlinks. Stub mirrors real Convex `createApi()` proxy with `Symbol.for("functionName")`.
- **@composio/core missing from package.json**: Was installed locally (in `node_modules/.bun/` cache) but never added to `app/package.json`. Fresh `bun install` on VM couldn't find it. Added properly + made import lazy as defensive coding.
- **Favicon**: Replaced inline 🐾 emoji with Parth's animated claw SVG (`favicon.svg`)
- **CI/CD verified working**: GitHub Actions → GCP VM deploys succeed, `/api/health` returns JSON, site renders at clawed.chat
- **OpenClaw VM (`openclaw-agent`) fully set up**: Bun 1.3.10, Node.js 22, OpenClaw 2026.2.26, system-level systemd service, LAN bind (0.0.0.0:18789), GCP firewall rule for VPC-internal traffic
- **Channel plugin loaded**: `openclaw-channel-clawed` auto-discovered from `~/.openclaw/extensions/clawed/src/index.ts` (1/1 loaded). Plugin config uses hardcoded defaults (no `plugins.entries` or `plugins.allow` in config — both cause validation errors).
- **Gateway WebSocket auth protocol**: Challenge-response flow — gateway sends `connect.challenge` with nonce, client sends `{type: "req", id: "<string>", method: "connect", params: {minProtocol: 3, maxProtocol: 3, client: {id: "gateway-client", mode: "backend", ...}, auth: {token}, ...}}`. Frame `type: "req"` and string `id` are mandatory (wrong format = silent 1008 disconnect).
- **Anthropic API key in auth-profiles.json**: Key does NOT go in `openclaw.json`. Lives at `/root/.openclaw/agents/main/agent/auth-profiles.json` with format `{version: 1, profiles: {"anthropic-default": {type: "api_key", provider: "anthropic", key: "sk-ant-..."}}}`. The `--anthropic-api-key` onboard flag does NOT reliably write this file.
- **🎉 E2E chat pipeline verified**: WS connect → challenge-response auth → `chat.send` acked → Anthropic API called → agent responded "Hello, I am here now." → full pipeline works
- **Seeded instance in Convex**: Pre-inserted `openclaw-agent` VM as instance `j972bjjcpxj8xz8yannjtvgnk1822p3b` (user_id: "seed"). Auto-claimed on first login via `me.api.ts` → `instances.claimForUser`.
- **Website blank page fix**: Moving `favicon.svg` from `frontend/` to `public/` broke Bun's HTML bundler (empty responses). Copied it back to `app/src/frontend/favicon.svg`.
- **Full-install startup script**: `scripts/bake-image/startup-script-full.sh` — 448-line idempotent script that installs everything from scratch on plain Ubuntu 24.04. No pre-baked image needed. First boot ~6-10 min, subsequent ~15 sec.

### Session 5 continued (WebSocket proxy, glasses, integrations) — 2026-03-01 16:00–20:00 UTC
- **Clerk middleware missing**: `clerkMiddleware()` was never mounted — every authenticated API route returned 500 (`c.get("clerkAuth") is not a function`). Added to `api/index.ts` for all auth-requiring paths.
- **Hackathon mode deploy**: `HACKATHON_MODE=true` makes the Deploy button assign the existing `openclaw-agent` VM to the user instantly (no Pulumi, no waiting). If user already has an instance, returns it.
- **Model upgraded to Sonnet 4.6**: `anthropic/claude-sonnet-4-6` — confirmed working via e2e test from public internet. Haiku 3.5 model ID was wrong (`claude-haiku-3.5` doesn't exist; correct is `claude-3-5-haiku-latest` but we went with Sonnet 4.6 for quality).
- **Gateway publicly accessible**: Firewall rule updated to `0.0.0.0/0` (was VPC-internal only). Token auth protects it. Any developer can connect with `OPENCLAW_GATEWAY_URL=ws://136.117.21.95:18789`.
- **WebSocket proxy (`openclaw-proxy.ts`)**: Ported from demo branch — full gateway auth handled server-side (token-only, no device pairing). Frontend connects to `/api/openclaw-ws`, proxy relays to cloud gateway. Ed25519 device identity code kept but disabled (causes "pairing required" error).
- **`useOpenClaw` React hook**: Ported from demo branch — connects to proxy, handles `proxy.authenticated`/`proxy.auth_failed` events, dispatches `chat.send` RPCs, receives streaming deltas/finals, auto-reconnects on disconnect.
- **ChatPage wired to useOpenClaw**: Real-time streaming responses (word by word as agent types), "Thinking..." indicator, streaming→persist transition without flash. Streaming content stays visible until Convex subscription confirms the new message.
- **Dual-write bug fixed**: `openclaw.service.ts` was keeping WS open and writing agent responses to Convex AND the frontend `useOpenClaw` was also writing → duplicates, flashing, messages disappearing. Fixed: `openclaw.service.ts` is now fire-and-forget (closes WS after `chat.send` ack). Only the frontend writes the final response via `/api/openclaw/outbound`.
- **`/webhook` route fix**: Mentra SDK's `POST /webhook` (for glasses session requests from Mentra cloud) was being swallowed by the `"/*"` SPA catch-all. Added explicit `/webhook` route to Bun.serve.
- **Glasses voice→agent→TTS pipeline**: `WakeWordDetector` (ported from demo) detects "hey claude/clawed" in transcription stream, accumulates query on 2s silence timeout. `VoiceManager` connects directly to OpenClaw gateway WS, sends `chat.send`, listens for agent response, speaks via TTS on glasses. Wake word locked during agent processing, unlocked on response.
- **Mentra app config updated**: `publicUrl` → `https://clawed.chat`, `webviewURL` → `https://clawed.chat/app/agents`, `logoURL` set to claw icon via GitHub raw URL. Package: `com.isaiah.clawed`.
- **Composio integrations (all 6)**: Gmail, Google Calendar, GitHub (existing) + Slack, Notion, Linear (new via `composio add`). Auth config IDs in `.env`. Service map updated in `composio.service.ts`.
- **Browser Use session**: Created via v2 API (`POST /api/v2/browsers` with `X-Browser-Use-API-Key` header). CDP URL configured in OpenClaw VM config (`browser.profiles.browseruse.cdpUrl` — requires `color: "#hex"` field). Live URL stored in Convex instance record → ChatPage "Watch Agent" eye icon shows iframe.
- **Desktop app (ElectroBun)**: Redesigned installer — light theme, Tailwind-only, 5 screens (Welcome → Provider → API Key → Progress → Connected). Real provider/model selection (Opus 4.6, Sonnet 4.6, GPT-5.2, Gemini 2.5, MiniMax M1, Fireworks). Provider logos from SimpleIcons CDN. Claw logo icon. `Bun.spawn(["open", url])` for external links in webview.
- **Emoji cleanup**: Replaced all emoji provider icons with real SVG logos from CDN across InstanceCard, ChatPage, DeployModal, desktop app.
- **Multiple users working**: Hackathon mode creates instances for each new Clerk user pointing at the shared `openclaw-agent` VM. Multiple users chatting simultaneously (shared gateway, separate session keys).

## Next Priorities

### Isaiah still needs to:
- Sponsor credit signups
- Rotate leaked keys + scrub git history

### What's wired and working:
- ✅ Production deploy — clawed.chat serving HTML + CSS + JS + API correctly
- ✅ Clerk auth (sign in/out, JWT validation, `clerkMiddleware()` on all routes)
- ✅ Convex real-time DB (schema, all server functions)
- ✅ Instance deploy via hackathon mode (instant, assigns shared VM)
- ✅ CI/CD (GitHub Actions → GCP VM, deploys in ~1m30s)
- ✅ **WebSocket proxy** (`/api/openclaw-ws`) — full gateway auth server-side, transparent relay to cloud gateway
- ✅ **`useOpenClaw` React hook** — real-time streaming chat (deltas as agent types, finals persisted to Convex)
- ✅ **ChatPage streaming** — no more dual-write flash, streaming→persist transition is seamless
- ✅ **OpenClaw VM** — `openclaw-agent` running Sonnet 4.6, gateway publicly accessible (136.117.21.95:18789), Browser Use CDP configured
- ✅ **Glasses voice pipeline** — WakeWordDetector ("hey claude") → VoiceManager → gateway → agent → TTS on glasses
- ✅ **Mentra app** — `com.isaiah.clawed`, publicUrl=`https://clawed.chat`, webviewURL set, logo set, `/webhook` route fixed
- ✅ **Composio integrations (6)** — Gmail, Google Calendar, GitHub, Slack, Notion, Linear — all created with auth configs in env
- ✅ **Browser Use** — cloud session active, live_url in Convex, CDP URL on VM, "Watch Agent" iframe in ChatPage
- ✅ **Desktop app (ElectroBun)** — light theme installer, real provider/model selection, claw logo, external link opening
- ✅ LLM Proxy (partial — forwards to Anthropic/OpenAI/Google, token verification stubbed)
- ✅ Frontend: dark mode design system, animated claw favicon, provider logos from CDN (no emojis)
- ✅ `keys.api.ts`, `connections.api.ts`, `me.api.ts`, `desktop.api.ts` — all wired to Convex + services
- ✅ API Keys UI, ConnectionsPage, SettingsPage — all functional
- ✅ Landing page, sign-in, agents list, chat page — all rendering on prod

### What's remaining / needs polish:
- ⏳ **Glasses connection on prod** — webhook route is fixed, Mentra app config is correct, but `onSession` not firing yet on prod (works locally via ngrok). May need Cloudflare WebSocket debugging or Mentra cloud routing investigation.
- ⏳ **Composio OAuth flows** — integrations created but user-facing OAuth (click Connect → complete OAuth → callback) not tested end-to-end on prod. `PUBLIC_URL` is now correct (`https://clawed.chat`).
- ⏳ **Browser Use agent actions** — CDP URL is configured on VM but untested whether the agent actually uses it for web browsing tasks. May need OpenClaw skill/tool configuration.
- ⏳ **Desktop app polish** — UI works but needs design refinement, real Clerk auth flow (currently simulated with timer), and proper ElectroBun external URL opening.
- ⏳ **Chat persistence edge cases** — messages sometimes flash or double-display during streaming→Convex transition. Core dual-write bug is fixed but may need more testing.
- ⏳ **Deploy button for real VMs** — hackathon mode works (shared VM), but real per-user VM provisioning via Pulumi + startup script is untested.

### Agent should work on next:
1. **Debug glasses connection on prod** — why `onSession` doesn't fire through Cloudflare
2. **Test Composio OAuth end-to-end** — click Connect on Connections page, complete OAuth, verify callback
3. **Test Browser Use agent actions** — ask agent to browse a website, verify it uses the cloud browser
4. **Demo polish** — clean up any remaining UI issues for presentation

---

*Last updated: 2026-03-01 20:00 UTC (session 5 — WebSocket proxy ✅, glasses pipeline ✅, Composio 6 integrations ✅, Browser Use configured ✅, dual-write fix ✅)*