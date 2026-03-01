# Clawed Chat — Communication Flow Documentation

This document explains **exactly** how the local Clawed Chat application communicates with the OpenClaw Gateway, how voice queries flow from glasses to response, and how the wake word detection system works. Everything your friend needs to implement or extend this system is here.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Variables (Required)](#environment-variables)
3. [OpenClaw Gateway Connection](#openclaw-gateway-connection)
4. [Sending & Receiving Messages](#sending--receiving-messages)
5. [Wake Word Detection System](#wake-word-detection-system)
6. [Transcription Manager & SSE Broadcasting](#transcription-manager--sse-broadcasting)
7. [Full Voice Query → Response Flow](#full-voice-query--response-flow)
8. [Text-to-Speech (TTS)](#text-to-speech)
9. [Session Lifecycle](#session-lifecycle)
10. [API Endpoints Reference](#api-endpoints-reference)
11. [Error Handling](#error-handling)
12. [File Reference](#file-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MentraOS Glasses                           │
│  (Transcription events, Audio playback, Camera, Touch input)    │
└────────────────────────────┬────────────────────────────────────┘
                             │ MentraOS SDK (WebSocket)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Bun Server (localhost:3000)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ CameraApp    │  │ TranscriptionMgr │  │ OpenClaw Proxy   │  │
│  │ (SDK hooks)  │  │ + WakeWordDetect │  │ (WS ↔ Gateway)   │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                   │ SSE                  │ WebSocket   │
│         │                   ▼                      ▼             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Hono API Routes                        │   │
│  │  /api/transcription-stream (SSE)                          │   │
│  │  /api/photo-stream (SSE)                                  │   │
│  │  /api/openclaw-ws (WebSocket upgrade)                     │   │
│  │  /api/speak, /api/wake-word-unlock, /api/health           │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + WebSocket + SSE
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               React Frontend (at /app)                          │
│                                                                 │
│  useOpenClaw() hook ←→ WebSocket /api/openclaw-ws               │
│  SSE EventSource  ←── /api/transcription-stream                 │
│  SSE EventSource  ←── /api/photo-stream                         │
│  fetch()          ──→ /api/speak, /api/wake-word-unlock         │
└─────────────────────────────────────────────────────────────────┘
                             │ WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenClaw Gateway (ws://127.0.0.1:18789)            │
│              (Claude AI agent runtime)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

These must be set in `.env` at the project root:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PACKAGE_NAME` | **Yes** | — | MentraOS app package identifier |
| `MENTRAOS_API_KEY` | **Yes** | — | MentraOS SDK authentication token |
| `OPENCLAW_GATEWAY_URL` | No | `ws://127.0.0.1:18789` | OpenClaw Gateway WebSocket URL |
| `OPENCLAW_GATEWAY_TOKEN` | No | `""` | Gateway authentication token |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | — | Set to `"development"` for HMR |
| `COOKIE_SECRET` | No | `MENTRAOS_API_KEY` | Session cookie secret |
| `TTS_VOICE_ID` | No | `""` | ElevenLabs voice ID for TTS |
| `WAKE_START_SOUND` | No | `""` | Audio URL played when query is submitted |
| `WAKE_QUERY_SOUND` | No | `""` | Audio URL played when wake word is detected |

---

## OpenClaw Gateway Connection

The frontend **never** talks directly to the Gateway. All communication goes through a server-side WebSocket proxy at `/api/openclaw-ws`. This keeps the Gateway token secret.

### Connection Sequence

```
Frontend                    Bun Server (Proxy)              OpenClaw Gateway
   │                              │                               │
   │──── WS connect ──────────────►                               │
   │     /api/openclaw-ws         │                               │
   │                              │──── WS connect ───────────────►
   │                              │     ws://127.0.0.1:18789      │
   │                              │                               │
   │                              │◄─── connect.challenge ────────│
   │                              │     { nonce: "abc123" }       │
   │                              │                               │
   │                              │ (Server builds signed auth    │
   │                              │  payload — Ed25519 signature) │
   │                              │                               │
   │                              │──── connect request ──────────►
   │                              │     (see auth payload below)  │
   │                              │                               │
   │                              │◄─── hello-ok ─────────────────│
   │                              │     { protocol: 3 }           │
   │                              │                               │
   │◄─── proxy.authenticated ─────│                               │
   │     { protocol: 3 }         │                               │
   │                              │  (flush buffered messages)    │
   │                              │                               │
   │     *** READY TO SEND ***    │                               │
```

### Authentication Payload (v3 Protocol)

The server signs a payload using an Ed25519 keypair stored at `~/.clawed-chat/device-identity.json`. This is auto-generated on first startup.

**Signature payload** (pipe-delimited string that gets signed):
```
v3|{deviceId}|gateway-client|backend|operator|operator.admin|{signedAtMs}|{GATEWAY_TOKEN}|{nonce}|{platform}|
```

**Connect request sent to Gateway:**
```json
{
  "type": "req",
  "id": "connect-1709234567890",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "gateway-client",
      "version": "1.0.0",
      "platform": "darwin",
      "mode": "backend"
    },
    "role": "operator",
    "scopes": ["operator.admin"],
    "caps": [],
    "auth": {
      "token": "deda259aff0dcac8117391c18422c96971e144883263d49f"
    },
    "device": {
      "id": "sha256_fingerprint_of_public_key",
      "publicKey": "base64url_encoded_raw_ed25519_public_key",
      "signature": "base64url_ed25519_signature",
      "signedAt": 1709234567890,
      "nonce": "nonce_from_challenge"
    }
  }
}
```

### Proxy Messages (Server → Frontend)

These are NOT from the Gateway — they're injected by the proxy:

| Message | Meaning |
|---|---|
| `{ type: "proxy.authenticated", protocol: 3 }` | Auth succeeded, ready to send |
| `{ type: "proxy.auth_failed", error: "..." }` | Auth failed |
| `{ type: "proxy.disconnected", code: 1006, reason: "..." }` | Gateway connection lost |

---

## Sending & Receiving Messages

### RPC Protocol

All communication with the Gateway uses a JSON-RPC-style protocol over WebSocket.

**Request format (Frontend → Gateway via Proxy):**
```json
{
  "type": "req",
  "id": "req-1709234567890-1",
  "method": "chat.send",
  "params": { ... }
}
```

**Response format (Gateway → Frontend via Proxy):**
```json
{
  "type": "res",
  "id": "req-1709234567890-1",
  "ok": true,
  "payload": { ... }
}
```

**Error response:**
```json
{
  "type": "res",
  "id": "req-1709234567890-1",
  "ok": false,
  "error": "Something went wrong"
}
```

### Sending a Chat Message

**Method:** `chat.send`

```json
{
  "type": "req",
  "id": "req-1709234567890-1",
  "method": "chat.send",
  "params": {
    "sessionKey": "clawed-1709234567890",
    "message": "what time is it right now?",
    "deliver": false,
    "idempotencyKey": "req-1709234567891-2"
  }
}
```

- **`sessionKey`**: Unique per WebSocket connection, format `clawed-{timestamp}`. Created when status becomes `"connected"`. Sessions are implicit — the Gateway creates one on first `chat.send`.
- **`message`**: The user's text query.
- **`deliver`**: Set to `false` (manual delivery mode).
- **`idempotencyKey`**: Unique key to prevent duplicate processing.

### Receiving Chat Events (Streaming Response)

The Gateway sends events as the AI generates a response:

```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "runId": "run_abc123",
    "sessionKey": "clawed-1709234567890",
    "seq": 1,
    "state": "delta",
    "message": {
      "role": "assistant",
      "content": [
        { "type": "text", "text": "The current time is" }
      ],
      "timestamp": "2024-03-01T12:00:00Z"
    }
  }
}
```

**Important:** Each `delta` contains the **full accumulated text** so far, not an incremental chunk. So delta 1 might be `"The"`, delta 2 might be `"The current time"`, delta 3 might be `"The current time is 3:00 PM"`.

### Chat Event States

| State | Meaning | What to do |
|---|---|---|
| `delta` | Partial response (streaming) | Update streaming display with `payload.message.content[0].text` |
| `final` | Response complete | Save as assistant message, unlock wake word, speak aloud |
| `error` | Request failed | Show error UI, unlock wake word |
| `aborted` | User cancelled mid-stream | Save partial content (if any), unlock wake word |

### Aborting a Response

**Method:** `chat.abort`

```json
{
  "type": "req",
  "id": "req-1709234567892-3",
  "method": "chat.abort",
  "params": {
    "sessionKey": "clawed-1709234567890"
  }
}
```

### Request Timeout

All RPC requests have a **30-second timeout**. If no response is received, the pending request is rejected with `"Request {method} timed out"`.

---

## Wake Word Detection System

**File:** `src/server/manager/WakeWordDetector.ts`

The wake word detector listens to all final transcriptions from the glasses and activates when it hears specific phrases.

### Activation Phrases

These are all **case-insensitive** and allow optional punctuation/whitespace between words (e.g., "hey, claude" or "hey  claude" both match):

| Phrase | Why included |
|---|---|
| `"hey claude"` | Primary trigger |
| `"hey cloud"` | Common mis-transcription |
| `"hey claud"` | Partial transcription |
| `"a claude"` | Garbled transcription |
| `"hey clawed"` | Phonetic variant |
| `"hey claw"` | Short variant |
| `"ok claude"` | Alternative trigger |
| `"okay claude"` | Alternative trigger |
| `"Hey Klaa"` | Another mis-transcription |

### Detection Flow

```
Step 1: User speaks "Hey Claude, what time is it?"
        │
        ▼
Step 2: Glasses transcription engine sends final text
        │
        ▼
Step 3: WakeWordDetector.process("Hey Claude, what time is it?", isFinal=true)
        │
        ▼
Step 4: Regex matches "hey claude" → captures ", what time is it?"
        │
        ▼
Step 5: Clean captured text → "what time is it?"
        │
        ▼
Step 6: Set active=true, push to queryParts[]
        │
        ▼
Step 7: Fire onWakeDetected() callback (plays WAKE_QUERY_SOUND on glasses)
        │
        ▼
Step 8: Start 2-second silence timer
        │
        ├── If MORE transcriptions arrive within 2 seconds:
        │   append to queryParts[], reset timer
        │
        └── If NO transcriptions for 2 seconds:
            │
            ▼
Step 9: finalizeQuery()
        - Join all queryParts with spaces
        - Set active=false, processing=true (LOCKED)
        - Fire onQueryReady("what time is it?")
        │
        ▼
Step 10: Query is broadcast to frontend via SSE
         Wake word detection is LOCKED until response completes
```

### Silence Timeout

The silence timeout is **2000ms** (2 seconds). This means:

- After the wake word is detected, the system waits for 2 seconds of silence before finalizing the query.
- Every new final transcription resets the 2-second timer.
- This allows multi-sentence queries: "Hey Claude, what's the weather... also what time is it" would be captured as one query if the gap between sentences is less than 2 seconds.

### Lock Mechanism

After a query is finalized:
1. `processing = true` — the detector ignores all new transcriptions
2. The query is sent to OpenClaw for processing
3. When the response is final/error/aborted, the frontend calls `POST /api/wake-word-unlock`
4. This sets `processing = false` — the detector starts listening again

### Wake Word Restart

If the user says the wake word **again** while a query is already being accumulated (but before the 2-second silence), the query resets:

```
"Hey Claude, what time is... Hey Claude, what's the weather?"
                              ↑ restart — previous query discarded
Final query: "what's the weather?"
```

---

## Transcription Manager & SSE Broadcasting

**File:** `src/server/manager/TranscriptionManager.ts`

The TranscriptionManager bridges the MentraOS SDK transcription events to the frontend via Server-Sent Events (SSE).

### SSE Client Connection

Frontend connects to `GET /api/transcription-stream?userId={email}` and receives:

**Initial handshake:**
```json
{ "type": "connected", "userId": "user@example.com" }
```

**Every transcription event from glasses:**
```json
{
  "text": "Hey Claude what time is it",
  "isFinal": true,
  "timestamp": 1709234567890,
  "userId": "user@example.com"
}
```

**Voice query (after wake word + silence timeout):**
```json
{
  "type": "voice-query",
  "query": "what time is it",
  "timestamp": 1709234567890,
  "userId": "user@example.com"
}
```

### What the Frontend Does with `voice-query`

When the frontend receives a `voice-query` SSE event:

1. Calls `handleSubmit("what time is it")` — passes text directly as a parameter
2. Creates a new conversation (or appends to active one)
3. Sends `chat.send` to OpenClaw via WebSocket
4. Shows "thinking" UI with action indicator

**Important implementation detail:** The text is passed directly to `handleSubmit(overrideText)` instead of setting React state, to avoid a stale closure race condition.

### Audio Notifications on Wake Word

| Event | Sound Played | Track |
|---|---|---|
| Wake word detected | `WAKE_QUERY_SOUND` env var | trackId: 1 (app_audio) |
| Query finalized & submitted | `WAKE_START_SOUND` env var | trackId: 1 (app_audio) |

---

## Full Voice Query → Response Flow

Here's the complete end-to-end flow:

```
1. USER SPEAKS: "Hey Claude, what time is it right now?"
   │
   ▼
2. GLASSES: Transcription engine produces final text
   │
   ▼
3. SERVER: TranscriptionManager.setup() listener fires
   ├── Broadcasts transcription to SSE clients (for live display)
   └── Feeds to WakeWordDetector.process()
       │
       ▼
4. WAKE WORD DETECTOR:
   ├── Regex matches "hey claude"
   ├── Extracts query: "what time is it right now?"
   ├── Plays WAKE_QUERY_SOUND on glasses
   └── Starts 2-second silence timer
       │
       ▼ (2 seconds of silence)
       │
5. QUERY FINALIZED:
   ├── processing = true (detection locked)
   ├── Plays WAKE_START_SOUND on glasses
   └── broadcastVoiceQuery("what time is it right now?")
       │
       ▼
6. SSE BROADCAST: { type: "voice-query", query: "what time is it right now?" }
   │
   ▼
7. FRONTEND (AskPage):
   ├── Receives SSE event
   ├── Calls handleSubmit("what time is it right now?")
   ├── Creates user message in conversation
   ├── Sets isThinking = true
   ├── Starts action indicator animation
   └── Calls sendMessage("what time is it right now?")
       │
       ▼
8. useOpenClaw HOOK:
   └── Sends WebSocket message:
       {
         type: "req",
         method: "chat.send",
         params: {
           sessionKey: "clawed-1709234567890",
           message: "what time is it right now?",
           deliver: false,
           idempotencyKey: "req-1709234567891-5"
         }
       }
       │
       ▼
9. SERVER PROXY (openclaw.ts):
   └── Forwards to Gateway WebSocket at ws://127.0.0.1:18789
       │
       ▼
10. OPENCLAW GATEWAY: Processes query with Claude AI
    │
    ▼
11. GATEWAY RESPONDS (streaming):
    ├── { event: "chat", payload: { state: "delta", message: { content: [{ text: "The current" }] } } }
    ├── { event: "chat", payload: { state: "delta", message: { content: [{ text: "The current time is" }] } } }
    └── { event: "chat", payload: { state: "final", message: { content: [{ text: "The current time is 3:00 PM." }] } } }
        │
        ▼
12. SERVER PROXY: Forwards each event to frontend WebSocket
    │
    ▼
13. FRONTEND onDelta HANDLER:
    ├── delta: Update streaming content display
    └── final:
        ├── Save assistant message to conversation
        ├── Set isThinking = false
        ├── Stop action indicator
        ├── POST /api/wake-word-unlock  ──► WakeWordDetector.unlock()
        │                                   (processing = false, ready for next query)
        └── POST /api/speak { text: "The current time is 3:00 PM." }
            │
            ▼
14. SERVER: AudioManager.speak("The current time is 3:00 PM.")
    └── session.audio.speak(text, { voice_id: TTS_VOICE_ID })
        │
        ▼
15. GLASSES: Speak response aloud via ElevenLabs TTS
    │
    ▼
16. DONE — Wake word detector is unlocked, user can speak again
```

---

## Text-to-Speech

**File:** `src/server/manager/AudioManager.ts`

### How TTS Works

When a response is finalized, the frontend calls `POST /api/speak` with the response text. The server uses the MentraOS SDK to speak it on the glasses via ElevenLabs.

**Voice Configuration:**
- Set `TTS_VOICE_ID` in `.env` to an ElevenLabs voice ID
- If not set, uses ElevenLabs default voice
- The SDK's `SpeakOptions` also supports: `model_id`, `voice_settings` (stability, similarity_boost, style, speed)

**Audio Tracks:**
| Track ID | Name | Purpose |
|---|---|---|
| 0 | speaker | Default audio playback |
| 1 | app_audio | Sound effects (wake word sounds) |
| 2 | tts | Text-to-speech output |

Sound effects use `trackId: 1` and TTS uses `trackId: 2` (SDK default), so they don't interrupt each other.

---

## Session Lifecycle

### How Users Are Created & Managed

```
Glasses connect (MentraOS SDK)
    │
    ▼
CameraApp.onSession(session, sessionId, userId)
    │
    ▼
SessionManager.getOrCreate(userId)
    ├── First time: Create new User with all managers
    └── Reconnect: Return existing User (keeps SSE clients, state)
    │
    ▼
User.setAppSession(session)
    ├── TranscriptionManager.setup(session)  — wire up transcription listener
    └── InputManager.setup(session)          — wire up button/touch listener


Glasses disconnect
    │
    ▼
CameraApp.onStop(sessionId, userId, reason)
    │
    ▼
User.clearAppSession()
    ├── TranscriptionManager.detachSession()  — remove SDK listener ONLY
    │   (SSE clients and WakeWordDetector stay alive!)
    └── appSession = null


Glasses reconnect
    │
    ▼
CameraApp.onSession(session, sessionId, userId)
    │
    ▼
SessionManager.getOrCreate(userId)  — returns SAME User object
    │
    ▼
User.setAppSession(session)  — re-attaches SDK listeners
```

**Key design decision:** When glasses disconnect, we do NOT destroy the user. The SSE clients (frontend connections) and wake word state survive across glasses reconnects. This prevents the frontend from losing its connection just because the glasses had a brief network hiccup.

---

## API Endpoints Reference

### WebSocket

| Endpoint | Description |
|---|---|
| `GET /api/openclaw-ws` | WebSocket upgrade — proxy to OpenClaw Gateway |

### SSE Streams

| Endpoint | Description |
|---|---|
| `GET /api/transcription-stream?userId={id}` | Real-time transcriptions + voice-query events |
| `GET /api/photo-stream?userId={id}` | Real-time photo capture events |

### REST

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/speak` | POST | Text-to-speech on glasses. Body: `{ text, userId }` |
| `/api/stop-audio` | POST | Stop audio playback. Body: `{ userId }` |
| `/api/wake-word-unlock` | POST | Re-enable wake word detection. Query: `?userId={id}` |
| `/api/latest-photo` | GET | Get most recent photo |
| `/api/photo/:requestId` | GET | Get photo by request ID |
| `/api/photo-base64/:requestId` | GET | Get photo as base64 |
| `/api/theme-preference` | GET/POST | Read/write theme preference |
| `/api/mentra/auth/*` | POST | MentraOS token exchange |

---

## Error Handling

### Gateway Auth Failure
- Server logs: `[OpenClaw] Auth failed: {error}`
- Frontend receives: `{ type: "proxy.auth_failed", error: "..." }`
- Frontend status changes to `"disconnected"`
- Auto-reconnects after 3 seconds

### Gateway Disconnect
- Server logs: `[OpenClaw] Gateway disconnected: {code} {reason}`
- Frontend receives: `{ type: "proxy.disconnected", code, reason }`
- All pending RPC requests rejected with `"Connection closed"`
- Auto-reconnects after 3 seconds

### RPC Request Timeout
- After 30 seconds with no response
- Error emitted as ChatDelta: `{ state: "error", text: "Failed to send: Request chat.send timed out" }`

### SSE Connection Loss
- Frontend `onerror` handler closes and reconnects after 3 seconds
- Server-side: failed async writes auto-remove dead SSE clients

### Glasses Session Loss
- `AudioManager.playAudio()` silently fails (logs warning, doesn't throw)
- `AudioManager.speak()` throws if no session — caught by API handler, returns 500
- Wake word detection pauses until glasses reconnect (no transcription events)
- SSE clients stay alive — frontend stays connected

---

## File Reference

| File | Purpose |
|---|---|
| `src/index.ts` | Server entry point — mounts routes, starts Bun server |
| `src/server/CameraApp.ts` | MentraOS AppServer — `onSession`/`onStop` hooks |
| `src/server/api/openclaw.ts` | WebSocket proxy to OpenClaw Gateway — auth handshake, message forwarding |
| `src/server/api/stream.ts` | SSE endpoints — transcription-stream, photo-stream, wake-word-unlock |
| `src/server/api/audio.ts` | TTS and audio control endpoints |
| `src/server/routes/routes.ts` | Hono route definitions |
| `src/server/session/User.ts` | Per-user state container — all managers composed here |
| `src/server/manager/SessionManager.ts` | User lookup — `Map<userId, User>` |
| `src/server/manager/TranscriptionManager.ts` | Transcription listener + SSE broadcast + voice query broadcast |
| `src/server/manager/WakeWordDetector.ts` | Wake word regex matching, query accumulation, silence timeout |
| `src/server/manager/AudioManager.ts` | TTS and audio playback via MentraOS SDK |
| `src/frontend/lib/useOpenClaw.ts` | React hook — WebSocket RPC client for OpenClaw |
| `src/frontend/pages/app/AskPage.tsx` | Main chat UI — handles deltas, voice queries, conversation state |
