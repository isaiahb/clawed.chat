import {useEffect, useMemo, useRef, useState} from "react"

type Stage = "welcome" | "auth" | "setup" | "connected" | "offline"
type StepStatus = "pending" | "running" | "done" | "error"
type LogLevel = "info" | "success" | "warn" | "error"

type SetupStep = {
  id: string
  title: string
  hint: string
  durationMs: number
  success: string
}

type SetupStepState = SetupStep & {status: StepStatus}

type LogLine = {
  id: number
  at: Date
  level: LogLevel
  text: string
}

const stepsTemplate: SetupStep[] = [
  {
    id: "openclaw-check",
    title: "Check local OpenClaw",
    hint: "Detect existing install + daemon",
    durationMs: 900,
    success: "OpenClaw detected on this Mac",
  },
  {
    id: "configure",
    title: "Apply clawed profile",
    hint: "Channel + gateway defaults",
    durationMs: 1000,
    success: "Local profile configured",
  },
  {
    id: "gateway",
    title: "Start OpenClaw gateway",
    hint: "Verify localhost:18789 health",
    durationMs: 900,
    success: "Gateway healthy",
  },
  {
    id: "register",
    title: "Register instance",
    hint: "POST /api/desktop/register",
    durationMs: 1000,
    success: "Machine registered in dashboard",
  },
  {
    id: "heartbeat",
    title: "Begin heartbeat loop",
    hint: "POST /api/desktop/heartbeat every 30s",
    durationMs: 700,
    success: "Heartbeat loop active",
  },
]

const levelClass: Record<LogLevel, string> = {
  info: "text-slate-300",
  success: "text-emerald-300",
  warn: "text-amber-300",
  error: "text-rose-300",
}

const now = () => Date.now() + Math.floor(Math.random() * 10_000)

function ts(d: Date) {
  return d.toLocaleTimeString([], {hour12: false})
}

