import type { Context } from "hono";
import { checkGatewayHealth } from "./openclaw";

/** GET /health */
export async function getHealth(c: Context) {
  const openclaw = await checkGatewayHealth();
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    openclaw,
  });
}
