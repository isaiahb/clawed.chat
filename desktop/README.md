# clawed-chat desktop mock (ElectroBun)

Demo-first desktop companion UI for showing "OpenClaw auto-configures on your Mac/Mac mini".

This implementation is intentionally a full UX mock inside `desktop/` only:
- Mock Clerk browser sign-in + deep-link callback
- Mock local OpenClaw detection/config/plugin install
- Mock backend registration + heartbeat loop
- Live desktop console panel for demo narration

## Run

```bash
cd desktop
bun install
bun run dev:hmr
```

If you do not want HMR:

```bash
cd desktop
bun run dev
```

Build:

```bash
cd desktop
bun run build
```

## Demo flow (implemented)

1. Open app -> "Connect and Auto-Configure"
2. Simulated Clerk auth callback (`clawed-chat://auth?...`)
3. Setup pipeline runs with visible step states
4. Local instance registration appears as success
5. Heartbeat loop continues and logs to console
6. Failure scenario button demonstrates retry UX

## Files

- `src/bun/index.ts`: ElectroBun window bootstrap
- `src/mainview/App.tsx`: full mock orchestration + UI
- `src/mainview/index.css`: clawed-style visual language (dark glass + claw red)

## Outside-desktop handoff spec (for another agent)

The following should be implemented outside `desktop/` to make this fully real:

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
- `GET /api/desktop/events` (SSE/WebSocket) to surface real backend events directly in the desktop console panel.

## Notes

- This mock is demo-safe and deterministic.
- It intentionally avoids changing any non-`desktop/` source to prevent merge conflicts with parallel agent work.

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
