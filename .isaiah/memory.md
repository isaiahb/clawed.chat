# 🧠 memory.md — Persistent Context for AI Sessions

> **Instructions for AI:** Read this file at the start of every session. Update it before ending a session or when significant decisions are made. Prune outdated info, summarize verbose sections, and keep this under ~500 lines. This is your memory across sessions — treat it as the single source of truth for "where we are."

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
| Design Docs 01-09 | `.isaiah/files/` | Detailed per-feature design docs (auth, provisioning, dashboard, etc.) |
| isaiah.md | repo root | Isaiah's setup checklist — what's done, what's not |
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
```

**Key insight:** Clerk and MentraOS auth are orthogonal:
- **Clerk** = user identity (Google OAuth, gates all features)
- **MentraOS** = glasses hardware session link (ties webview to AppSession for camera/mic/TTS)
- They stack: `<ClerkProvider>` wraps `<MentraAuthProvider>` wraps `<App />`

**Key insight:** MentraOS has built-in TTS via `appSession.audio.speak()`. No ElevenLabs needed. The `@mentra/sdk` handles transcription (`onTranscription`) and speech output natively.

---

## Tech Stack

| Layer | Technology | Package |
|-------|-----------|---------|
| Runtime | Bun (fullstack dev server, no Vite) | `bun` |
| Backend | Hono on MentraOS AppServer | `hono`, `@mentra/sdk` |
| Frontend | React 19, Tailwind v4 | `react`, `bun-plugin-tailwind` |
| Auth (identity) | Clerk | `@clerk/clerk-react@5.61.3`, `@hono/clerk-auth@3.1.0` |
| Auth (glasses) | MentraOS | `@mentra/sdk`, `@mentra/react` |
| Database | Convex (real-time) | `convex@1.32.0` |
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
│       ├── index.ts        ← Bun.serve() entry point
│       ├── backend/
│       │   ├── ClawedChat.ts       ← AppServer subclass
│       │   ├── UserSession.ts      ← per-user state (globalThis singleton)
│       │   ├── api/                ← Hono routes (<feature>.api.ts)
│       │   ├── session/            ← glasses-dependent (voice.manager.ts)
│       │   └── services/           ← stateless infra (pulumi, dns, browseruse, openclaw)
│       └── frontend/               ← React dashboard
├── convex/                 ← Schema + server functions (users, instances, api_keys)
├── web/                    ← Landing page (Cloudflare Pages) — low priority
├── desktop/                ← ElectroBun app — low priority
├── deploy/                 ← Pulumi for OUR infra (CI/CD)
├── scripts/bake-image/     ← GCP VM image baking
├── mentra-mini-app-example/← Reference template (read-only)
└── .isaiah/files/          ← Design docs 01-09
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

---

## Accounts & Keys Status

### ✅ Fully Set Up
| Service | Status | Key Details |
|---------|--------|-------------|
| Bun | ✅ | v1.3.10 |
| MentraOS | ✅ | App: `com.isaiah.clawed`, org: Isaiah, permissions: MICROPHONE+CAMERA |
| ngrok | ✅ | Installed + authed. Still need static URL configured |
| gcloud | ✅ | Project: `clawed-chat`, billing linked, APIs enabled, SA created, firewall set |
| Pulumi | ✅ | Authed as `isaiahb`, token in .env |
| Convex | ✅ | Project: `clawed-chat`, deployment: `dev:adorable-sturgeon-328`, schema pushed |
| Clerk | ✅ | `pk_test_cmVsYXhpbmctZ29sZGZpc2gtNjAuY2xlcmsuYWNjb3VudHMuZGV2JA`, `@clerk/clerk-react@5.61.3` + `@hono/clerk-auth@3.1.0` |

### ⏳ Still Need
| Service | What's Missing |
|---------|---------------|
| ngrok | Static URL → update Mentra app public URL |
| Clerk | Webhook endpoint (needs ngrok URL first) |
| Browser Use | Sign up, claim $100 credits, get API key |
| Cloudflare | Zone ID + API token for clawed.chat |
| Composio | API key + 3 auth configs (Gmail, Calendar, GitHub) |
| Encryption | `KEY_ENCRYPTION_SECRET` — run `openssl rand -hex 32` |
| Cookie | `COOKIE_SECRET` — run `openssl rand -hex 32` |
| GCP Image | Pre-baked VM image (Ubuntu 24.04 + Docker + OpenClaw) |

---

## GCP Project Details

| Resource | Value |
|----------|-------|
| Project ID | `clawed-chat` |
| Project Number | `917234576075` |
| Billing | `016120-888B2D-47F90B` |
| Service Account | `pulumi-provisioner@clawed-chat.iam.gserviceaccount.com` |
| SA Key | `~/.config/gcloud/clawed-chat-sa-key.json` |
| Firewall | `allow-openclaw` → tcp:18789,80,443 → tag `openclaw-instance` |
| Zone | `us-west1-a` |

---

## Convex Details

| Resource | Value |
|----------|-------|
| Project | `clawed-chat` (team: `isaiah-ballah`) |
| Deployment | `dev:adorable-sturgeon-328` |
| URL | `https://adorable-sturgeon-328.convex.cloud` |
| Dashboard | `https://dashboard.convex.dev/d/adorable-sturgeon-328` |
| Tables | `users`, `instances`, `apiKeys` (schema pushed) |
| `.env.local` | Auto-generated at repo root by `bunx convex dev` |

