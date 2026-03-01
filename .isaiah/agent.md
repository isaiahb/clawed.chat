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

Currently building. These are the hackathon demo priorities.

- [x] **DeployModal component** — provider selection (Anthropic/OpenAI/Google), API key input, deploy button
- [x] **InstanceCard component** — status badge, subdomain link, start/stop/destroy controls, chat/watch buttons
- [ ] **ChatPanel component** — real-time messaging with agent, subscribes to Convex `chat_messages`
- [ ] **BrowserView component** — Browser Use `live_url` iframe for "watch your agent"
- [ ] **Wire dashboard to Convex** — use `useQuery` for real-time instance list, `useMutation` for deploy/stop/destroy
- [x] **Deploy flow end-to-end** — GitHub Actions CI/CD to GCP VM is fully operational (1m35s deploys)
- [ ] **Connections page** — list connected services, connect/disconnect buttons (Composio OAuth)
- [ ] **Keys page** — list masked keys, add/delete (uses encryption.ts + llm-validation.ts)

## Ready — Service Wiring

These connect the API route TODOs to real Convex calls + services. Unblocked now that all keys are obtained.

- [ ] **Wire `keys.api.ts`** — connect to Convex `apiKeys` functions + `encryption.ts` + `llm-validation.ts`
- [ ] **Wire `connections.api.ts`** — connect to Convex `connections` functions + `composio.service.ts`
- [ ] **Wire `chat.api.ts`** — connect to Convex `chatMessages:insert` + `openclaw.service.ts`
- [ ] **Wire `openclaw.api.ts`** — connect outbound handler to Convex `chatMessages:insert` + UserSession TTS
- [x] **Wire `instances.api.ts`** — connect to Convex `instances` functions + Pulumi service
- [x] **Wire Pulumi program** — Cloudflare DNS (proxied: true) and GCP VM are fully provisioned and working via CI/CD

## Ready — Integrate Parth's Design
- [ ] **Extract Parth's branch** — pull his UI/UX mockups into `parth/` folder for reference without touching his branch
- [ ] **Port styling to app** — systematically move his Tailwind config, global CSS, and Shadcn UI components into our `app/` dashboard
- [ ] **Update our components** — style DeployModal, InstanceCard, and Dashboard shell to match his cinematic/dark mode mission-control vibe (Docs 03/07)

## Blocked on Isaiah

- [ ] **Bake actual GCP image** — need to run `./scripts/bake-image/bake.sh` (all keys ready, just needs to be executed)
- [ ] **End-to-end chat test** — blocked on local OpenClaw install (`bun i -g openclaw`)

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

---

## Suggested Work Order

For an agent picking up work, do it in this order:

```
1. Frontend dashboard components (ChatPanel, BrowserView)     ← IN PROGRESS
2. Wire dashboard to Convex (useQuery/useMutation)
3. Wire API routes to real Convex calls + services
4. End-to-end deploy flow testing
5. Landing page (web/)
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

*Last updated: 2026-03-01 (session 2 — Clerk+Convex integration, Composio setup, frontend build started)*