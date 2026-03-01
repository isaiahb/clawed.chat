/**
 * ClawedChat — MentraOS AppServer for clawed.chat
 *
 * Handles the glasses lifecycle (onSession/onStop).
 * All per-user state is managed by the UserSession class.
 */

import {AppServer, AppSession} from "@mentra/sdk"
import {UserSession} from "./session/UserSession"

export interface ClawedChatConfig {
  packageName: string
  apiKey: string
  port: number
  cookieSecret?: string
}

export class ClawedChat extends AppServer {
  constructor(config: ClawedChatConfig) {
    super({
      packageName: config.packageName,
      apiKey: config.apiKey,
      port: config.port,
      cookieSecret: config.cookieSecret,
    })
  }

  /** Called when a user launches the app on their glasses */
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    console.log(`[glasses] session started: user=${userId} session=${sessionId}`)
    const userSession = UserSession.getOrCreate(userId)
    userSession.setAppSession(session)
  }

  /** Called when a user closes the app or disconnects */
  protected async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    console.log(`[glasses] session stopped: user=${userId} reason=${reason}`)
    UserSession.remove(userId)
  }
}