function App() {
  const [stage, setStage] = useState<Stage>("welcome")
  const [steps, setSteps] = useState<SetupStepState[]>(() =>
    stepsTemplate.map((s) => ({...s, status: "pending"})),
  )
  const [logs, setLogs] = useState<LogLine[]>([])
  const [connectedAt, setConnectedAt] = useState<Date | null>(null)
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<Date | null>(null)

  const runIdRef = useRef(0)
  const timersRef = useRef<number[]>([])
  const heartbeatRef = useRef<number | null>(null)
  const offlineTimeoutRef = useRef<number | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  const machineName = "Isaiah's Mac mini"
  const instanceId = "local_mock_macmini_01"

  const pushLog = (level: LogLevel, text: string) => {
    setLogs((prev) => [...prev, {id: now(), at: new Date(), level, text}].slice(-300))
  }

  const clearTimers = () => {
    for (const t of timersRef.current) {
      window.clearTimeout(t)
    }
    timersRef.current = []

    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    if (offlineTimeoutRef.current) {
      window.clearTimeout(offlineTimeoutRef.current)
      offlineTimeoutRef.current = null
    }
  }

  const setStep = (id: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? {...s, status} : s)))
  }

  const reset = () => {
    clearTimers()
    runIdRef.current += 1
    setStage("welcome")
    setSteps(stepsTemplate.map((s) => ({...s, status: "pending"})))
    setLogs([])
    setConnectedAt(null)
    setLastHeartbeatAt(null)
  }

  const runSetup = (index: number, runId: number) => {
    const step = stepsTemplate[index]
    if (!step || runIdRef.current !== runId) {
      setStage("connected")
      const at = new Date()
      setConnectedAt(at)
      setLastHeartbeatAt(at)
      pushLog("success", "Desktop connected. Local instance is now online.")

      heartbeatRef.current = window.setInterval(() => {
        const beat = new Date()
        setLastHeartbeatAt(beat)
        pushLog("info", "POST /api/desktop/heartbeat -> 200 (mock)")
      }, 8000)
      return
    }

    setStep(step.id, "running")
    pushLog("info", `${step.title}...`)

    const timer = window.setTimeout(() => {
      if (runIdRef.current !== runId) {
        return
      }
      setStep(step.id, "done")
      pushLog("success", step.success)
      runSetup(index + 1, runId)
    }, step.durationMs)

    timersRef.current.push(timer)
  }

  const begin = () => {
    clearTimers()
    runIdRef.current += 1
    const runId = runIdRef.current

    setStage("auth")
    setLogs([])
    setSteps(stepsTemplate.map((s) => ({...s, status: "pending"})))
    pushLog("info", "Opening browser for Clerk sign-in (mock)")

    const authTimer = window.setTimeout(() => {
      if (runIdRef.current !== runId) {
        return
      }
      pushLog("success", "Deep-link callback received: clawed-chat://auth?code=mock")
      setStage("setup")
      runSetup(0, runId)
    }, 1200)

    timersRef.current.push(authTimer)
  }

  const pauseApp = () => {
    if (stage !== "connected") {
      return
    }
    pushLog("warn", "App paused. Waiting 90s grace before offline.")
    setStage("offline")

    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    offlineTimeoutRef.current = window.setTimeout(() => {
      pushLog("warn", "No heartbeat for 90s. Instance marked offline.")
    }, 3000)
  }

  const resumeApp = () => {
    if (stage !== "offline") {
      return
    }
    setStage("connected")
    pushLog("success", "App resumed. Heartbeat restored.")

    const beat = new Date()
    setLastHeartbeatAt(beat)
    heartbeatRef.current = window.setInterval(() => {
      const t = new Date()
      setLastHeartbeatAt(t)
      pushLog("info", "POST /api/desktop/heartbeat -> 200 (mock)")
    }, 8000)
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const statusLabel = useMemo(() => {
    if (stage === "connected") return "Running"
    if (stage === "offline") return "Offline"
    if (stage === "setup" || stage === "auth") return "Configuring"
    return "Not Connected"
  }, [stage])

  return (
    <div className="desktop-shell">
      <div className="window">
        <aside className="left-panel">
          <p className="eyebrow">Desktop Companion</p>
          <h1>Set up OpenClaw on this Mac</h1>
          <p className="sub">
            Focused onboarding for local install, desktop auth, and dashboard registration.
          </p>

          <div className="stat-grid">
            <div className="stat-card">
              <span>Machine</span>
              <strong>{machineName}</strong>
            </div>
            <div className="stat-card">
              <span>Status</span>
              <strong>{statusLabel}</strong>
            </div>
            <div className="stat-card">
              <span>Instance</span>
              <strong>{instanceId}</strong>
            </div>
          </div>

          <div className="actions">
            {stage === "welcome" && <button onClick={begin}>Sign in and connect</button>}
            {stage === "connected" && <button onClick={pauseApp}>Pause app</button>}
            {stage === "offline" && <button onClick={resumeApp}>Resume app</button>}
            <button className="secondary" onClick={reset}>Reset flow</button>
          </div>

          <p className="small-note">
            User stories covered: sign-in, first-time setup, ongoing heartbeat, offline detection.
          </p>
        </aside>

        <main className="right-panel">
          <section className="card">
            <div className="card-head">
              <h2>Onboarding progress</h2>
              <span>{stage}</span>
            </div>

            <div className="steps">
              {steps.map((step) => (
                <div className={`step step-${step.status}`} key={step.id}>
                  <div className="dot" />
                  <div>
                    <p className="step-title">{step.title}</p>
                    <p className="step-hint">{step.hint}</p>
                  </div>
                  <span className="step-status">{step.status}</span>
                </div>
              ))}
            </div>

            <div className="meta">
              <span>Connected: {connectedAt ? ts(connectedAt) : "-"}</span>
              <span>Last heartbeat: {lastHeartbeatAt ? ts(lastHeartbeatAt) : "-"}</span>
            </div>
          </section>

          <section className="card logs">
            <div className="card-head">
              <h2>Desktop console</h2>
              <span>{logs.length} entries</span>
            </div>
            <div className="log-wrap" ref={logRef}>
              {logs.length === 0 && <p className="log-empty">No logs yet</p>}
              {logs.map((line) => (
                <div className="log-line" key={line.id}>
                  <span className="log-ts">[{ts(line.at)}]</span>
                  <span className={levelClass[line.level]}>{line.text}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
