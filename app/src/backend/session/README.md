# session/ — Glasses-Dependent State

> Everything in this folder **requires a live `AppSession`** (active glasses connection) to function.

## What Lives Here

- **`voice.manager.ts`** — The core glasses loop: transcription → OpenClaw → TTS response. Manages SSE broadcasting of transcription events to the dashboard so the webview can show what the user is saying in real time.

## How It Differs From `services/`

| | `session/` | `services/` |
|---|---|---|
| **Needs live glasses?** | Yes — `AppSession` required | No — stateless, call anytime |
| **Per-user state?** | Yes — composed into `UserSession` | No — pure functions / class methods |
| **Examples** | Voice streaming, gesture handling | Pulumi provisioning, DNS, Browser Use API |

## Conventions

- **Naming:** `<feature>.manager.ts`
- Each manager is instantiated by `UserSession` and receives a back-reference to it
- Managers wire up event listeners in `setup(session: AppSession)` and tear them down in `destroy()`
- SSE clients are managed per-manager (add/remove/broadcast pattern from mentra example)

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
