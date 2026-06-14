/**
 * Clawed miniapp UI — a viewer over the always-on background controller.
 * Two screens: Pair (enter the code) and Live (talk / hear / look).
 * Zero session.* here — everything goes over the typed channel bus.
 */

import {useEffect, useRef, useState} from "react"
import {MiniappHeader} from "@mentra/miniapp/ui"
import type {StateSnapshot} from "../shared/types"
import {DEFAULT_SETTINGS} from "../shared/types"

const STATUS: Record<StateSnapshot["conn"], string> = {
  unpaired: "Enter your pair code",
  connecting: "Connecting…",
  waiting: "Waiting for your OpenClaw…",
  paired: "Connected",
  disconnected: "Reconnecting…",
}

export function App(): React.JSX.Element {
  const [state, setState] = useState<StateSnapshot | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = mentra.on("state:snapshot", (s) => setState(s))
    mentra.send("ui:request-state", {})
    return unsub
  }, [])

  useEffect(() => {
    threadRef.current?.scrollTo({top: threadRef.current.scrollHeight, behavior: "smooth"})
  }, [state?.lines])

  const conn = state?.conn ?? "unpaired"
  const needsPair = conn === "unpaired" || showSettings

  return (
    <div className="app">
      <MiniappHeader
        title="Clawed"
        right={
          <button type="button" className="icon-btn" onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? "✕" : "⚙"}
          </button>
        }
      />

      <div className={`status status--${conn}`}>
        <span className="status-dot" />
        {state?.listening ? "🎙 Listening…" : STATUS[conn]}
      </div>

      {needsPair ? (
        <PairScreen snapshot={state} onSaved={() => setShowSettings(false)} />
      ) : (
        <>
          <div className="thread" ref={threadRef}>
            {(state?.lines ?? []).length === 0 && (
              <div className="empty">
                <div className="empty-claw">🦞</div>
                <p>Press the glasses button (or the mic below)</p>
                <p>and talk to your OpenClaw.</p>
              </div>
            )}
            {(state?.lines ?? []).map((l) => (
              <div key={l.id} className={`bubble bubble--${l.role}`}>
                {l.role === "claw" ? "🦞 " : l.role === "you" ? "" : ""}
                {l.text}
              </div>
            ))}
          </div>

          <div className="composer">
            <button
              type="button"
              className="camera-btn"
              title="Ask what you're looking at"
              onClick={() => mentra.send("ui:photo", {})}
            >
              👀
            </button>
            <button
              type="button"
              className={`talk-btn ${state?.listening ? "talk-btn--on" : ""}`}
              onClick={() => mentra.send("ui:talk", {})}
            >
              {state?.listening ? "■ Stop & send" : "🎙 Talk"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function PairScreen({
  snapshot,
  onSaved,
}: {
  snapshot: StateSnapshot | null
  onSaved: () => void
}): React.JSX.Element {
  const [code, setCode] = useState(snapshot?.settings.pairCode ?? DEFAULT_SETTINGS.pairCode)

  const save = () => {
    mentra.send("ui:save-settings", {pairCode: code.trim()})
    onSaved()
  }

  return (
    <div className="settings">
      <h2>Pair with your OpenClaw</h2>
      <p className="hint">
        Run the Clawed connector next to your OpenClaw, then enter the same pair
        code here. Your glasses and your agent meet over the clawed relay — no
        setup on the agent's machine beyond the connector.
      </p>
      <label>
        Pair code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="clawed-demo"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>
      <button type="button" className="save-btn" onClick={save} disabled={!code.trim()}>
        Pair & connect
      </button>
    </div>
  )
}