---

## Design Doc Corrections (from 09-alignment-notes.md)

These were identified but NOT all applied to the scaffold yet:

- [ ] **UserSession.ts location:** should be in `session/` not directly in `backend/` — move it
- [x] **GCP Zone:** standardized on `us-west1-a`
- [ ] **Ubuntu version:** use 24.04 LTS (not 22.04) for baked image
- [ ] **OpenClaw install:** use Docker, not native install (per Design Doc 02)
- [ ] **Composio:** add `composio.service.ts`, `connections.api.ts`, `connections` table
- [ ] **Missing env vars:** Composio keys, KEY_ENCRYPTION_SECRET added to isaiah.md
- [ ] **Missing files from design docs:** `webhooks.api.ts`, `me.api.ts`, `keys.api.ts`, `connections.api.ts`, `desktop.api.ts`, `encryption.ts`, `llm-validation.ts`, `composio.service.ts`
- [ ] **Convex schema:** needs `connections` table, field naming (snake_case per design docs vs camelCase in current scaffold)
- [ ] **API mount table:** needs `/webhooks`, `/me`, `/keys`, `/connections`, `/desktop` routes added

---

## Feature Build Order (from Design Doc 09)

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

## Important Gotchas Discovered This Session

1. **MentraOS has built-in TTS** — `appSession.audio.speak(text)` handles ElevenLabs internally. No need for ElevenLabs API key or custom TTS pipeline. Design Doc 06 overcomplicated this.

2. **Clerk + MentraOS are orthogonal** — Clerk = identity ("who"), MentraOS = hardware session ("which glasses"). They stack, not replace each other.

3. **Bun uses `BUN_PUBLIC_` prefix** (not `VITE_`) to expose env vars to frontend. Set in `bunfig.toml` via `env = "BUN_PUBLIC_*"`.

4. **@hono/clerk-auth@3.1.0** exists — official Clerk middleware for Hono. Use `clerkMiddleware()` + `getAuth(c)`. No custom `middleware/auth.ts` needed.

5. **gcloud install on macOS** needs a Python symlink fix: `ln -s .../python .../python3` in the Homebrew Python path. Documented in .devops.md.

6. **Convex must be at repo root** — CLI expects `convex/` relative to where you run it. Root-level `convex` dependency required (`bun add convex` at root).

7. **`mentra` CLI binary was corrupted** on first attempt — reinstalling via `bun add -g @mentra/cli` fixed it.

---

## What Was Done This Session

1. Read SPEC.md, SPIKE.md, mentra-mini-app-example
2. Scaffolded entire monorepo (app/, convex/, web/, desktop/, deploy/, scripts/)
3. Created all config files (package.json workspaces, tsconfig, bunfig, .env.example, .gitignore)
4. Scaffolded backend: ClawedChat.ts, UserSession.ts, all API routes, all services, voice manager
5. Scaffolded frontend: index.html, frontend.tsx, App.tsx, index.css, pages/components READMEs
6. Created Convex schema + server functions (users, instances, apiKeys)
7. Created isaiah.md (setup checklist), .devops.md (setup log), README.md
8. Installed CLIs: gcloud, pulumi, convex, mentra
9. Created MentraOS app: `com.isaiah.clawed` (MICROPHONE + CAMERA)
10. Created GCP project: `clawed-chat` (billing, APIs, SA, firewall)
11. Authed: Pulumi (isaiahb), Convex (project created, schema pushed)
12. Got Clerk keys, installed `@clerk/clerk-react` + `@hono/clerk-auth`
13. Read design docs 01-09, updated isaiah.md with Composio/encryption/webhook sections
14. Corrected: MentraOS has built-in TTS (no ElevenLabs needed)
15. All committed and pushed to `origin/isaiah`

---

## Next Priorities (for next session)

### Isaiah (human) still needs to do:
1. Browser Use — sign up, get API key
2. Cloudflare — zone ID + API token
3. Composio — API key + auth configs
4. Generate secrets: `openssl rand -hex 32` (×2 for KEY_ENCRYPTION_SECRET + COOKIE_SECRET)
5. ngrok static URL → update Mentra app

### Agents can work on (parallel tracks):
1. **Frontend Dashboard** — deploy flow, instance cards, chat panel, Browser Use iframe, Clerk `<ClerkProvider>` + `<MentraAuthProvider>` stacking
2. **Service Wiring** — uncomment + implement real API calls in all service files
3. **Design Doc Alignment** — apply corrections from 09-alignment-notes.md (move UserSession, add missing files, update Convex schema)
4. **Bake Image Script** — write `scripts/bake-image/bake.sh` (Ubuntu 24.04 + Docker + OpenClaw)
5. **Landing Page** — build `web/` (low priority but independent)

---

*Last updated: 2026-03-01 (session 1)*