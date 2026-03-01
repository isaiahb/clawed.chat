import type { AppSession, TranscriptionData } from "@mentra/sdk";
import type { User } from "../session/User";
import { WakeWordDetector } from "./WakeWordDetector";

interface SSEWriter {
  write: (data: string) => void;
  userId: string;
  close: () => void;
}

/**
 * TranscriptionManager — handles speech-to-text and SSE broadcasting for a single user.
 */
export class TranscriptionManager {
  private sseClients: Set<SSEWriter> = new Set();
  private unsubscribe: (() => void) | null = null;
  private wakeWord: WakeWordDetector;

  constructor(private user: User) {
    this.wakeWord = new WakeWordDetector({
      onQueryReady: (query) => {
        console.log(
          `🔊 [${this.user.userId}] Voice query ready: "${query}"`,
        );
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
        client.write(payload);
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

    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
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

  /** Tear down listener and drop all SSE clients */
  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.wakeWord.destroy();
    this.sseClients.clear();
  }
}
