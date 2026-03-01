import {useCallback, useEffect, useMemo, useRef, useState} from "react"

type Phase = "welcome" | "auth" | "setup" | "ready" | "error"
type StepStatus = "pending" | "running" | "done" | "error"
type LogLevel = "info" | "success" | "warn" | "error"

type SetupStep = {
  id: string
  title: string
  detail: string
  durationMs: number
  command: string
  successLog: string
}

type SetupStepState = SetupStep & {
  status: StepStatus
}

type RuntimeLog = {
  id: number
  at: Date
  level: LogLevel
  source: "desktop" | "setup" | "api"
  message: string
}

const setupBlueprint: SetupStep[] = [
  {
    id: "detect",
    title: "Detect local OpenClaw",
    detail: "Checking global install + daemon state",
    durationMs: 1200,
    command: "openclaw --version && openclaw status",
    successLog: "OpenClaw detected at /usr/local/bin/openclaw",
  },
  {
    id: "configure",
    title: "Apply clawed profile",
    detail: "Writing local channel + gateway defaults",
    durationMs: 1300,
    command: "openclaw config set channels.clawed.enabled true",
    successLog: "Channel profile configured (clawed)",
  },
  {
    id: "plugin",
    title: "Install channel plugin",
    detail: "Provisioning ~/.openclaw/extensions/clawed",
    durationMs: 1100,
    command: "cp -r openclaw-channel-clawed ~/.openclaw/extensions/clawed",
    successLog: "Plugin loaded: clawed (1/1)",
  },
  {
    id: "secure",
    title: "Secure gateway",
    detail: "Generating scoped token + loopback policy",
    durationMs: 1400,
    command: "openclaw onboard --non-interactive --install-daemon",
    successLog: "Gateway token minted and daemon validated",
  },
  {
    id: "register",
    title: "Register with clawed.chat",
    detail: "Mocking /api/desktop/register",
    durationMs: 1000,
    command: "POST /api/desktop/register",
    successLog: "Local instance registered in dashboard",
  },
  {
    id: "heartbeat",
    title: "Start heartbeat loop",
    detail: "Mocking /api/desktop/heartbeat every 30s",
    durationMs: 800,
    command: "POST /api/desktop/heartbeat",
    successLog: "Heartbeat loop online",
  },
]

const pad = (value: number) => String(value).padStart(2, "0")

const fmtTime = (date: Date) => {
  const h = pad(date.getHours())
  const m = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `${h}:${m}:${s}`
}

const levelColor: Record<LogLevel, string> = {
  info: "text-slate-300",
  success: "text-emerald-300",
  warn: "text-amber-300",
  error: "text-rose-300",
}

function ClawLogo() {
  return (
    <svg
      viewBox="-14 -14 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-7 w-7"
    >
      <path
        d="M-8 1.5 C-8 1.5,-5 6,1.5 7.5 C5 8,9 6,10.5 3 C10.5 3,7.5 4.5,4.5 3.5 C1.5 2.5,-3 1.5,-8 1.5Z"
        fill="#8B0000"
        stroke="#aa0000"
        strokeWidth="0.4"
      />
      <path
        d="M-8 -0.5 C-8 -0.5,-5 -6,1.5 -7.5 C5 -8,9 -4.5,10.5 -1.5 C10.5 -1.5,7.5 -3.5,4.5 -3 C1.5 -2,-3 -0.5,-8 -0.5Z"
        fill="#cc0000"
        stroke="#ee2222"
        strokeWidth="0.4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 -8 0;-6 -8 0;0 -8 0"
          dur="1.8s"
          repeatCount="indefinite"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
          calcMode="spline"
        />
      </path>
      <circle
        cx={-8}
        cy={0.5}
        r={2.2}
        fill="#550000"
        stroke="#770000"
        strokeWidth="0.4"
      />
    </svg>
  )
}

