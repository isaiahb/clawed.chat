# 🤖 agent.md — AI Agent Task Checklist

> **Instructions for AI:** This is your work queue. Check `.isaiah/isaiah.md` for Isaiah's human tasks — some of your work is blocked on those. Update this file as you complete tasks. Always discuss the plan with Isaiah before starting work.
>
> **Key decision:** VMs run **Bun** (not Node.js). OpenClaw officially supports Bun. This keeps the entire stack consistent — local dev, backend, and VMs all use Bun.

---

## How This List Works

- **Ready** = no blockers, an agent can start immediately
- **Blocked on Isaiah** = needs a human task done first (API key, account signup, etc.)
- **Done** = completed and committed

Tasks within each section are roughly priority-ordered (top = do first).

---

## Ready (no blockers)

### Documentation & Alignment Fixes

These are safe, non-breaking changes to align docs with the post-design-review decisions.

- [x] **Fix Docker → native references everywhere** — VMs use Bun 1.3+ + `bun i -g openclaw` + systemd, NOT Docker, NOT Node.js. Updated:
  - `.isaiah/isaiah.md` (VM image description)
  - `scripts/README.md` (Ubuntu 24.04 + Bun)
  - `scripts/bake-image/README.md` (Ubuntu 24.04 + Bun native)
  - `.isaiah/memory.md` (flipped to native Bun install)
- [x] **Update README.md for post-design-review** — added Composio to tech stack, native OpenClaw/Bun in architecture, design docs in Key Docs table, `openclaw-channel-clawed/` in monorepo structure
- [x] **Add new sections to `.isaiah/isaiah.md`** — OpenClaw local dev setup (section 10), renumbered Anthropic to 11, sponsor credits to 12
- [ ] **Copy design docs 10 + 11 to `docs/design/`** if that's where we want the canonical copies (currently only in `.isaiah/files/`)

### Schema & Data Model

- [x] **Update `convex/schema.ts`** — added three new tables:
  - `api_keys` (Design Doc 08) — encrypted BYOK keys with masked display
  - `connections` (Design Doc 04) — Composio OAuth connection state
  - `chat_messages` (Design Doc 10) — message history between user and agent
  - Also: migrated existing tables to snake_case field names
- [x] **Update Convex server functions** — migrated `users.ts` and `instances.ts` to snake_case

### New Backend File Stubs

These are scaffolding only — route definitions + handler signatures with TODOs inside. No real implementation yet.

- [x] **API route stubs** — created files, wired into `api/index.ts` mount table:
  - `webhooks.api.ts` — Clerk webhook receiver (Doc 01)
  - `me.api.ts` — current user info (Doc 01)
  - `keys.api.ts` — BYOK key management: list/add/delete (Doc 08)
  - `connections.api.ts` — Composio OAuth flows (Doc 04)
  - `openclaw.api.ts` — outbound callback from channel plugin (Doc 10)
  - `desktop.api.ts` — register-local, heartbeat (Doc 05)
- [x] **Update `api/index.ts` mount table** — all 9 routes mounted
- [x] **Service stubs** — created files with real implementations:
  - `encryption.ts` — AES-256-GCM encrypt/decrypt/maskKey (fully implemented)
  - `llm-validation.ts` — per-provider key validation via real API calls (Anthropic, OpenAI, Google)
  - `composio.service.ts` — Composio SDK wrapper (stub with proper structure, needs API key to test)

### OpenClaw Architecture Changes

