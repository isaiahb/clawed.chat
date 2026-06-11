/**
 * AgentController — the always-on brain of the Clawed miniapp.
 *
 * Owns every session.* subscription (transcription, button, camera) and the
 * GatewayClient connection to the user's OpenClaw. The UI WebView is a
 * viewer: it reads state snapshots and sends imperative commands over the
 * typed channel bus. Glasses behavior never depends on the UI being open.
 *
 * Voice flow:
 *   "Hey Clawed, <command>"        → command sent to OpenClaw immediately
 *   "Hey Clawed" (alone)           → listening mode, next utterance is the command
 *   "Hey Clawed, what am I looking at?" → camera photo → vision pipeline
 *
 * Output routing (device-adaptive):
 *   - speaker.speak(...)           → spoken reply (Mentra Live)
 *   - display.showTextWall(...)    → streaming HUD text (Even Realities G2)
 *   Both are fired; the host no-ops whichever surface the glasses lack.
 */

import type {MiniappSession, TranscriptionData, UnsubscribeFn} from "@mentra/miniapp/background"
import {GatewayClient, type ChatEvent} from "./gateway"
import {DEFAULT_SETTINGS} from "../shared/types"
import type {ChatMessage, ConnectionStatus, Settings, StateSnapshot} from "../shared/types"
import type {Channels} from "../shared/channels"

/** session.ui, narrowed to this miniapp's typed channel registry (same
 * pattern as the SDK's reference example — the module is untyped until
 * cast against the shared Channels interface). */
interface TypedUI {
  onOpen: (cb: () => void) => UnsubscribeFn
  send: <C extends keyof Channels & string>(channel: C, payload: Channels[C]) => void
  on: <C extends keyof Channels & string>(channel: C, cb: (p: Channels[C]) => void) => UnsubscribeFn
}

const STORAGE_SETTINGS = "clawed:settings"
const STORAGE_MESSAGES = "clawed:messages"
const MAX_MESSAGES = 50
const LISTEN_WINDOW_MS = 15_000
const DISPLAY_MAX_CHARS = 400

/** Wake word: "hey/ok clawed" with common STT mishearings of "clawed". */
const WAKE_RE = /\b(?:hey|ok|okay)[,\s]+(?:clawed|claude|claud|clod|clawd|cloud|clot)\b[,.!?]*/i

