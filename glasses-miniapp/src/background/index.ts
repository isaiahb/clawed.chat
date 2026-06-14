/**
 * Background JSContext entry point. The MentraOS host calls this once CONNECT
 * completes. All glasses logic lives in Controller (always-on, session-scoped).
 */

import {registerMiniapp} from "@mentra/miniapp/background"
import "../shared/channels"
import {Controller} from "./controller"

registerMiniapp(async (session) => {
  const controller = new Controller(session)
  await controller.start()
})
