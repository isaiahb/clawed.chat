/**
 * Clawed miniapp UI — a viewer over the always-on background controller.
 *
 * Reads state via "state:snapshot", sends commands over the typed bus.
 * Zero session.* calls here — glasses logic lives in the background layer.
 */

import {useEffect, useRef, useState} from "react"
import {MiniappHeader} from "@mentra/miniapp/ui"
import type {Settings, StateSnapshot} from "../shared/types"
import {DEFAULT_SETTINGS} from "../shared/types"

const STATUS_LABEL: Record<StateSnapshot["connection"], string> = {
  unconfigured: "Not configured",
  connecting: "Connecting…",
  authenticating: "Authenticating…",
  connected: "Connected",
  disconnected: "Reconnecting…",
}

export function App(): React.JSX.Element {
  const [state, setState] = useState<StateSnapshot | null>(null)
  const [draft, setDraft] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = mentra.on("state:snapshot", (snapshot) => setState(snapshot))
    mentra.send("state:request", {})
    return unsub
  }, [])

  useEffect(() => {
    threadRef.current?.scrollTo({top: threadRef.current.scrollHeight, behavior: "smooth"})
  }, [state?.messages])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    mentra.send("chat:send", {text})
    setDraft("")
  }

  const connection = state?.connection ?? "unconfigured"
  const needsSetup = connection === "unconfigured"

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

      <div className={`status status--${connection}`}>
        <span className="status-dot" />
        {state?.listening ? "🦞 Listening…" : STATUS_LABEL[connection]}
      </div>

      {showSettings || needsSetup ? (
        <SettingsPanel
          snapshot={state}
          onSaved={() => setShowSettings(false)}
        />
      ) : (
        <>
          <div className="thread" ref={threadRef}>
            {(state?.messages ?? []).length === 0 && (
              <div className="empty">
                <div className="empty-claw">🦞</div>
                <p>Say <strong>“Hey Clawed”</strong> through your glasses,</p>
                <p>or type to your OpenClaw below.</p>
              </div>
            )}
            {(state?.messages ?? []).map((msg) => (
              <div key={msg.id} className={`bubble bubble--${msg.role} ${msg.status === "error" ? "bubble--error" : ""}`}>
                {msg.vision && <span className="vision-tag">👀 vision</span>}
                <span>{msg.text || "…"}</span>
                {msg.status === "streaming" && <span className="cursor">▍</span>}
              </div>
            ))}
          </div>

          <div className="composer">
            <button
              type="button"
              className="camera-btn"
              title="Ask about what you're seeing"
              onClick={() => mentra.send("vision:ask", {question: "What am I looking at?"})}
            >
              👀
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Message your OpenClaw…"
            />
            <button type="button" className="send-btn" onClick={send} disabled={!draft.trim()}>
              ↑
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function SettingsPanel({
  snapshot,
  onSaved,
}: {
  snapshot: StateSnapshot | null
  onSaved: () => void
}): React.JSX.Element {
  const current = snapshot?.settings
  const [gatewayUrl, setGatewayUrl] = useState(current?.gatewayUrl ?? "")
  const [gatewayToken, setGatewayToken] = useState("")
  const [visionUrl, setVisionUrl] = useState(current?.visionUrl ?? DEFAULT_SETTINGS.visionUrl)
  const [visionToken, setVisionToken] = useState("")
  const [wakeWordEnabled, setWakeWordEnabled] = useState(current?.wakeWordEnabled ?? true)

  const save = () => {
    const patch: Partial<Settings> = {gatewayUrl: gatewayUrl.trim(), visionUrl: visionUrl.trim(), wakeWordEnabled}
    // Only overwrite secrets the user actually retyped
    if (gatewayToken.trim()) patch.gatewayToken = gatewayToken.trim()
    if (visionToken.trim()) patch.visionToken = visionToken.trim()
    mentra.send("settings:save", patch)
    onSaved()
  }

  return (
    <div className="settings">
      <h2>Connect your OpenClaw</h2>
      <p className="hint">
        Clawed talks <em>directly</em> to your own OpenClaw gateway — no middleman cloud. Find your
        gateway address in OpenClaw’s config (default port 18789).
      </p>

      <label>
        Gateway URL
        <input
          value={gatewayUrl}
          onChange={(e) => setGatewayUrl(e.target.value)}
          placeholder="ws://192.168.1.20:18789"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>

      <label>
        Gateway token {current?.gatewayTokenSet && <span className="set-tag">saved ✓</span>}
        <input
          type="password"
          value={gatewayToken}
          onChange={(e) => setGatewayToken(e.target.value)}
          placeholder={current?.gatewayTokenSet ? "••••••••  (leave blank to keep)" : "your gateway token"}
        />
      </label>

      <label>
        Vision endpoint
        <input
          value={visionUrl}
          onChange={(e) => setVisionUrl(e.target.value)}
          placeholder={DEFAULT_SETTINGS.visionUrl}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>

      <label>
        Vision token {current?.visionTokenSet && <span className="set-tag">saved ✓</span>}
        <input
          type="password"
          value={visionToken}
          onChange={(e) => setVisionToken(e.target.value)}
          placeholder={current?.visionTokenSet ? "••••••••  (leave blank to keep)" : "optional bearer token"}
        />
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={wakeWordEnabled}
          onChange={(e) => setWakeWordEnabled(e.target.checked)}
        />
        Listen for “Hey Clawed”
      </label>

      <button type="button" className="save-btn" onClick={save} disabled={!gatewayUrl.trim()}>
        Save & connect
      </button>
    </div>
  )
}
