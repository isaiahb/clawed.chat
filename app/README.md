# app/ — clawed.chat MentraOS Mini App

> The main product. A Bun + Hono fullstack server that serves the dashboard, API, and MentraOS glasses routes.

## What This Is

This is a **MentraOS Mini App** — a single Bun server that:

1. **Serves the dashboard** (React frontend via Bun's fullstack dev server)
2. **Runs the API** (Hono routes for instance management, chat proxy, glasses)
3. **Connects to Mentra smart glasses** (via `@mentra/sdk` AppServer lifecycle)

The glasses, the web dashboard, and the desktop app are all just clients hitting this same server.

## Running

```bash
# from repo root
bun install
bun run dev        # runs app workspace

# or from this directory
bun run dev
```

Requires a `.env` file — see `../.env.example` for all variables.

MentraOS needs a public URL. In a separate terminal:
```bash
ngrok http --url=<your-static-url> 3000
```

## Architecture

```
src/
├── index.ts                  ← Bun.serve() entry point
├── env.d.ts                  ← type declarations
├── backend/
│   ├── ClawedChat.ts         ← AppServer subclass (glasses lifecycle)
│   ├── UserSession.ts        ← per-user state (glasses + instance ref)
│   ├── api/
│   │   ├── index.ts          ← mount table (routes only)
│   │   ├── instances.api.ts  ← deploy, stop, destroy
│   │   ├── chat.api.ts       ← proxy messages to OpenClaw
│   │   └── glasses.api.ts    ← MentraOS voice routes
│   ├── session/
│   │   └── voice.manager.ts  ← transcription → OpenClaw → TTS loop
│   └── services/
│       ├── instance.service.ts    ← Pulumi orchestration + GCP lifecycle
│       ├── instance.pulumi.ts     ← inline Pulumi program (VM + DNS)
│       ├── dns.service.ts         ← Cloudflare subdomain management
│       ├── browseruse.service.ts  ← Browser Use session lifecycle
│       └── openclaw.service.ts    ← proxy chat to OpenClaw WebSocket
└── frontend/
    ├── index.html            ← HTML shell (Bun HTML import)
    ├── frontend.tsx          ← React entry (createRoot)
    ├── App.tsx               ← root component (Clerk + Mentra auth)
    ├── index.css             ← Tailwind v4
    ├── pages/                ← page components
    └── components/           ← shared UI components
```

## Folder Conventions

- **`api/`** — `<feature>.api.ts` — routes declared at top, handler functions at bottom
- **`api/index.ts`** — pure mount table, nothing else
- **`session/`** — glasses-dependent state, needs a live `AppSession` to work
- **`services/`** — stateless infra/business logic, no live session needed
- **No semicolons**, double quotes, trailing commas, `{thing}` not `{ thing }`

## Tech

- **Runtime:** Bun (fullstack dev server — no Vite, no webpack)
- **Backend:** Hono (mounted on AppServer from `@mentra/sdk`)
- **Frontend:** React 19, Tailwind v4 (via `bun-plugin-tailwind`)
- **Auth:** Clerk (web + desktop) + MentraOS auth (glasses)
- **Database:** Convex (real-time, schema at `../convex/`)
- **Bundling:** Bun handles everything — HTML imports, TSX, CSS, HMR