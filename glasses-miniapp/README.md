# glasses-miniapp/ — Clawed, the glasses channel for OpenClaw

> A MentraOS **local miniapp**: runs on the phone inside the MentraOS app, talks
> **directly** to your own OpenClaw gateway over WebSocket. No webhook server,
> no ngrok, no middleman cloud.

## What it does

- **Hears you** — `session.transcription` listens for "Hey Clawed, …" and sends
  the command to your OpenClaw over the gateway protocol (v3, token auth).
- **Sees for you** — "What am I looking at?" (or the glasses button) grabs a
  camera frame and runs it through the vision pipeline
  (`/api/vision` → Nebius vision model → Tavily live web lookup).
- **Answers in your world** — replies stream to the lens as text
  (`session.display.showTextWall`, Even Realities G2) and are spoken aloud
  (`session.speaker.speak`, Mentra Live). Both fire; the host no-ops whatever
  surface the glasses lack.
- **Phone UI** — a chat thread + settings WebView. The background layer is the
  brain; the UI is a viewer (controller pattern per the SDK reference app).

## Architecture (two-layer local miniapp)

```
┌─ MentraOS app (phone) ──────────────────────────────┐
│  background JSContext (always-on)                   │
│    AgentController ── GatewayClient ──── WebSocket ─┼──► your OpenClaw gateway
│      │ transcription/camera/display/speaker         │       (ws://…:18789)
│      │ typed channel bus                            │
│  UI WebView (on-demand)                             │
│    chat thread + gateway settings                   │
└─────────────────────────────────────────────────────┘
         └── camera frames ──► clawed.chat /api/vision (Nebius + Tavily)
```

Key files:

| File | What |
| --- | --- |
| `src/background/controller.ts` | Controller — push-to-talk capture, vision/photo flow, output routing |
| `src/background/relay.ts` | RelayClient — pairs to the relay broker, JSON message stream |
| `src/shared/channels.ts` | Typed UI↔background channel registry |
| `src/ui/App.tsx` | Pair + Live screens (push-to-talk + photo) |
| `miniapp.json` | Manifest: MICROPHONE + CAMERA permissions, all glasses surfaces optional |

## Dev loop

The SDK is vendored from the MentraOS `dev` branch at `../.repos/MentraOS`
(not yet on npm). One-time setup builds it automatically:

```bash
cd glasses-miniapp
bun install        # postinstall builds @mentra/miniapp from the vendored source
bun run dev        # validates manifest, builds, serves over LAN, prints QR
```

On your phone: **Mentra app → Settings → Developer settings → Mini App
Development → Scan Mini App QR Code** (same Wi-Fi). Hot reloads on save.

Other commands: `bun run build` (one-shot), `bun run typecheck`,
`bun run pack` (release zip).

## Connecting to an OpenClaw

Open the miniapp UI → settings → enter your gateway URL + token:

- **LAN** (Mac mini / home server): `ws://192.168.x.x:18789`
- **Cloud VM** (clawed.chat-provisioned): `ws://<vm-ip>:18789`

Token-only auth — no Ed25519 device pairing needed. The connect request uses
`client.id: "gateway-client"` (one of OpenClaw's allowed `GATEWAY_CLIENT_IDS`).
