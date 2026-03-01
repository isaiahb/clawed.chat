/**
 * VoiceManager — the core glasses voice loop for clawed.chat
 *
 * Handles the full cycle:
 *   1. Glasses transcribe speech → onTranscription fires
 *   2. WakeWordDetector listens for "hey claude" / "hey clawed"
 *   3. After wake word + silence timeout → query finalized
 *   4. Query sent to OpenClaw gateway via WebSocket (same proxy protocol)
 *   5. Agent response → spoken aloud on glasses via TTS
 *   6. Wake word detection re-enabled for next query
 *
 * Also broadcasts transcription events via SSE so the dashboard
 * can show what the user is saying in real time.
 *
 * Reference: demo branch's TranscriptionManager + AudioManager + AskPage voice flow
 */

import type {AppSession, TranscriptionData} from "@mentra/sdk"
import type {UserSession} from "./UserSession"
import {WakeWordDetector} from "./wake-word"

// ─── Config ──────────────────────────────────────────────────────────────────

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "ws://136.117.21.95:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""
const WAKE_QUERY_SOUND = process.env.WAKE_QUERY_SOUND || ""
const WAKE_START_SOUND = process.env.WAKE_START_SOUND || ""

// Gateway protocol
const PROTOCOL_VERSION = 3

// ─── Types ───────────────────────────────────────────────────────────────────

interface SSEWriter {
  write: (data: string) => void | Promise<void>
  userId: string
  close: () => void
}

// ─── VoiceManager ────────────────────────────────────────────────────────────

export class VoiceManager {
  private sseClients: Set<SSEWriter> = new Set()
  private unsubscribe: (() => void) | null = null
  private wakeWord: WakeWordDetector
  private gatewayWs: WebSocket | null = null
  private gatewayAuthenticated = false
  private gatewaySessionKey: string
  private rpcId = 0

  constructor(private userSession: UserSession) {
    this.gatewaySessionKey = `clawed:default:${userSession.userId}`

    this.wakeWord = new WakeWordDetector({
      onWakeDetected: () => {
        console.log(`[voice] wake word detected for ${this.userSession.userId}`)
        // Play confirmation sound on glasses
        if (WAKE_QUERY_SOUND) {
          this.playAudio(WAKE_QUERY_SOUND)
        }
      },
      onQueryReady: (query) => {
        console.log(`[voice] query ready for ${this.userSession.userId}: "${query}"`)
        // Play submission sound on glasses
        if (WAKE_START_SOUND) {
          this.playAudio(WAKE_START_SOUND)
        }
        // Broadcast voice-query to SSE clients (dashboard shows it)
        this.broadcastVoiceQuery(query)
        // Send to OpenClaw
        this.sendToOpenClaw(query)
      },
      silenceTimeoutMs: 2000,
    })
  }

  /** Wire up the transcription listener on the glasses session */
  setup(session: AppSession): void {
    this.unsubscribe = session.events.onTranscription(
      (data: TranscriptionData) => {
        // Feed into wake word detection
        this.wakeWord.process(data.text, data.isFinal)
        // Broadcast to SSE clients (live transcription on dashboard)
        this.broadcast(data.text, data.isFinal)
      },
    )

    // Connect to gateway proactively so it's ready when a query comes in
    this.connectToGateway()

    console.log(`[voice] setup: user=${this.userSession.userId}`)
  }

  // ─── OpenClaw Gateway Connection ─────────────────────────────────────────

  /** Connect to the OpenClaw gateway directly (same protocol as the proxy) */
  private connectToGateway(): void {
    if (this.gatewayWs?.readyState === WebSocket.OPEN) return
    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      console.warn(`[voice] no OPENCLAW_GATEWAY_URL or TOKEN — voice→agent disabled`)
      return
    }

