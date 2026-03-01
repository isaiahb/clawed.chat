/**
 * VoiceManager — the core glasses voice loop for clawed.chat
 *
 * Handles the full cycle:
 *   1. Glasses transcribe speech → onTranscription fires
 *   2. Final transcription → forwarded to user's active OpenClaw instance
 *   3. OpenClaw response → spoken aloud on glasses via TTS
 *
 * Also broadcasts transcription events via SSE so the dashboard
 * can show what the user is saying in real time.
 */

import type {AppSession, TranscriptionData} from "@mentra/sdk"
import type {UserSession} from "./UserSession"

interface SSEWriter {
  write: (data: string) => void
  userId: string
  close: () => void
}

export class VoiceManager {
  private sseClients: Set<SSEWriter> = new Set()
  private unsubscribe: (() => void) | null = null

  constructor(private userSession: UserSession) {}

  /** Wire up the transcription listener on the glasses session */
  setup(session: AppSession): void {
    this.unsubscribe = session.events.onTranscription(
      (data: TranscriptionData) => {
        this.handleTranscription(data.text, data.isFinal)
      },
    )
    console.log(`[voice] setup: user=${this.userSession.userId}`)
  }

  /** Handle an incoming transcription from glasses */
  private async handleTranscription(text: string, isFinal: boolean): Promise<void> {
    // Broadcast to all SSE clients (dashboard shows live transcription)
    this.broadcast(text, isFinal)

    // Only send final transcriptions to OpenClaw (not partials)
    if (!isFinal) return
    if (!text.trim()) return

    // TODO: send to OpenClaw and speak the response
    // The flow will be:
    //   1. Get the user's active instance ID from UserSession
    //   2. Call openclaw.service.ts → sendMessage(instanceId, text)
    //   3. Get the response text
    //   4. Speak it on the glasses via this.speak(response)
    //
    // For now, log it:
    console.log(`[voice] final transcription: user=${this.userSession.userId} text="${text}"`)
  }

  /** Speak text aloud on the glasses */
  async speak(text: string): Promise<void> {
    const session = this.userSession.appSession
    if (!session) {
      console.warn(`[voice] cannot speak — no glasses session for user=${this.userSession.userId}`)
      return
    }
    await session.audio.speak(text)
  }

  /** Stop any currently playing audio on the glasses */
  async stopAudio(): Promise<void> {
    const session = this.userSession.appSession
    if (!session) return
    await session.audio.stopAudio()
  }

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
        client.write(payload)
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

  /** Tear down listener and drop all SSE clients */
  destroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.sseClients.clear()
    console.log(`[voice] destroyed: user=${this.userSession.userId}`)
  }
}
