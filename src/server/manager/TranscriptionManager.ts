import type { AppSession, TranscriptionData } from "@mentra/sdk";
import type { User } from "../session/User";
import { WakeWordDetector } from "./WakeWordDetector";

interface SSEWriter {
  write: (data: string) => void | Promise<void>;
  userId: string;
  close: () => void;
}

const WAKE_START_SOUND = process.env.WAKE_START_SOUND || "";
const WAKE_QUERY_SOUND = process.env.WAKE_QUERY_SOUND || "";

/**
 * TranscriptionManager — handles speech-to-text and SSE broadcasting for a single user.
 */
export class TranscriptionManager {
  private sseClients: Set<SSEWriter> = new Set();
  private unsubscribe: (() => void) | null = null;
  private wakeWord: WakeWordDetector;

  constructor(private user: User) {
    this.wakeWord = new WakeWordDetector({
      onWakeDetected: () => {
        // Play query sound on the glasses when wake word is heard (confirms activation)
        if (WAKE_QUERY_SOUND) {
          this.user.audio.playAudio(WAKE_QUERY_SOUND, { trackId: 1 });
        }
      },
      onQueryReady: (query) => {
        console.log(
          `🔊 [${this.user.userId}] Voice query ready: "${query}"`,
        );
        // Play start sound on the glasses when query is finalized (confirms submission)
        if (WAKE_START_SOUND) {
          this.user.audio.playAudio(WAKE_START_SOUND, { trackId: 1 });
        }
        this.broadcastVoiceQuery(query);
      },
      silenceTimeoutMs: 2000,
    });
  }

  /** Wire up the transcription listener on the glasses session */
  setup(session: AppSession): void {
    this.unsubscribe = session.events.onTranscription(
      (data: TranscriptionData) => {
        if (data.isFinal) {
          console.log(
            `✅ Final transcription (${this.user.userId}): ${data.text}`,
          );
        }
        // Feed every transcription into wake word detection
        this.wakeWord.process(data.text, data.isFinal);
        this.broadcast(data.text, data.isFinal);
      },
    );
  }

  /** Push a transcription event to all connected SSE clients */
  broadcast(text: string, isFinal: boolean): void {
    const payload = JSON.stringify({
      text,
      isFinal,
      timestamp: Date.now(),
      userId: this.user.userId,
    });

    for (const client of this.sseClients) {
      try {
        const result = client.write(payload);
        // Handle async write failures (stream.writeSSE returns a Promise)
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch(() => {
            this.sseClients.delete(client);
          });
        }
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  /** Send a voice-query event to all SSE clients so the frontend can submit it to OpenClaw */
  broadcastVoiceQuery(query: string): void {
    const payload = JSON.stringify({
      type: "voice-query",
      query,
      timestamp: Date.now(),
      userId: this.user.userId,
    });

    console.log(`🔊 Broadcasting voice-query to ${this.sseClients.size} SSE client(s)`);
    for (const client of this.sseClients) {
      try {
        const result = client.write(payload);
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch((err) => {
            console.warn(`🔊 SSE async write failed for client, removing:`, err);
            this.sseClients.delete(client);
          });
        }
      } catch (err) {
        console.warn(`🔊 SSE write failed for client, removing:`, err);
        this.sseClients.delete(client);
      }
    }
  }

  /** Call when Claude's response is done to re-enable wake word detection */
  unlockWakeWord(): void {
    this.wakeWord.unlock();
  }

  addSSEClient(client: SSEWriter): void {
    this.sseClients.add(client);
  }

  removeSSEClient(client: SSEWriter): void {
    this.sseClients.delete(client);
  }

  /** Detach the SDK transcription listener only — keeps SSE clients and wake word alive */
  detachSession(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Tear down everything — listener, wake word, and all SSE clients */
  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.wakeWord.destroy();
    this.sseClients.clear();
  }
}