function StepBadge({status}: {status: StepStatus}) {
  if (status === "done") {
    return <span className="status-dot bg-emerald-400" />
  }

  if (status === "running") {
    return <span className="status-dot status-dot-pulse bg-claw-red" />
  }

  if (status === "error") {
    return <span className="status-dot bg-rose-400" />
  }

  return <span className="status-dot bg-slate-500/70" />
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("welcome")
  const [steps, setSteps] = useState<SetupStepState[]>(
    () => setupBlueprint.map((step) => ({...step, status: "pending"})),
  )
  const [logs, setLogs] = useState<RuntimeLog[]>([])
  const [mockFailure, setMockFailure] = useState(false)
  const [connectedSince, setConnectedSince] = useState<Date | null>(null)

  const runRef = useRef(0)
  const timerIdsRef = useRef<number[]>([])
  const heartbeatIdRef = useRef<number | null>(null)
  const logPanelRef = useRef<HTMLDivElement | null>(null)

  const instanceId = useMemo(() => "local_mock_macmini_01", [])

  const trackTimer = (id: number) => {
    timerIdsRef.current.push(id)
    return id
  }

  const clearTimers = useCallback(() => {
    for (const id of timerIdsRef.current) {
      window.clearTimeout(id)
    }
    timerIdsRef.current = []

    if (heartbeatIdRef.current) {
      window.clearInterval(heartbeatIdRef.current)
      heartbeatIdRef.current = null
    }
  }, [])

  const addLog = useCallback((level: LogLevel, source: RuntimeLog["source"], message: string) => {
    setLogs((prev) => {
      const next: RuntimeLog[] = [...prev, {
        id: Date.now() + Math.floor(Math.random() * 1000),
        at: new Date(),
        level,
        source,
        message,
      }]

      if (next.length > 400) {
        return next.slice(next.length - 400)
      }

      return next
    })
  }, [])

  const setStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setSteps((prev) => prev.map((step) => {
      if (step.id !== stepId) {
        return step
      }

      return {...step, status}
    }))
  }, [])

  const resetFlow = useCallback((preserveLogs = false) => {
    clearTimers()
    runRef.current += 1
    setPhase("welcome")
    setSteps(setupBlueprint.map((step) => ({...step, status: "pending"})))
    setConnectedSince(null)

    if (!preserveLogs) {
      setLogs([])
    }
  }, [clearTimers])

  const markConnected = useCallback(() => {
    setConnectedSince(new Date())
    setPhase("ready")
    addLog("success", "setup", "Desktop companion ready. Local OpenClaw is now connected.")

    heartbeatIdRef.current = window.setInterval(() => {
      addLog("info", "api", "POST /api/desktop/heartbeat → 200 (mock)")
    }, 8000)
  }, [addLog])

  const runStep = useCallback((runId: number, index: number, shouldFail: boolean) => {
    if (runRef.current !== runId) {
      return
    }

    const step = setupBlueprint[index]
    if (!step) {
      markConnected()
      return
    }

    setStepStatus(step.id, "running")
    addLog("info", "setup", `${step.command} ...`)

    trackTimer(window.setTimeout(() => {
      if (runRef.current !== runId) {
        return
      }

      const failHere = shouldFail && step.id === "register"
      if (failHere) {
        setStepStatus(step.id, "error")
        setPhase("error")
        addLog("error", "api", "POST /api/desktop/register → 401 Unauthorized (mock failure)")
        addLog("warn", "desktop", "Desktop mock paused. Fix auth and retry setup.")
        return
      }

      setStepStatus(step.id, "done")
      addLog("success", "setup", step.successLog)
      runStep(runId, index + 1, shouldFail)
    }, step.durationMs))
  }, [addLog, markConnected, setStepStatus])

  const beginAuthAndSetup = useCallback((shouldFail: boolean) => {
    clearTimers()
    runRef.current += 1
    const runId = runRef.current

    setMockFailure(shouldFail)
    setPhase("auth")
    setConnectedSince(null)
    setSteps(setupBlueprint.map((step) => ({...step, status: "pending"})))
    setLogs([])

    addLog("info", "desktop", "Opening browser for Clerk sign in (mock)")

    trackTimer(window.setTimeout(() => {
      if (runRef.current !== runId) {
        return
      }

      addLog("success", "desktop", "Deep link callback received: clawed-chat://auth?token=mock-token")
      addLog("info", "api", "Desktop session established (mock local token)")
      setPhase("setup")
      runStep(runId, 0, shouldFail)
    }, 1200))
  }, [addLog, clearTimers, runStep])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  useEffect(() => {
    if (!logPanelRef.current) {
      return
    }

    logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight
  }, [logs])

  const statusPill = useMemo(() => {
    if (phase === "ready") {
      return "Online"
    }

    if (phase === "error") {
      return "Needs Attention"
    }

    if (phase === "setup" || phase === "auth") {
      return "Configuring"
    }

    return "Disconnected"
  }, [phase])

  return (
    <div className="min-h-screen bg-shell text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-6 py-5">
        <header className="glass-card mb-5 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <ClawLogo />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Clawed Desktop</p>
              <h1 className="text-sm font-semibold tracking-tight text-slate-100">OpenClaw Local Companion</h1>
            </div>
          </div>

          <div className="status-pill">
            <span className={`status-dot ${phase === "ready" ? "bg-emerald-400" : phase === "error" ? "bg-rose-400" : "bg-amber-300"}`} />
            {statusPill}
          </div>
        </header>

        <main className="grid flex-1 grid-cols-12 gap-5">
          <section className="col-span-7 flex flex-col gap-5">
            <div className="glass-card flex-1 p-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-100">Mac Mini Auto-Setup Demo</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Mocking local OpenClaw setup and instant clawed.chat registration.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                  ElectroBun Mock
                </span>
              </div>

              {phase === "welcome" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-sm text-slate-300">
                      This demo simulates what users see: sign in, detect local OpenClaw,
                      auto-configure channel plugin, register in dashboard, then keep heartbeats alive.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="mini-card">
                      <p className="mini-label">Machine</p>
                      <p className="mini-value">Isaiah&apos;s Mac mini</p>
                    </div>
                    <div className="mini-card">
                      <p className="mini-label">OpenClaw</p>
                      <p className="mini-value">2026.2.26</p>
                    </div>
                    <div className="mini-card">
                      <p className="mini-label">Gateway</p>
                      <p className="mini-value">127.0.0.1:18789</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      className="btn-primary"
                      onClick={() => beginAuthAndSetup(false)}
                    >
                      Connect and Auto-Configure
                    </button>
                    <button
                      className="btn-subtle"
                      onClick={() => beginAuthAndSetup(true)}
                    >
                      Run Failure Scenario
                    </button>
                  </div>
                </div>
              )}

              {phase !== "welcome" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Setup Pipeline</p>
                    <div className="mt-3 space-y-2.5">
                      {steps.map((step) => (
                        <div
                          key={step.id}
                          className={`rounded-xl border px-3 py-2.5 transition ${step.status === "running" ? "border-claw-red/60 bg-claw-red/10" : "border-white/10 bg-white/5"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <StepBadge status={step.status} />
                              <p className="text-sm font-medium text-slate-100">{step.title}</p>
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{step.status}</p>
                          </div>
                          <p className="mt-1 pl-5 text-xs text-slate-400">{step.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {phase === "ready" && (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                      <p className="text-sm font-semibold text-emerald-200">Connected to clawed.chat</p>
                      <p className="mt-1 text-xs text-emerald-100/80">
                        Instance ID: <span className="font-mono">{instanceId}</span>
                        {connectedSince ? ` • since ${fmtTime(connectedSince)}` : ""}
                      </p>
                    </div>
                  )}

                  {phase === "error" && (
                    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
                      <p className="text-sm font-semibold text-rose-200">Mock auth failure injected</p>
                      <p className="mt-1 text-xs text-rose-100/80">
                        This path demonstrates retry UX before shipping real Clerk desktop token exchange.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button className="btn-primary" onClick={() => beginAuthAndSetup(mockFailure)}>
                      Replay Flow
                    </button>
                    <button className="btn-subtle" onClick={() => resetFlow(false)}>
                      Reset
                    </button>
                    <button className="btn-subtle" onClick={() => setLogs([])}>
                      Clear Console
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Integration Notes</p>
              <p className="mt-2 text-sm text-slate-300">
                UI is fully functional as a demo mock. Live Clerk token exchange and real
                <span className="mx-1 font-mono text-[12px] text-slate-200">/api/desktop/register</span>
                calls are intentionally not wired in this build.
              </p>
            </div>
          </section>

          <section className="col-span-5">
            <div className="glass-card flex h-full flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Desktop Console</p>
                <span className="rounded-full bg-black/30 px-2.5 py-1 font-mono text-[10px] text-slate-300">
                  {logs.length} lines
                </span>
              </div>

              <div ref={logPanelRef} className="h-[620px] overflow-y-auto bg-black/35 px-3 py-3 font-mono text-[12px] leading-5">
                {logs.length === 0 && (
                  <p className="px-2 py-2 text-slate-500">No runtime logs yet. Start the flow to populate console output.</p>
                )}

                {logs.map((log) => (
                  <div key={log.id} className="log-line">
                    <span className="log-ts">[{fmtTime(log.at)}]</span>
                    <span className="text-slate-500">[{log.source}]</span>
                    <span className={`${levelColor[log.level]}`}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
