/**
 * Controller — the always-on brain of the Clawed miniapp.
 *
 * Bridges the glasses to the user's OpenClaw via the clawed relay:
 *   - push-to-talk: glasses double-tap, hardware button, or UI button toggles
 *     capture; on stop the accumulated transcript is sent to OpenClaw as
 *     {type:"stt"}.
 *   - {type:"speak"}  from OpenClaw → spoken (Mentra Live) + shown on the lens.
 *   - {type:"request_photo"} → camera photo → {type:"photo", photoUrl}.
 *   - UI "what do you see" → capture a photo and send it with a question.
 */

import type {MiniappSession, TranscriptionData, UnsubscribeFn} from "@mentra/miniapp/background"
import {RelayClient, type RelayMessage} from "./relay"
import {DEFAULT_SETTINGS} from "../shared/types"
import type {ChatLine, ConnState, Settings, StateSnapshot} from "../shared/types"
import type {Channels} from "../shared/channels"

interface TypedUI {
  onOpen: (cb: () => void) => UnsubscribeFn
  send: <C extends keyof Channels & string>(channel: C, payload: Channels[C]) => void
  on: <C extends keyof Channels & string>(channel: C, cb: (p: Channels[C]) => void) => UnsubscribeFn
}

const STORAGE = "clawed:settings"
const MAX_LINES = 30
const DISPLAY_MAX = 300

let idc = 0
const nextId = () => `l-${Date.now()}-${++idc}`

export class Controller {
  private settings: Settings = {...DEFAULT_SETTINGS}
  private lines: ChatLine[] = []
  private conn: ConnState = "unpaired"
  private listening = false
  private capture = ""
  private relay: RelayClient | null = null
  private readonly ui: TypedUI
  private lastInputToggleAt = 0

  constructor(private session: MiniappSession) {
    this.ui = session.ui as unknown as TypedUI
  }

  async start(): Promise<void> {
    await this.hydrate()
    this.connect()

    // Voice in (only accumulated while in push-to-talk listening mode)
    this.session.transcription.on((d: TranscriptionData) => this.onTranscription(d))
    // Glasses hardware button / double-tap = push-to-talk toggle.
    this.session.input.onButtonPress(() => this.toggleFromInput())
    this.session.input.onTouch((data) => this.onTouch(data))

    // UI bus
    this.ui.onOpen(() => this.pushState())
    this.ui.on("ui:request-state", () => this.pushState())
    this.ui.on("ui:talk", () => this.toggleFromInput())
    this.ui.on("ui:photo", () => void this.sendPhoto("What am I looking at?"))
    this.ui.on("ui:clear", () => this.clearTranscript())
    this.ui.on("ui:save-settings", (patch) => void this.saveSettings(patch))
  }

  // ─── settings ──────────────────────────────────────────────────────────────
  private async hydrate(): Promise<void> {
    try {
      const s = await this.session.storage.get(STORAGE)
      if (s) this.settings = {...DEFAULT_SETTINGS, ...JSON.parse(s)}
    } catch {
      this.settings = {...DEFAULT_SETTINGS}
    }
  }

  private async saveSettings(patch: Partial<Settings>): Promise<void> {
    this.settings = {...this.settings, ...patch}
    try {
      await this.session.storage.set(STORAGE, JSON.stringify(this.settings))
    } catch {}
    this.connect() // reconnect with the new pair code
    this.pushState()
  }

  // ─── relay ────────────────────────────────────────────────────────────────
  private connect(): void {
    this.relay?.close()
    this.relay = null
    if (!this.settings.pairCode.trim()) {
      this.conn = "unpaired"
      this.pushState()
      return
    }
    const url = `${this.settings.relayUrl}?role=glasses&pair=${encodeURIComponent(this.settings.pairCode.trim())}`
    this.relay = new RelayClient(url, {
      onStatus: (s) => {
        this.conn = s === "waiting" ? "waiting" : s === "connecting" ? "connecting" : "disconnected"
        this.pushState()
      },
      onMessage: (m) => this.onRelay(m),
    })
    this.relay.connect()
  }

