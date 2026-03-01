import type { User } from "../session/User";

/** ElevenLabs voice ID — change this to switch the TTS voice */
const TTS_VOICE_ID = process.env.TTS_VOICE_ID || "";

/**
 * AudioManager — text-to-speech and audio control for a single user.
 */
export class AudioManager {
  constructor(private user: User) {}

  /** Speak text aloud on the glasses */
  async speak(text: string): Promise<void> {
    const session = this.user.appSession;
    if (!session) throw new Error("No active glasses session");
    await session.audio.speak(text, {
      ...(TTS_VOICE_ID ? { voice_id: TTS_VOICE_ID } : {}),
    });
  }

  /** Play an audio file from a URL on the glasses (fire-and-forget friendly) */
  async playAudio(audioUrl: string, opts?: { volume?: number; trackId?: number }): Promise<void> {
    const session = this.user.appSession;
    if (!session) {
      console.warn(`[AudioManager] No glasses session — skipping playAudio for ${audioUrl}`);
      return;
    }
    try {
      await session.audio.playAudio({
        audioUrl,
        volume: opts?.volume ?? 1.0,
        trackId: opts?.trackId ?? 1, // app_audio track — won't interrupt TTS
        stopOtherAudio: false,
      });
    } catch (err) {
      console.warn(`[AudioManager] playAudio failed:`, err);
    }
  }

  /** Stop any currently playing audio */
  async stopAudio(): Promise<void> {
    const session = this.user.appSession;
    if (!session) throw new Error("No active glasses session");
    await session.audio.stopAudio();
  }
}