    try {
      const ws = new WebSocket(GATEWAY_URL)
      this.gatewayWs = ws
      this.gatewayAuthenticated = false

      ws.addEventListener("open", () => {
        console.log(`[voice] gateway WS open for ${this.userSession.userId}`)
      })

      ws.addEventListener("message", (event) => {
        const raw = typeof event.data === "string" ? event.data : event.data.toString()
        try {
          const msg = JSON.parse(raw)
          this.handleGatewayMessage(msg)
        } catch {
          // Non-JSON, ignore
        }
      })

      ws.addEventListener("close", (event) => {
        console.log(`[voice] gateway WS closed: ${event.code} ${event.reason}`)
        this.gatewayAuthenticated = false
        this.gatewayWs = null

        // Reconnect after a delay (unless we're being destroyed)
        if (this.unsubscribe) {
          setTimeout(() => this.connectToGateway(), 3000)
        }
      })

      ws.addEventListener("error", (err) => {
        console.error(`[voice] gateway WS error:`, err)
      })
    } catch (err) {
      console.error(`[voice] failed to connect to gateway:`, err)
    }
  }

  /** Handle messages from the OpenClaw gateway */
  private handleGatewayMessage(msg: any): void {
    // Challenge-response auth
    if (msg.type === "event" && msg.event === "connect.challenge") {
      console.log(`[voice] gateway challenge received, authenticating...`)
      const connectReq = {
        type: "req",
        id: `voice-connect-${Date.now()}`,
        method: "connect",
        params: {
          minProtocol: PROTOCOL_VERSION,
          maxProtocol: PROTOCOL_VERSION,
          client: {
            id: "gateway-client",
            version: "1.0.0",
            platform: process.platform,
            mode: "backend",
          },
          role: "operator",
          scopes: ["operator.admin"],
          caps: [],
          auth: {
            token: GATEWAY_TOKEN,
          },
        },
      }
      this.gatewayWs?.send(JSON.stringify(connectReq))
      return
    }

    // Auth success (hello-ok)
    if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
      console.log(`[voice] gateway authenticated for ${this.userSession.userId}`)
      this.gatewayAuthenticated = true
      return
    }

    // Auth failure
    if (msg.type === "res" && !msg.ok && !this.gatewayAuthenticated) {
      console.error(`[voice] gateway auth failed:`, msg.error)
      return
    }

    // Chat event — agent response
    if (msg.type === "event" && msg.event === "chat") {
      const payload = msg.payload
      const state = payload?.state as string
      const content = payload?.message?.content

      if (state === "final" && content) {
        // Extract text from content blocks
        let agentText = ""
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text" && block.text) {
              agentText += block.text
            }
          }
        } else if (typeof content === "string") {
          agentText = content
        }

        if (agentText) {
          console.log(`[voice] agent response: "${agentText.slice(0, 80)}..."`)
          // Speak on glasses
          this.speak(agentText)
          // Broadcast to SSE clients so dashboard shows the response
          this.broadcastAgentResponse(agentText)
          // Unlock wake word for the next query
          this.wakeWord.unlock()
        }
      }

      if (state === "error") {
        const errorText = payload?.errorMessage || "Sorry, something went wrong."
        console.error(`[voice] agent error: ${errorText}`)
        this.speak("Sorry, I encountered an error. Please try again.")
        this.wakeWord.unlock()
      }

      if (state === "aborted") {
        console.warn(`[voice] agent response aborted`)
        this.wakeWord.unlock()
      }
    }
  }

  // ─── Send to OpenClaw ────────────────────────────────────────────────────

  /** Send a voice query to the OpenClaw gateway */
  private sendToOpenClaw(query: string): void {
    if (!this.gatewayWs || this.gatewayWs.readyState !== WebSocket.OPEN) {
      console.warn(`[voice] gateway not connected — reconnecting and buffering`)
      this.connectToGateway()
      // Retry after a short delay
      setTimeout(() => {
        if (this.gatewayAuthenticated && this.gatewayWs?.readyState === WebSocket.OPEN) {
          this.sendChatMessage(query)
        } else {
          console.error(`[voice] still not connected — dropping voice query: "${query}"`)
          this.speak("Sorry, I'm not connected to the agent right now.")
          this.wakeWord.unlock()
        }
      }, 2000)
      return
    }

    if (!this.gatewayAuthenticated) {
      console.warn(`[voice] gateway not authenticated yet — waiting...`)
      setTimeout(() => {
        if (this.gatewayAuthenticated) {
          this.sendChatMessage(query)
        } else {
          console.error(`[voice] auth timeout — dropping voice query`)
          this.speak("Sorry, I couldn't authenticate with the agent.")
          this.wakeWord.unlock()
        }
      }, 3000)
      return
    }

    this.sendChatMessage(query)
  }

  /** Send the actual chat.send RPC to the gateway */
  private sendChatMessage(text: string): void {
    const id = `voice-${++this.rpcId}-${Date.now()}`
    const frame = {
      type: "req",
      id,
      method: "chat.send",
      params: {
        sessionKey: this.gatewaySessionKey,
        message: text,
        idempotencyKey: id,
      },
    }

    console.log(`[voice] sending to OpenClaw: "${text.slice(0, 60)}..."`)
    this.gatewayWs?.send(JSON.stringify(frame))
  }

  // ─── TTS & Audio ─────────────────────────────────────────────────────────

  /** Speak text aloud on the glasses */
  async speak(text: string): Promise<void> {
    const session = this.userSession.appSession
    if (!session) {
      console.warn(`[voice] cannot speak — no glasses session for user=${this.userSession.userId}`)
      return
    }
    try {
      await session.audio.speak(text)
    } catch (err) {
      console.error(`[voice] TTS failed:`, err)
    }
  }

  /** Play an audio file from a URL on the glasses */
  private async playAudio(audioUrl: string): Promise<void> {
    const session = this.userSession.appSession
    if (!session) return
    try {
      await session.audio.playAudio({
        audioUrl,
        volume: 1.0,
        trackId: 1,
        stopOtherAudio: false,
      })
    } catch (err) {
      console.warn(`[voice] playAudio failed:`, err)
    }
  }

  /** Stop any currently playing audio on the glasses */
  async stopAudio(): Promise<void> {
    const session = this.userSession.appSession
    if (!session) return
    await session.audio.stopAudio()
  }

  // ─── SSE Broadcasting ────────────────────────────────────────────────────

  /** Push a transcription event to all connected SSE clients */
  private broadcast(text: string, isFinal: boolean): void {
    const payload = JSON.stringify({
      type: "transcription",
      text,
      isFinal,
      timestamp: Date.now(),
      userId: this.userSession.userId,
    })

    for (const client of this.sseClients) {
      try {
        const result = client.write(payload)
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch(() => {
            this.sseClients.delete(client)
          })
        }
      } catch {
        this.sseClients.delete(client)
      }
    }
  }

  /** Broadcast a voice-query event (wake word query finalized) */
  private broadcastVoiceQuery(query: string): void {
    const payload = JSON.stringify({
      type: "voice-query",
      query,
      timestamp: Date.now(),
      userId: this.userSession.userId,
    })

    for (const client of this.sseClients) {
      try {
        const result = client.write(payload)
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch(() => this.sseClients.delete(client))
        }
      } catch {
        this.sseClients.delete(client)
      }
    }
  }

  /** Broadcast the agent's response (so dashboard can display it) */
  private broadcastAgentResponse(text: string): void {
    const payload = JSON.stringify({
      type: "agent-response",
      text,
      timestamp: Date.now(),
      userId: this.userSession.userId,
    })

    for (const client of this.sseClients) {
      try {
        const result = client.write(payload)
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch(() => this.sseClients.delete(client))
        }
      } catch {
        this.sseClients.delete(client)
      }
    }
  }

  addSSEClient(client: SSEWriter): void {
    this.sseClients.add(client)
  }

  removeSSEClient(client: SSEWriter): void {
    this.sseClients.delete(client)
  }

  /** Unlock wake word externally (e.g. from an API call) */
  unlockWakeWord(): void {
    this.wakeWord.unlock()
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  /** Detach glasses session but keep gateway + SSE alive */
  detachSession(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  /** Tear down everything — listener, gateway, wake word, SSE clients */
  destroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.wakeWord.destroy()
    this.sseClients.clear()
    if (this.gatewayWs) {
      try {
        this.gatewayWs.close()
      } catch {}
      this.gatewayWs = null
    }
    this.gatewayAuthenticated = false
    console.log(`[voice] destroyed: user=${this.userSession.userId}`)
  }
}
