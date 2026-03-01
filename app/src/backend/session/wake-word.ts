/**
 * WakeWordDetector — listens for activation phrases in transcription text
 * and accumulates the subsequent query until a silence timeout.
 *
 * Ported from the demo branch's WakeWordDetector.ts.
 *
 * Flow:
 *  1. Every final transcription is checked against activation phrases.
 *  2. On match, text after the phrase becomes the start of the query.
 *  3. Subsequent final transcriptions are appended to the query.
 *  4. After `silenceTimeoutMs` with no new finals, the query is finalized.
 *  5. Wake word detection is locked until `unlock()` is called (after agent responds).
 *
 * Usage:
 *   const detector = new WakeWordDetector({
 *     onWakeDetected: () => playConfirmSound(),
 *     onQueryReady: (query) => sendToOpenClaw(query),
 *     silenceTimeoutMs: 2000,
 *   })
 *
 *   // Feed every transcription event:
 *   detector.process(text, isFinal)
 *
 *   // After agent responds:
 *   detector.unlock()
 */

/** Phrases that trigger activation (case-insensitive, fuzzy-friendly) */
const ACTIVATION_PHRASES = [
  "hey claude",
  "hey cloud",     // common mis-transcription
  "hey claud",     // partial transcription
  "a claude",      // garbled transcription
  "hey clawed",    // phonetic variant / our brand
  "hey claw",      // short variant
  "ok claude",     // alternative trigger
  "okay claude",   // alternative trigger
  "hey klaa",      // phonetic mis-hearing
  "hey claud",     // truncated
] as const

/**
 * Build a regex that matches any activation phrase.
 * Allows optional punctuation/whitespace between words.
 * e.g. "hey, claude" or "hey  claude" still match.
 */
function buildActivationRegex(): RegExp {
  const patterns = ACTIVATION_PHRASES.map((phrase) =>
    phrase
      .split(/\s+/)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[\\s,.:;!?]*"),
  )
  // Match any phrase, capture everything after it
  return new RegExp(`(?:${patterns.join("|")})(.*)`, "i")
}

const ACTIVATION_REGEX = buildActivationRegex()

type QueryCallback = (query: string) => void
type VoidCallback = () => void

export class WakeWordDetector {
  private active = false
  private queryParts: string[] = []
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private processing = false
  private onQueryReady: QueryCallback
  private onWakeDetected: VoidCallback | undefined
  private silenceTimeoutMs: number

  constructor(opts: {
    onQueryReady: QueryCallback
    onWakeDetected?: VoidCallback
    silenceTimeoutMs?: number
  }) {
    this.onQueryReady = opts.onQueryReady
    this.onWakeDetected = opts.onWakeDetected
    this.silenceTimeoutMs = opts.silenceTimeoutMs ?? 2000
  }

  /**
   * Call this when the agent's response is done (final/error/aborted)
   * to re-enable wake word detection for the next query.
   */
  unlock(): void {
    this.processing = false
    console.log(`[wake-word] detection unlocked`)
  }

  /**
   * Feed every transcription event into this method.
   * Only final transcriptions trigger activation / query accumulation.
   */
  process(text: string, isFinal: boolean): void {
    if (!isFinal) return
    if (this.processing) return

    const cleaned = text.trim()
    if (!cleaned) return

    if (!this.active) {
      // Check for activation phrase
      const match = ACTIVATION_REGEX.exec(cleaned)
      if (!match) return

      const afterPhrase = (match[1] ?? "").replace(/^[\s,.:;!?]+/, "").trim()
      this.active = true
      console.log(`[wake-word] detected in: "${cleaned}"`)
      this.onWakeDetected?.()

      if (afterPhrase) {
        this.queryParts.push(afterPhrase)
        console.log(`[wake-word] query start: "${afterPhrase}"`)
      }

      this.resetSilenceTimer()
      return
    }

    // Already active — accumulate query text
    // But first check if the user said the wake word again (restart)
    const restartMatch = ACTIVATION_REGEX.exec(cleaned)
    if (restartMatch) {
      console.log(`[wake-word] repeated — restarting query: "${cleaned}"`)
      this.queryParts = []
      const afterPhrase = (restartMatch[1] ?? "").replace(/^[\s,.:;!?]+/, "").trim()
      if (afterPhrase) {
        this.queryParts.push(afterPhrase)
        console.log(`[wake-word] query start: "${afterPhrase}"`)
      }
      this.resetSilenceTimer()
      return
    }

    this.queryParts.push(cleaned)
    console.log(`[wake-word] appending: "${cleaned}"`)
    console.log(`[wake-word] query so far: "${this.queryParts.join(" ")}"`)
    this.resetSilenceTimer()
  }

  /** Reset the silence countdown — called on every new final transcription */
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
    }

    this.silenceTimer = setTimeout(() => {
      this.finalizeQuery()
    }, this.silenceTimeoutMs)
  }

  /** Query is done — join parts, fire callback, reset state */
  private finalizeQuery(): void {
    const query = this.queryParts.join(" ").trim()
    this.active = false
    this.queryParts = []
    this.silenceTimer = null

    if (!query) {
      console.log(`[wake-word] detected but no query followed — ignoring`)
      return
    }

    console.log(`[wake-word] query finalized: "${query}"`)
    this.processing = true
    console.log(`[wake-word] detection locked (waiting for agent response)`)
    this.onQueryReady(query)
  }

  /** Clean up timers */
  destroy(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    this.active = false
    this.queryParts = []
  }
}
