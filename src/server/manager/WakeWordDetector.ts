/**
 * WakeWordDetector — listens for activation phrases in transcription text
 * and accumulates the subsequent query until a silence timeout.
 *
 * Flow:
 *  1. Every final transcription is checked against activation phrases.
 *  2. On match, text after the phrase becomes the start of the query.
 *  3. Subsequent final transcriptions are appended to the query.
 *  4. After `silenceTimeoutMs` with no new finals, the query is finalized.
 */

/** Phrases that trigger activation (case-insensitive, fuzzy-friendly) */
const ACTIVATION_PHRASES = [
  "hey claude",
  "hey cloud",    // common mis-transcription
  "hey claud",    // partial transcription
  "a claude",      // garbled transcription
  "hey clawed",   // phonetic variant
  "hey claw",     // short variant
  "ok claude",    // alternative trigger
  "okay claude",  // alternative trigger
] as const;

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
  );
  // Match any phrase, capture everything after it
  return new RegExp(`(?:${patterns.join("|")})(.*)`, "i");
}

const ACTIVATION_REGEX = buildActivationRegex();

type QueryCallback = (query: string) => void;

export class WakeWordDetector {
  private active = false;
  private queryParts: string[] = [];
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private onQueryReady: QueryCallback;
  private silenceTimeoutMs: number;

  constructor(opts: { onQueryReady: QueryCallback; silenceTimeoutMs?: number }) {
    this.onQueryReady = opts.onQueryReady;
    this.silenceTimeoutMs = opts.silenceTimeoutMs ?? 2000;
  }

  /**
   * Feed every transcription event into this method.
   * Only final transcriptions trigger activation / query accumulation.
   */
  process(text: string, isFinal: boolean): void {
    if (!isFinal) return;

    const cleaned = text.trim();
    if (!cleaned) return;

    if (!this.active) {
      // Check for activation phrase
      const match = ACTIVATION_REGEX.exec(cleaned);
      if (!match) return;

      const afterPhrase = (match[1] ?? "").replace(/^[\s,.:;!?]+/, "").trim();
      this.active = true;
      console.log(`🎙️  Wake word detected in transcription: "${cleaned}"`);

      if (afterPhrase) {
        this.queryParts.push(afterPhrase);
        console.log(`🎙️  Query start: "${afterPhrase}"`);
      }

      this.resetSilenceTimer();
      return;
    }

    // Already active — accumulate query text
    // But first check if the user said the wake word again (restart)
    const restartMatch = ACTIVATION_REGEX.exec(cleaned);
    if (restartMatch) {
      console.log(`🎙️  Wake word repeated — restarting query: "${cleaned}"`);
      this.queryParts = [];
      const afterPhrase = (restartMatch[1] ?? "").replace(/^[\s,.:;!?]+/, "").trim();
      if (afterPhrase) {
        this.queryParts.push(afterPhrase);
        console.log(`🎙️  Query start: "${afterPhrase}"`);
      }
      this.resetSilenceTimer();
      return;
    }

    this.queryParts.push(cleaned);
    console.log(`🎙️  Transcription: "${cleaned}"`);
    console.log(`🎙️  Query so far: "${this.queryParts.join(" ")}"`);
    this.resetSilenceTimer();
  }

  /** Reset the silence countdown — called on every new final transcription */
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      this.finalizeQuery();
    }, this.silenceTimeoutMs);
  }

  /** Query is done — join parts, fire callback, reset state */
  private finalizeQuery(): void {
    const query = this.queryParts.join(" ").trim();
    this.active = false;
    this.queryParts = [];
    this.silenceTimer = null;

    if (!query) {
      console.log(`🎙️  Wake word detected but no query followed — ignoring`);
      return;
    }

    console.log(`🎙️  Query finalized: "${query}"`);
    this.onQueryReady(query);
  }

  /** Clean up timers */
  destroy(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.active = false;
    this.queryParts = [];
  }
}
