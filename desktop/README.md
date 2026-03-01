# clawed-chat desktop installer (ElectroBun)

Desktop companion focused on installing and connecting local OpenClaw on macOS.

Current implementation in `desktop/` provides:
- Clerk browser sign-in + deep-link callback stage
- Guided OpenClaw installation and configuration pipeline
- Local instance registration + heartbeat lifecycle in the installer console
- Runtime state transitions (connected/offline/resume)

## Run

```bash
cd desktop
bun install
bun run dev
```

For HMR:

```bash
cd desktop
bun run dev:hmr
```

Build:

```bash
cd desktop
bun run build
```

## Installer flow (implemented)

1. Link account from desktop
2. Install prerequisites and runtimes (Bun + Node 22)
3. Install and onboard OpenClaw
4. Write auth profiles and install channel plugin
5. Verify gateway reachability
6. Register local instance and start heartbeat lifecycle

## Files

- `src/bun/index.ts`: ElectroBun window bootstrap
- `src/mainview/App.tsx`: installer orchestration + UI
- `src/mainview/index.css`: installer visual system

## Outside-desktop handoff spec (for another agent)

The following should be implemented outside `desktop/` to make this fully live:

1. Add desktop token exchange endpoint.
- File(s): backend auth routes in `app/src/backend/api/`
- Contract:
  - `GET /api/auth/desktop-token` (Clerk-authenticated browser session required)
  - Returns one-time token/code (TTL ~60s) for desktop deep-link exchange

2. Add desktop session exchange endpoint.
- Contract:
  - `POST /api/auth/desktop-exchange`
  - Body: `{ code: string, device_name: string }`
  - Returns short-lived desktop bearer token + refresh strategy

3. Allow `/api/desktop/*` to authenticate via desktop bearer token.
- Current desktop routes are Clerk middleware only.
- Add middleware that accepts either:
  - Clerk session (browser/web)
  - Desktop token (native app)

4. Add canonical deep-link callback page in frontend web app.
- File(s): `app/src/frontend/pages/...`
- Purpose:
  - complete Clerk browser auth
  - call `/api/auth/desktop-token`
  - redirect to `clawed-chat://auth?code=<one-time-code>`

5. Extend desktop registration payload and storage.
- Existing `POST /api/desktop/register` currently uses `tunnel_url` only.
- Add fields:
  - `hostname`
  - `os_version`
  - `openclaw_version`
  - `gateway_port`
  - optional `tunnel_url`
- Persist in Convex `instances` metadata fields (schema update required).

6. Heartbeat/offline lifecycle.
- Add `last_heartbeat_at` updates in heartbeat path.
- Add scheduled job to mark local instances `offline` if no heartbeat in >90s.

7. Add backend observability logs for desktop lifecycle.
- Emit structured logs for:
  - desktop auth issued/exchanged
  - register success/failure
  - heartbeat success/stale/offline transitions

8. Optional API for desktop console stream.
- `GET /api/desktop/events` (SSE/WebSocket) to surface backend events in the installer console panel.

## Notes

- The installer intentionally avoids changes outside `desktop/` to prevent merge conflicts with parallel work.

## CI/CD Spec

Desktop build/release spec and scripts are in:
- `desktop/ci/docs/desktop-cicd.md`
- `desktop/ci/workflows/desktop-release.yml`
- `desktop/ci/scripts/*`

Quick path:

```bash
cd desktop
bun run build:release
bun run release:prepare
```
