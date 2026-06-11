/**
 * Background JSContext entry point. The MentraOS host loads this inside a
 * per-miniapp JSContext and calls the handler once CONNECT completes.
 *
 * All glasses logic lives in AgentController (session-scoped, always-on).
 * The UI WebView is a viewer on top of it.
 */

import {registerMiniapp} from "@mentra/miniapp/background"
import "../shared/channels"
import {AgentController} from "./controller"

registerMiniapp(async (session) => {
  const controller = new AgentController(session)
  await controller.start()
})
