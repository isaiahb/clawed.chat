/**
 * Relay broker upgrade-parsing — the front door for the glasses<->OpenClaw
 * channel. parseRelayUpgrade decides whether an incoming WebSocket upgrade is a
 * valid relay connection (and tags it for the dispatcher). Getting this wrong
 * either drops legitimate pairings or lets garbage in, so it's worth pinning.
 */
import {test, expect} from "bun:test"
import {parseRelayUpgrade} from "../src/backend/api/relay"

const upgrade = (qs: string) =>
  parseRelayUpgrade(new Request(`https://api.clawed.chat/api/relay${qs}`))

test("accepts a valid agent connection", () => {
  expect(upgrade("?role=agent&pair=clawed-demo")).toEqual({
    kind: "relay",
    role: "agent",
    pair: "clawed-demo",
  })
})

test("accepts a valid glasses connection", () => {
  expect(upgrade("?role=glasses&pair=clawed-demo")).toEqual({
    kind: "relay",
    role: "glasses",
    pair: "clawed-demo",
  })
})

test("trims surrounding whitespace from the pair code", () => {
  expect(upgrade("?role=agent&pair=%20clawed-demo%20")?.pair).toBe("clawed-demo")
})

test("rejects a non-relay path", () => {
  expect(
    parseRelayUpgrade(new Request("https://api.clawed.chat/api/health?role=agent&pair=clawed-demo")),
  ).toBeNull()
})

test("rejects an unknown role", () => {
  expect(upgrade("?role=hacker&pair=clawed-demo")).toBeNull()
})

test("rejects a missing pair code", () => {
  expect(upgrade("?role=agent")).toBeNull()
})

test("rejects a pair code that is too short or too long", () => {
  expect(upgrade("?role=agent&pair=abc")).toBeNull() // < 4 chars
  expect(upgrade(`?role=agent&pair=${"x".repeat(65)}`)).toBeNull() // > 64 chars
})