/** Vision intent: questions that need the camera. */
const VISION_RE =
  /\b(?:what(?:'s| is| am i| are you)? (?:i )?(?:this|that|looking at|seeing)|look at this|what do you see|can you see)\b/i

let msgCounter = 0
function nextMsgId(): string {
  return `m-${Date.now()}-${++msgCounter}`
}

export class AgentController {
  private settings: Settings = {...DEFAULT_SETTINGS}
  private messages: ChatMessage[] = []
  private connection: ConnectionStatus = "unconfigured"
  private gateway: GatewayClient | null = null
  private sessionKey = `clawed-glasses-${Date.now()}`

  /** Waiting for the follow-up utterance after a bare wake word. */
  private listening = false
  private listenTimer: ReturnType<typeof setTimeout> | null = null

  /** The agent message currently streaming in. */
  private streamingMsg: ChatMessage | null = null

  private readonly ui: TypedUI

  constructor(private session: MiniappSession) {
    this.ui = session.ui as unknown as TypedUI
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    await this.hydrate()
    this.connectGateway()

    // Voice in — the agent's ears
    this.session.transcription.on((data: TranscriptionData) => {
      this.onTranscription(data)
    })

    // Hardware button → vision query ("look at this")
    this.session.input.onButtonPress(() => {
      void this.runVisionQuery("What am I looking at?")
    })

    // UI bus
    this.ui.onOpen(() => this.pushState())
    this.ui.on("state:request", () => this.pushState())
    this.ui.on("chat:send", ({text}) => {
      void this.runCommand(text, {spoken: false})
    })
    this.ui.on("vision:ask", ({question}) => {
      void this.runVisionQuery(question)
    })
    this.ui.on("chat:clear", () => {
      this.messages = []
      void this.persistMessages()
      this.pushState()
    })
    this.ui.on("settings:save", (patch) => {
      void this.saveSettings(patch)
    })
  }

  // ─── Settings + persistence ────────────────────────────────────────────────

  private async hydrate(): Promise<void> {
    try {
      const [storedSettings, storedMessages] = await Promise.all([
        this.session.storage.get(STORAGE_SETTINGS),
        this.session.storage.get(STORAGE_MESSAGES),
      ])
      if (storedSettings) this.settings = {...DEFAULT_SETTINGS, ...JSON.parse(storedSettings)}
      if (storedMessages) this.messages = JSON.parse(storedMessages)
    } catch {
      // Corrupt storage — start fresh rather than crash the context
      this.settings = {...DEFAULT_SETTINGS}
      this.messages = []
    }
  }

  private async saveSettings(patch: Partial<Settings>): Promise<void> {
    const gatewayChanged =
      (patch.gatewayUrl !== undefined && patch.gatewayUrl !== this.settings.gatewayUrl) ||
      (patch.gatewayToken !== undefined && patch.gatewayToken !== this.settings.gatewayToken)

    this.settings = {...this.settings, ...patch}
    try {
      await this.session.storage.set(STORAGE_SETTINGS, JSON.stringify(this.settings))
    } catch {}

    if (gatewayChanged) this.connectGateway()
    this.pushState()
  }

  private async persistMessages(): Promise<void> {
    try {
      await this.session.storage.set(STORAGE_MESSAGES, JSON.stringify(this.messages.slice(-MAX_MESSAGES)))
    } catch {}
  }

  // ─── Gateway ───────────────────────────────────────────────────────────────

  private connectGateway(): void {
    this.gateway?.close()
    this.gateway = null

    if (!this.settings.gatewayUrl) {
      this.connection = "unconfigured"
      this.pushState()
      return
    }

    this.gateway = new GatewayClient({
      url: this.settings.gatewayUrl,
      token: this.settings.gatewayToken,
      onStatus: (status) => {
        this.connection = status
        this.pushState()
      },
      onChat: (event) => this.onChatEvent(event),
    })
    this.gateway.connect()
  }

  // ─── Voice input ───────────────────────────────────────────────────────────

  private onTranscription(data: TranscriptionData): void {
    if (!data.isFinal) return
    const text = data.text.trim()
    if (!text) return

    // Follow-up utterance while in listening mode
    if (this.listening) {
      this.stopListening()
      void this.runCommand(text, {spoken: true})
      return
    }

    if (!this.settings.wakeWordEnabled) return

    const match = WAKE_RE.exec(text)
    if (!match) return

    const command = text.slice(match.index + match[0].length).trim()
    if (command.length >= 2) {
      void this.runCommand(command, {spoken: true})
    } else {
      this.startListening()
    }
  }

  private startListening(): void {
    this.listening = true
    this.display("🦞 Listening…")
    this.pushState()
    this.listenTimer = setTimeout(() => {
      this.stopListening()
      this.display("")
      this.pushState()
    }, LISTEN_WINDOW_MS)
  }

  private stopListening(): void {
    this.listening = false
    if (this.listenTimer) {
      clearTimeout(this.listenTimer)
      this.listenTimer = null
    }
  }

  // ─── Command flow ──────────────────────────────────────────────────────────

  private async runCommand(text: string, opts: {spoken: boolean}): Promise<void> {
    // Visual questions go through the camera, not the chat thread
    if (VISION_RE.test(text)) {
      await this.runVisionQuery(text)
      return
    }

    this.addMessage({id: nextMsgId(), role: "user", text, at: Date.now(), status: "done"})

    if (!this.gateway?.isConnected) {
      const hint = this.connection === "unconfigured"
        ? "I'm not connected to your OpenClaw yet. Open the Clawed app and add your gateway address."
        : "I can't reach your OpenClaw right now. I'll keep trying to reconnect."
      this.addMessage({id: nextMsgId(), role: "system", text: hint, at: Date.now(), status: "error"})
      if (opts.spoken) void this.speak(hint)
      this.display(hint)
      return
    }

    this.display("🦞 …")
    this.streamingMsg = {id: nextMsgId(), role: "agent", text: "", at: Date.now(), status: "streaming"}
    this.addMessage(this.streamingMsg)

    try {
      await this.gateway.sendChat(this.sessionKey, text)
    } catch (err) {
      const failed = `Couldn't send that: ${err instanceof Error ? err.message : "unknown error"}`
      this.finishStreaming(failed, "error")
      if (opts.spoken) void this.speak(failed)
    }
  }

  private onChatEvent(event: ChatEvent): void {
    // Unprompted final (agent cron job, reminder, proactive nudge) — the
    // agent whispering in your ear without being asked. Surface it.
    if (!this.streamingMsg) {
      if (event.state === "final" && event.text) {
        this.addMessage({id: nextMsgId(), role: "agent", text: event.text, at: Date.now(), status: "done"})
        this.display(event.text)
        void this.speak(event.text)
        void this.persistMessages()
      }
      return
    }

    if (event.state === "delta") {
      if (event.text) {
        this.streamingMsg.text = event.text
        // Stream onto the HUD as the agent thinks (G2's superpower)
        this.display(this.streamingMsg.text)
        this.pushState()
      }
      return
    }

    if (event.state === "final") {
      const text = event.text || this.streamingMsg.text || "Done."
      this.finishStreaming(text, "done")
      void this.speak(text)
      return
    }

    if (event.state === "error" || event.state === "aborted") {
      const text = event.text || "The agent run was interrupted."
      this.finishStreaming(text, "error")
      void this.speak(text)
    }
  }

  private finishStreaming(text: string, status: "done" | "error"): void {
    if (this.streamingMsg) {
      this.streamingMsg.text = text
      this.streamingMsg.status = status
      this.streamingMsg = null
    }
    this.display(text)
    void this.persistMessages()
    this.pushState()
  }

  // ─── Vision flow: camera → backend → Nebius vision + Tavily ───────────────

  private async runVisionQuery(question: string): Promise<void> {
    this.addMessage({
      id: nextMsgId(),
      role: "user",
      text: question,
      at: Date.now(),
      status: "done",
      vision: true,
    })

    if (!this.settings.visionUrl) {
      const hint = "Vision isn't configured yet. Add a vision endpoint in the Clawed app."
      this.addMessage({id: nextMsgId(), role: "system", text: hint, at: Date.now(), status: "error"})
      void this.speak(hint)
      return
    }

    this.display("👀 Looking…")
    try {
      const photo = await this.session.camera.takePhoto({size: "medium", compress: "medium", sound: true})

      const res = await fetch(this.settings.visionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.settings.visionToken ? {Authorization: `Bearer ${this.settings.visionToken}`} : {}),
        },
        body: JSON.stringify({photoUrl: photo.photoUrl, mimeType: photo.mimeType, question}),
      })

      if (!res.ok) {
        throw new Error(`Vision endpoint returned ${res.status}`)
      }

      const {answer} = (await res.json()) as {answer: string}
      this.addMessage({
        id: nextMsgId(),
        role: "agent",
        text: answer,
        at: Date.now(),
        status: "done",
        vision: true,
      })
      this.display(answer)
      void this.speak(answer)
      void this.persistMessages()
      this.pushState()
    } catch (err) {
      const failed =
        err instanceof Error && /camera|permission/i.test(err.message)
          ? "I couldn't take a photo — these glasses may not have a camera."
          : `I couldn't see that: ${err instanceof Error ? err.message : "unknown error"}`
      this.addMessage({id: nextMsgId(), role: "system", text: failed, at: Date.now(), status: "error"})
      this.display(failed)
      void this.speak(failed)
      this.pushState()
    }
  }

  // ─── Output (device-adaptive: fire both, host no-ops missing surfaces) ─────

  private async speak(text: string): Promise<void> {
    try {
      await this.session.speaker.speak(text)
    } catch {
      // No speaker route (e.g. G2 without phone audio) — display already has it
    }
  }

  private display(text: string): void {
    try {
      if (!text) {
        this.session.display.clear()
        return
      }
      const clipped = text.length > DISPLAY_MAX_CHARS ? `${text.slice(0, DISPLAY_MAX_CHARS)}…` : text
      this.session.display.showTextWall(clipped)
    } catch {
      // No display (Mentra Live) — speaker route already has it
    }
  }

  // ─── State → UI ────────────────────────────────────────────────────────────

  private addMessage(msg: ChatMessage): void {
    this.messages.push(msg)
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES)
    }
    this.pushState()
  }

  private pushState(): void {
    const snapshot: StateSnapshot = {
      messages: this.messages,
      connection: this.connection,
      listening: this.listening,
      settings: {
        gatewayUrl: this.settings.gatewayUrl,
        gatewayTokenSet: this.settings.gatewayToken.length > 0,
        visionUrl: this.settings.visionUrl,
        visionTokenSet: this.settings.visionToken.length > 0,
        wakeWordEnabled: this.settings.wakeWordEnabled,
      },
    }
    this.ui.send("state:snapshot", snapshot)
  }
}
