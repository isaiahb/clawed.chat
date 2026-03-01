# services/ — Stateless Infrastructure & Business Logic

> Everything in this folder is **stateless** — no live glasses session needed, no per-user in-memory state. Pure functions and class methods that talk to external APIs.

## What Lives Here

| File | Responsibility |
|------|---------------|
| `instance.service.ts` | Orchestrates the full instance lifecycle: deploy, stop, start, destroy. Coordinates between Pulumi, GCP, Cloudflare, Browser Use, and Convex. |
| `instance.pulumi.ts` | The inline Pulumi program that defines per-user infrastructure: GCP VM + Cloudflare DNS record. Used by `instance.service.ts` via Pulumi Automation API. |
| `dns.service.ts` | Cloudflare DNS management — create/delete A records for `<username>.clawed.chat`. |
| `browseruse.service.ts` | Browser Use Cloud session lifecycle — create browser sessions, get `live_url`, tear down sessions. |
| `openclaw.service.ts` | Proxy chat messages to a running OpenClaw instance via WebSocket (`ws://<vm_ip>:18789`). |

## How It Differs From `session/`

| | `services/` | `session/` |
|---|---|---|
| **Needs live glasses?** | No — call from any route handler | Yes — requires `AppSession` |
| **State?** | Stateless — reads from Convex, calls external APIs | Stateful — per-user in-memory managers |
| **Called by** | API route handlers, cron jobs, other services | `UserSession` lifecycle only |

## Conventions

- **Naming:** `<feature>.service.ts`
- Export named functions or a class — whatever makes sense for the service
- Every service function that touches Convex should accept a Convex client as a parameter (dependency injection, not global)
- Keep services focused: one external system per file
- `instance.service.ts` is the orchestrator — it calls the other services

## External Dependencies

| Service | Talks To |
|---------|----------|
| `instance.service.ts` | Pulumi Automation API, Convex |
| `instance.pulumi.ts` | GCP Compute Engine, Cloudflare (via Pulumi providers) |
| `dns.service.ts` | Cloudflare API |
| `browseruse.service.ts` | Browser Use Cloud API |
| `openclaw.service.ts` | OpenClaw Gateway WebSocket |

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