  private onRelay(m: RelayMessage): void {
    switch (m.type) {
      case "paired":
        this.conn = "paired"
        this.pushState()
        return
      case "peer_gone":
        this.conn = "waiting"
        this.pushState()
        return
      case "speak": {
        const text = String((m as {text?: unknown}).text ?? "").trim()
        if (!text) return
        this.addLine("claw", text)
        this.display(text)
        void this.speak(text)
        return
      }
      case "request_photo": {
        const q = String((m as {question?: unknown}).question ?? "What do you see?")
        void this.sendPhoto(q)
        return
      }
    }
  }

  // ─── push-to-talk ───────────────────────────────────────────────────────────
  private onTouch(data: unknown): void {
    const touch = data as {kind?: string; gestureName?: string; gesture_name?: string}
    const gesture = touch.kind ?? touch.gestureName ?? touch.gesture_name
    if (gesture === "double_click" || gesture === "double_tap") {
      this.toggleFromInput()
    }
  }

  private toggleFromInput(): void {
    const now = Date.now()
    if (now - this.lastInputToggleAt < 350) return
    this.lastInputToggleAt = now
    this.toggleTalk()
  }

  private toggleTalk(): void {
    if (!this.listening) {
      this.listening = true
      this.capture = ""
      this.display("🎙 listening…")
      this.pushState()
    } else {
      this.listening = false
      const text = this.capture.trim()
      this.capture = ""
      if (text) {
        this.addLine("you", text)
        this.display("🦞 …")
        this.relay?.send({type: "stt", text})
      } else {
        this.display("")
      }
      this.pushState()
    }
  }

  private onTranscription(d: TranscriptionData): void {
    if (!this.listening || !d.text) return
    if (d.isFinal) {
      this.capture = `${this.capture} ${d.text}`.trim()
      this.display(`🎙 ${this.capture}`)
    } else {
      this.display(`🎙 ${this.capture} ${d.text}`.trim())
    }
  }

  // ─── camera ─────────────────────────────────────────────────────────────────
  private async sendPhoto(question: string): Promise<void> {
    this.display("👀 looking…")
    try {
      const photo = await this.session.camera.takePhoto({size: "medium", compress: "medium", sound: true})
      this.relay?.send({type: "photo", photoUrl: photo.photoUrl, question})
    } catch {
      const msg = "I couldn't take a photo — these glasses may not have a camera."
      this.addLine("system", msg)
      this.display(msg)
      this.pushState()
    }
  }

  // ─── output (device-adaptive: fire both, host no-ops the missing surface) ──
  private async speak(text: string): Promise<void> {
    try {
      await this.session.speaker.speak(text)
    } catch {}
  }

  private display(text: string): void {
    try {
      if (!text) {
        this.session.display.clear()
        return
      }
      this.session.display.showTextWall(text.length > DISPLAY_MAX ? `${text.slice(0, DISPLAY_MAX)}…` : text)
    } catch {}
  }

  // ─── state → UI ─────────────────────────────────────────────────────────────
  private addLine(role: ChatLine["role"], text: string): void {
    this.lines.push({id: nextId(), role, text})
    if (this.lines.length > MAX_LINES) this.lines = this.lines.slice(-MAX_LINES)
    this.pushState()
  }

  private clearTranscript(): void {
    this.lines = []
    this.capture = ""
    this.listening = false
    this.display("")
    this.pushState()
  }

  private pushState(): void {
    const snapshot: StateSnapshot = {
      lines: this.lines,
      conn: this.conn,
      listening: this.listening,
      settings: {pairCode: this.settings.pairCode, relayUrl: this.settings.relayUrl},
    }
    this.ui.send("state:snapshot", snapshot)
  }
}
