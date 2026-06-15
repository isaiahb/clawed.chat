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

const COMPOSIO_TOOLS = [
  {name: "Gmail", accent: "#ea4335", detail: "Unread + drafts"},
  {name: "Tavily", accent: "#55c8ff", detail: "Live web search"},
]

const DEMO_ACTIONS = [
  "Summarize unread email",
  "Search the web",
  "Draft a reply",
]

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
        <div className="status-copy">
          <span className="status-dot" />
          {state?.listening ? "Listening…" : STATUS[conn]}
        </div>
        <span className="status-meta">{conn === "paired" ? "OpenClaw live" : state?.settings.pairCode}</span>
      </div>

      {needsPair ? (
        <PairScreen snapshot={state} onSaved={() => setShowSettings(false)} />
      ) : (
        <>
          <div className="thread" ref={threadRef}>
            <DemoPanel conn={conn} />
            {(state?.lines ?? []).length === 0 && (
              <div className="empty">
                <div className="empty-claw" aria-hidden="true">🦞</div>
                <p>Ready for the next voice command.</p>
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
              className="clear-btn"
              title="Clear chat"
              disabled={(state?.lines ?? []).length === 0 && !state?.listening}
              onClick={() => mentra.send("ui:clear", {})}
            >
              ✕
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

function DemoPanel({conn}: {conn: StateSnapshot["conn"]}): React.JSX.Element {
  return (
    <section className="demo-panel" aria-label="Demo status">
      <div className="agent-card">
        <div>
          <p className="eyebrow">OpenClaw + tools</p>
          <h2>{conn === "paired" ? "Agent paired" : "Relay standby"}</h2>
        </div>
        <span className={`link-pill link-pill--${conn}`}>{conn === "paired" ? "Live" : "Syncing"}</span>
      </div>

      <div className="tool-header">
        <span>Composio tools</span>
        <strong>{COMPOSIO_TOOLS.length} ready</strong>
      </div>

      <div className="tool-strip" aria-label="Connected Composio tools">
        {COMPOSIO_TOOLS.map((tool) => (
          <div className="tool-card" key={tool.name} style={{"--accent": tool.accent} as React.CSSProperties}>
            <span className="tool-dot" />
            <strong>{tool.name}</strong>
            <small>{tool.detail}</small>
          </div>
        ))}
      </div>

      <div className="action-list" aria-label="Prepared demo actions">
        {DEMO_ACTIONS.map((action) => (
          <div className="action-row" key={action}>
            <span className="check-dot" />
            <span>{action}</span>
          </div>
        ))}
      </div>
    </section>
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
