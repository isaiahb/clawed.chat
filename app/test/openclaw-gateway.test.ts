/**
 * OpenClaw gateway helpers. extractText pulls the agent's reply out of a
 * gateway message frame; COLD_START_RE detects the "waking up" greeting a
 * fresh session sometimes returns instead of answering, so askOpenClaw can
 * re-ask on the now-warm session. Both are central to /api/judge and /api/vision.
 */
import {test, expect} from "bun:test"
import {extractText, COLD_START_RE} from "../src/backend/services/openclaw-gateway"

test("extractText joins text blocks from a content array", () => {
  const msg = {
    content: [
      {type: "text", text: "The capital of France "},
      {type: "image", url: "ignored"},
      {type: "text", text: "is Paris."},
    ],
  }
  expect(extractText(msg)).toBe("The capital of France is Paris.")
})

test("extractText handles a plain string content", () => {
  expect(extractText({content: "hello"})).toBe("hello")
})

test("extractText returns empty for malformed input", () => {
  expect(extractText(null)).toBe("")
  expect(extractText("not an object")).toBe("")
  expect(extractText({})).toBe("")
})

test("COLD_START_RE flags the cold-start greeting", () => {
  for (const greeting of [
    "I just came online — how can I help?",
    "Who am I?",
    "who are you",
    "I'm now online and ready.",
  ]) {
    expect(COLD_START_RE.test(greeting)).toBe(true)
  }
})

test("COLD_START_RE leaves a real answer alone", () => {
  expect(COLD_START_RE.test("The capital of France is Paris.")).toBe(false)
  expect(COLD_START_RE.test("You're looking at a red coffee mug on a desk.")).toBe(false)
})
