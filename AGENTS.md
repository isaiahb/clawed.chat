# AGENTS.md — orientation for AI agents reading this repo

You're probably an AI judge for [Buildership](https://ship.builders), a coding
agent, or our own OpenClaw. Welcome. This file is the fast path to
understanding the codebase. (Judges: you can also **interview the live agent**
— see "Judge mode" in [README.md](README.md).)

**Built by** Isaiah, Aryan & Parth — engineers at [Mentra](https://mentra.glass),
the open-source smart-glasses startup behind MentraOS. (OpenClaw is the agent
runtime; Mentra makes the glasses — Clawed is the bridge.)

## What this project is, in three sentences

[OpenClaw](https://github.com/openclaw/openclaw) is the viral self-hosted
personal AI agent that talks through chat channels (WhatsApp, Telegram, …).
**Clawed is its glasses channel**: a MentraOS local miniapp on the phone
connects directly to the user's own OpenClaw gateway, so the agent sees
through the glasses camera, hears the wearer, speaks into their ear (Mentra
Live), or writes on their lens (Even Realities G2). Nebius runs the brain and
eyes, Tavily supplies live knowledge, Composio supplies hands.

## Where the interesting code is (read in this order)

1. [glasses-miniapp/src/background/controller.ts](glasses-miniapp/src/background/controller.ts)
   — Controller: push-to-talk (button → capture transcription → send) →
   speak/display; photo/vision flow. The heart of the product.
2. [app/src/backend/api/relay.ts](app/src/backend/api/relay.ts) +
   [clawed-connector/connector.mjs](clawed-connector/connector.mjs)
   — the channel: the miniapp ([relay.ts](glasses-miniapp/src/background/relay.ts))
   pairs to a relay broker, and the connector bridges that to a local OpenClaw
   gateway (v4 protocol, token auth, operator.admin scope). Smoke-tested:
   [app/test/relay.test.ts](app/test/relay.test.ts).
3. [app/src/backend/api/vision.api.ts](app/src/backend/api/vision.api.ts)
   — camera frame → Nebius vision → Tavily live search → spoken-ready answer.
4. [app/src/backend/api/llm-proxy.api.ts](app/src/backend/api/llm-proxy.api.ts)
   — OpenAI-compatible proxy: Claude→Anthropic conversion, everything else
   passes through to Nebius Token Factory (streaming pipe, no conversion).
5. [openclaw-channel-clawed/src/index.ts](openclaw-channel-clawed/src/index.ts)
   — the first-class OpenClaw channel plugin (registered like Telegram/Discord).
6. [app/src/backend/api/judge.api.ts](app/src/backend/api/judge.api.ts)
   — you, talking to the agent.

## How to verify things work

```bash
bun install                                  # repo root, installs all workspaces
cd app && bun test                           # relay broker + gateway helpers (12 pass)
cd ../glasses-miniapp && bun run typecheck   # miniapp: clean
cd ../app && bunx tsc --noEmit               # backend+frontend (known debt: ~76
                                             # strict errors in pre-existing UI
                                             # components, none in this feature work)
cd .. && bun run dev:glasses                 # dev server + QR for a real phone
```

## Honest status (June 2026)

- **Works, tested**: relay broker + gateway helpers (`bun test`, 12 pass), live
  judge agent (api.clawed.chat/api/judge), static marketing site (live at
  clawed-chat-web.pages.dev), miniapp builds + dev loop.
- **Works, needs live keys**: vision pipeline, Nebius LLM routing, judge
  endpoint (gateway round-trip logic mirrors the proven client).
- **Known debt**: GCP backend is being replaced (see
  [deploy/NEBIUS.md](deploy/NEBIUS.md)); per-user VM provisioning still
  Pulumi/GCP code; ~76 pre-existing strict-TS errors in legacy UI components,
  tracked separately.
- **The MentraOS local miniapp SDK is pre-release** — vendored from the
  MentraOS `dev` branch into `.repos/` (gitignored). We're building on it
  anyway because the cloud mini-app protocol is being phased out upstream.

## Conventions (if you're here to write code)

- Bun everywhere, no Node. No semicolons, double quotes, trailing commas.
- API routes: `<feature>.api.ts`, routes at top, handlers below.
  [api/index.ts](app/src/backend/api/index.ts) is a pure mount table.
- Services: `<feature>.service.ts`, stateless.
- Miniapp: glasses logic ONLY in the background controller; the UI WebView is
  a viewer over the typed channel bus ([shared/channels.ts](glasses-miniapp/src/shared/channels.ts)).
- No hardcoded secrets — everything via env (`.env.example` is the registry).