- [x] **Rewrite `openclaw.service.ts`** — replaced raw WebSocket proxy with Gateway RPC approach:
  - Uses built-in `chat.send` method (same as OpenClaw's webchat UI) — validated against real source
  - Sends connect + chat.send RPC via WebSocket, waits for ack only
  - Responses come back async via channel plugin → `/api/openclaw/outbound`
  - `isReachable()` now uses HTTP health check (200/401/429 = alive)
- [x] **Update `chat.api.ts`** — switched from synchronous request/response to async:
  - Added auth check, source validation
  - TODOs for: write to Convex `chat_messages`, dispatch via openclaw.service, touch last_active_at
  - Agent response arrives later via outbound webhook → Convex → frontend subscription

### OpenClaw Channel Plugin

- [x] **Create `openclaw-channel-clawed/` package** — our custom channel plugin:
  - `openclaw.plugin.json` — plugin manifest (follows real OpenClaw pattern from Telegram/Discord plugins)
  - `package.json` — npm package config with `openclaw.extensions` entry
  - `src/index.ts` — channel registration, `clawed.inbound` RPC handler, outbound HTTP POST callback
  - Validated against actual OpenClaw plugin SDK types (`ChannelPlugin`, `OpenClawPluginApi`, `GatewayRequestHandler`)

### Image Baking Scripts

- [x] **Create `scripts/bake-image/bake.sh`** — orchestrates GCP image creation (6-step pipeline with SSH wait loop, error handling)
- [x] **Create `scripts/bake-image/setup-vm.sh`** — runs inside builder VM (Ubuntu 24.04 + Bun + OpenClaw + plugin + systemd + UFW + fail2ban)
- [x] **Create `scripts/bake-image/startup-script.sh`** — per-user config template injected via GCP metadata (reads metadata, writes openclaw.json, restarts service, health check loop)

### Env File

- [x] **Update `.env.example`** — added new variables:
  - `ELEVENLABS_API_KEY` (optional)
  - `OPENCLAW_GATEWAY_TOKEN`
  - (Composio + encryption vars were already present from previous session)

---

## Ready — Frontend Dashboard

- [x] **DeployModal component** — provider selection (Anthropic/OpenAI/Google), API key input, deploy button
- [x] **InstanceCard component** — status badge, subdomain link, start/stop/destroy controls, chat/watch buttons
- [x] **AgentsPage** — clean instance list with deploy button, empty state, no feature chip filler
- [x] **ChatPage** — full-page chat at `/app/chat/:instanceId` with real-time Convex subscription, browser view side panel toggle, back-to-agents link
- [x] **BrowserView** — iframe wrapper for Browser Use `live_url` (integrated into ChatPage as side panel)
- [x] **Wire dashboard to Convex** — `useQuery` for real-time instance list on AgentsPage, ChatPage subscribes to `chatMessages.listByInstance`
- [x] **Deploy flow end-to-end** — GitHub Actions CI/CD to GCP VM is fully operational (1m35s deploys)
- [x] **Connections page** — wired to real `/api/connections` endpoints with service catalog merge, OAuth initiate/callback handling, loading states
- [x] **Keys page** — API Keys section added to SettingsPage with list/add/delete wired to `/api/keys`
- [ ] **Settings page** — account/appearance/safety sections still local zustand state, no backend persistence

## Ready — Service Wiring

- [x] **Wire `keys.api.ts`** — connected to Convex `apiKeys` functions + `encryption.ts` + `llm-validation.ts` (list/add/delete all working)
- [x] **Wire `connections.api.ts`** — connected to Convex `connections` functions + `composio.service.ts` (list/initiate/callback/disconnect)
- [x] **Wire `me.api.ts`** — fetches user profile from Convex via `users.getByClerkId`, graceful fallback for unsynced users
- [x] **Wire `desktop.api.ts`** — register-local creates/updates Convex instance, heartbeat touches `last_active_at`, ownership verification
- [x] **Wire `chat.api.ts`** — verifies ownership, writes to Convex `chatMessages`, dispatches to OpenClaw gateway, touches last_active_at
- [x] **Wire `openclaw.api.ts`** — validates token, writes agent response to Convex `chatMessages`, triggers glasses TTS
- [x] **Wire `instances.api.ts`** — `getInstance` fetches from Convex with ownership verification + deploy/stop/start/destroy via Pulumi service
- [x] **Wire Pulumi program** — Cloudflare DNS (proxied: true) and GCP VM are fully provisioned and working via CI/CD

## Done — Integrate Parth's Design
- [x] **Extract Parth's branch** — pulled into `parth/` folder (Vite app, runs standalone on port 5555 for reference)
- [x] **Port styling to app** — 19 Shadcn UI components, 10 shared components, full `index.css` (~1800 lines), dark mode theme, glassmorphism, animations
- [x] **Route restructure** — `/app/agents` (instance list), `/app/chat/:id` (chat), `/app/connections`, `/app/settings`. Nav: Agents | Connections | Settings
- [x] **Header pill** — replaced "Agent Live" dropdown with "Glasses Connected/Offline" (wired to useMentraAuth)
- [x] **Dark mode default** — flipped theme from "light" to "dark"
- [x] **3D model fix** — decimated lobster claw (56MB STL → 263KB GLB), switched to useGLTF
- [x] **Static asset routing** — fixed Bun.serve to serve `/assets/*` before HTML catch-all
- [x] **Intro splash** — optimized (15fps throttle, slower claw), added `?intro=1` query param for demo replay
- [x] **Full-height layout** — fixed half-page rendering with `min-h-screen`

## Blocked on Isaiah

- [ ] **Bake actual GCP image** — need to run `./scripts/bake-image/bake.sh` (all keys ready, just needs to be executed)
- [ ] **End-to-end chat test** — blocked on local OpenClaw install (`bun i -g openclaw`)
- [ ] **Test Browser Use session creation** — API key is set, service is wired, just needs a live deploy to verify live_url works

---

## Done

- [x] Clone OpenClaw repo to `.repos/openclaw` for reference
- [x] Move `isaiah.md` to `.isaiah/isaiah.md`, update all references
- [x] Validated channel plugin design against real OpenClaw source code
- [x] Decision: VMs use Bun (not Node.js) — OpenClaw officially supports Bun
- [x] Decision: Use `chat.send` gateway method for inbound messages — same as webchat UI
- [x] Decision: Clerk + Convex native integration — no webhooks needed
- [x] Installed `@composio/core` in app/ workspace
- [x] Installed Composio CLI, created 3 auth configs (Gmail, Calendar, GitHub)
- [x] Set up all env vars: Browser Use, Cloudflare, Composio, secrets, Anthropic, ngrok
- [x] Activated Clerk + Convex integration, created `convex/auth.config.ts`
- [x] Wired frontend provider stack: `ClerkProvider` → `ConvexProviderWithClerk` → `MentraAuthProvider`
- [x] Built sign-in screen + auth-aware App shell using Convex's `<Authenticated>`/`<Unauthenticated>`
- [x] Updated Mentra app with ngrok URL `isaiah-tpa.ngrok.app`
- [x] Scrubbed all keys from `memory.md` and `isaiah.md`
- [x] Gitignored entire `.isaiah/` folder
- [x] Ported Parth's full design system into app (Shadcn UI, dark mode, glassmorphism, animations)
- [x] Restructured routes: `/app/agents`, `/app/chat/:instanceId`, removed "AskPage"
- [x] Wired chat flow end-to-end: chat.api → Convex → OpenClaw gateway → openclaw.api → Convex → frontend
- [x] Fixed 3D claw model (56MB → 263KB), static asset routing, full-height layout
- [x] Optimized intro splash animation, added `?intro=1` demo param
- [x] Wired keys.api.ts, connections.api.ts, me.api.ts, desktop.api.ts to Convex + services
- [x] Added API Keys UI to SettingsPage (list/add/delete with validation + encryption)
- [x] Wired ConnectionsPage frontend to real /api/connections (service catalog + live merge + OAuth flow)
- [x] Implemented real Browser Use Cloud API in browseruse.service.ts (create/get/destroy/ensureSession)
- [x] Wired Browser Use into instance deploy (creates session) + destroy (cleans up session) + start (refreshes expired session)
- [x] Replaced all Composio service stubs with real @composio/core v0.6 SDK calls (link, waitForConnection, delete, list, refresh, getRawComposioTools)

---

## Suggested Work Order

For an agent picking up work, do it in this order:

```
1. End-to-end chat test (blocked on Isaiah: OpenClaw on VM)          ← NEXT
2. Landing page polish
3. Settings page backend persistence
```

---

## Reference

| Doc | Location | Relevant tasks |
|-----|----------|---------------|
| Design Doc 01 | `.isaiah/files/01-auth-onboarding.md` | webhooks.api, me.api |
| Design Doc 02 | `.isaiah/files/02-cloud-provisioning.md` | startup script, native install |
| Design Doc 04 | `.isaiah/files/04-connections-integrations.md` | connections.api, composio.service |
| Design Doc 05 | `.isaiah/files/05-desktop-companion.md` | desktop.api |
| Design Doc 08 | `.isaiah/files/08-llm-key-management.md` | keys.api, encryption.ts, llm-validation.ts |
| Design Doc 09 | `.isaiah/files/09-alignment-notes.md` | Docker→native, Ubuntu version, zone fixes |
| Design Doc 10 | `.isaiah/files/10-openclaw-channel-plugin.md` | channel plugin, openclaw.api, chat rewrite |
| Design Doc 11 | `.isaiah/files/11-openclaw-setup.md` | bake scripts, local dev setup, systemd |

---

*Last updated: 2026-03-01 (session 4 — wired all remaining APIs to Convex + services, added Keys UI, wired ConnectionsPage frontend, implemented real Browser Use + Composio SDK integration)*