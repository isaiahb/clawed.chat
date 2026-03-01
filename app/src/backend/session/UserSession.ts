/**
 * UserSession — per-user state container for clawed.chat
 *
 * Composes the voice manager and holds the glasses AppSession.
 * Also tracks which OpenClaw instance this user is connected to.
 *
 * Created when a user connects (glasses or webview) and
 * destroyed when the session is cleaned up.
 *
 * Use static methods for session lookup:
 *   UserSession.getOrCreate(userId)
 *   UserSession.get(userId)
 *   UserSession.remove(userId)
 *
 * The sessions Map lives on globalThis to prevent the duplicate-module bug:
 * if this file gets imported via different paths (e.g., "../UserSession" vs
 * "@/backend/UserSession"), Bun treats them as separate modules — each with
 * its own static fields. globalThis is process-wide, so no matter how many
 * times the module loads, everyone shares the same Map.
 */

import type {AppSession} from "@mentra/sdk"
import {VoiceManager} from "./voice.manager"

// Single process-wide sessions store — survives duplicate module loads
const SESSIONS_KEY = Symbol.for("clawed.chat.sessions")
;(globalThis as any)[SESSIONS_KEY] ??= new Map<string, UserSession>()

export class UserSession {
  /** All active sessions by userId (process-wide singleton via globalThis) */
  private static get sessions(): Map<string, UserSession> {
    return (globalThis as any)[SESSIONS_KEY]
  }

  /** Get an existing session or create a new one */
  static getOrCreate(userId: string): UserSession {
    let session = UserSession.sessions.get(userId)
    if (!session) {
      session = new UserSession(userId)
      UserSession.sessions.set(userId, session)
    }
    return session
  }

  /** Get an existing session (undefined if not found) */
  static get(userId: string): UserSession | undefined {
    return UserSession.sessions.get(userId)
  }

  /** Clean up and remove a session */
  static remove(userId: string): void {
    const session = UserSession.sessions.get(userId)
    if (session) {
      session.cleanup()
      UserSession.sessions.delete(userId)
    }
  }

  /** Active glasses connection, null when webview-only */
  appSession: AppSession | null = null

  /** The user's active OpenClaw instance ID (from Convex) */
  activeInstanceId: string | null = null

  /** Voice: transcription → OpenClaw → TTS loop */
  voice: VoiceManager

  constructor(public readonly userId: string) {
    this.voice = new VoiceManager(this)
  }

  /** Wire up a glasses connection — sets up all event listeners */
  setAppSession(session: AppSession): void {
    this.appSession = session
    this.voice.setup(session)
    console.log(`[session] glasses connected: user=${this.userId}`)
  }

  /** Disconnect glasses but keep user alive (dashboard stays) */
  clearAppSession(): void {
    this.voice.destroy()
    this.appSession = null
    console.log(`[session] glasses disconnected: user=${this.userId}`)
  }

  /** Nuke everything — call on full disconnect */
  cleanup(): void {
    this.voice.destroy()
    this.appSession = null
    this.activeInstanceId = null
    console.log(`[session] cleaned up: user=${this.userId}`)
  }
}
