# api/ — Route Definitions

> Every file in this folder is a Hono sub-app mounted in `index.ts`.

## Conventions

- **Naming:** `<feature>.api.ts`
- **Structure:** routes declared at top, handler functions at bottom
- **Mount table:** `index.ts` is ONLY a mount table — no logic, no middleware, just `.route()` calls
- **One sub-app per file:** each file exports a `Hono` instance as `default`

## Example Shape

```ts
import {Hono} from "hono"
import type {Context} from "hono"

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/create", createInstance)
app.get("/:id", getInstance)

// ─── Handlers ────────────────────────────────────────────────────────────────

async function createInstance(c: Context) {
  // ...
}

async function getInstance(c: Context) {
  // ...
}

export default app
```

## Current Routes

| File | Mount | Endpoints |
|------|-------|-----------|
| `instances.api.ts` | `/instances` | `POST /create`, `GET /:id`, `POST /:id/stop`, `DELETE /:id` |
| `chat.api.ts` | `/chat` | `POST /:instanceId` |
| `glasses.api.ts` | `/glasses` | `POST /voice`, `GET /stream/transcription` |

## Style

- No semicolons
- Double quotes
- Trailing commas
- `{thing}` not `{ thing }`
