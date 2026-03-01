/**
 * Glasses API — MentraOS voice and transcription routes
 *
 * POST /voice                 → send text to speak on glasses
 * POST /voice/stop            → stop audio playback on glasses
 * GET  /stream/transcription  → SSE stream of live transcriptions
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {streamSSE} from "hono/streaming"
import {UserSession} from "../UserSession"

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/voice", speak)
app.post("/voice/stop", stopAudio)
app.get("/stream/transcription", transcriptionStream)

// ─── Handlers ────────────────────────────────────────────────────────────────

/** POST /voice — text-to-speech on the glasses */
async function speak(c: Context) {
  const {text, userId} = await c.req.json()

  if (!text) return c.json({error: "text is required"}, 400)
  if (!userId) return c.json({error: "userId is required"}, 400)

  const userSession = UserSession.get(userId)
  if (!userSession?.appSession) {
    return c.json({error: `No active glasses session for user ${userId}`}, 404)
  }

  try {
    await userSession.appSession.audio.speak(text)
    return c.json({success: true, message: "Text-to-speech started", userId})
  } catch (error: any) {
    return c.json({error: error.message}, 500)
  }
}

/** POST /voice/stop — stop audio playback on glasses */
async function stopAudio(c: Context) {
  const {userId} = await c.req.json()

  if (!userId) return c.json({error: "userId is required"}, 400)

  const userSession = UserSession.get(userId)
  if (!userSession?.appSession) {
    return c.json({error: `No active glasses session for user ${userId}`}, 404)
  }

  try {
    await userSession.appSession.audio.stopAudio()
    return c.json({success: true, message: "Audio stopped", userId})
  } catch (error: any) {
    return c.json({error: error.message}, 500)
  }
}

/** GET /stream/transcription — SSE stream of live transcriptions from glasses */
function transcriptionStream(c: Context) {
  const userId = c.req.query("userId")
  if (!userId) return c.json({error: "userId query param is required"}, 400)

  const userSession = UserSession.get(userId)
  if (!userSession) return c.json({error: `No session for user ${userId}`}, 404)

  return streamSSE(c, async (stream) => {
    const client = {
      write: (data: string) => stream.writeSSE({data}),
      userId,
      close: () => stream.close(),
    }

    userSession.voice.addSSEClient(client)

    await stream.writeSSE({
      data: JSON.stringify({type: "connected", userId}),
    })

    stream.onAbort(() => {
      userSession.voice.removeSSEClient(client)
    })

    // Keep alive — send heartbeat every 30s
    while (true) {
      await stream.sleep(30000)
    }
  })
}

export default app
