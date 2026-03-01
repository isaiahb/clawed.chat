# desktop/ — ElectroBun Desktop Companion App

> Native macOS/Windows/Linux desktop app for users who want to run OpenClaw on their own hardware.

## What This Is

A lightweight desktop app built with [ElectroBun](https://blackboard.sh/electrobun/docs/) that:

1. Signs in with Clerk (same clawed.chat account as the web dashboard)
2. Installs and configures OpenClaw on the local machine
3. Establishes a Cloudflare Tunnel back to clawed.chat backend
4. Reports machine status to the clawed.chat dashboard (appears alongside cloud instances)
5. Enables macOS-specific features (iMessage, native voice, Apple ecosystem)
6. Auto-updates both itself and OpenClaw via ElectroBun's bsdiff updater

## Why ElectroBun

| Feature | ElectroBun | Electron | Tauri |
|---------|-----------|----------|-------|
| Bundle size | ~14MB | ~150MB+ | ~10MB |
| Startup time | <50ms | ~500ms+ | ~100ms |
| Runtime | **Bun** (same as our backend) | Node.js | Rust |
| Webview | System native | Bundled Chromium | System native |
| Auto-updates | Built-in bsdiff (patches as small as 14KB) | electron-updater | Custom |
| Native bindings | C++, ObjC, Zig | C++ via N-API | Rust |
| Maturity | v1.0 (Feb 6, 2026) | Very mature | Mature |

**Key win:** Same Bun runtime as the backend — no context switching, shared TypeScript types.

## Hackathon Priority

**Medium-Low.** This is:

- A **fallback demo path** if cloud provisioning has issues during the live demo
- A **standalone deliverable** for Mac users who don't want cloud hosting
- **Not the primary demo** — cloud deploy + smart glasses is the main show

For the hackathon, it just needs:
1. Sign in with Clerk
2. Install OpenClaw locally
3. Show machine status in the dashboard
4. Maybe establish a tunnel

## Setup (when ready to build)

```bash
bun create electrobun my-app
cd my-app
bun dev    # hot-reload during development
bun build  # produces installer (.dmg, .exe, .AppImage)
```

The webview renders the same React dashboard UI from `app/src/frontend/`, loaded locally. Typed RPC between main process and webview handles native operations (install OpenClaw, manage tunnel, screen capture).

## Structure (planned)

```
desktop/
├── package.json
├── README.md
├── src/
│   ├── main/
│   │   ├── index.ts            ← main process entry
│   │   ├── openclaw.ts         ← install/manage local OpenClaw
│   │   ├── tunnel.ts           ← Cloudflare Tunnel management
│   │   └── native/             ← macOS-specific (ObjC bindings)
│   ├── webview/
│   │   └── index.html          ← loads shared dashboard UI
│   └── rpc/
│       └── schema.ts           ← typed RPC between main ↔ webview
├── electrobun.config.ts
└── assets/
    └── icons/                  ← app icons for macOS/Windows/Linux
```

## Key Dependencies (when ready)

- `electrobun` — framework
- `@clerk/backend` — auth (same as web)
- `cloudflared` — Cloudflare Tunnel binary (bundled or downloaded at runtime)

## Risk

ElectroBun v1 launched three weeks ago. If we hit major issues, scope it down to:
- "Download and install OpenClaw" guide in the dashboard
- Manual tunnel setup instructions
- No native app — just a well-documented CLI flow

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
