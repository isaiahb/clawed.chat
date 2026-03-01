import { useEffect, useRef, useState, useCallback } from "react"

// ─── Config ──────────────────────────────────────────────────────────────────

const BACKEND_URL = "https://clawed.chat"
const CLERK_SIGN_IN_URL = "https://clawed.chat/sign-in"
const HEARTBEAT_INTERVAL_MS = 30_000

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = "auth" | "progress" | "connected"

interface SetupStep {
  label: string
  detail: string
  durationMs: number
}

const SETUP_STEPS: SetupStep[] = [
  { label: "Checking system requirements", detail: "macOS 14+, 8 GB RAM", durationMs: 600 },
  { label: "Installing Bun runtime", detail: "Package manager & JS runtime", durationMs: 900 },
  { label: "Installing OpenClaw agent", detail: "AI agent framework v2026.2", durationMs: 1200 },
  { label: "Configuring your workspace", detail: "Gateway, auth & plugins", durationMs: 800 },
  { label: "Connecting to clawed.chat", detail: "Registering this machine", durationMs: 1000 },
  { label: "Starting agent gateway", detail: "Verifying connectivity", durationMs: 700 },
]

// ─── Tiny SVG icons (no deps) ────────────────────────────────────────────────

function ClawLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#dc2626" />
      <path
        d="M10 22c-2-2-2-5.5 0-7.5L11.5 13M14 19c-2-2-2-5.5 0-7.5L15.5 10M18 16c-2-2-2-5.5 0-7.5L19.5 7M22 22l-6-3-6 3"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#22c55e" fillOpacity="0.12" />
      <path d="M6.5 10.5l2 2 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="spin">
      <circle cx="10" cy="10" r="8" stroke="#e5e7eb" strokeWidth="2" />
      <path d="M18 10a8 8 0 00-8-8" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PendingDot() {
  return (
    <div className="w-5 h-5 flex items-center justify-center">
      <div className="w-[6px] h-[6px] rounded-full bg-gray-300" />
    </div>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline ml-1 -mt-px">
      <path d="M5.5 2.5h-2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1v-2M8.5 2.5h3m0 0v3m0-3L7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMachineName(): string {
  return "Isaiah's MacBook"
}

// ─── Auth Screen ─────────────────────────────────────────────────────────────

function AuthScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="animate-in flex flex-col items-center text-center max-w-sm mx-auto">
      {/* Logo */}
      <div className="mb-6">
        <ClawLogo className="w-16 h-16 claw-icon-glow rounded-2xl" />
      </div>

      <h1 className="text-[26px] font-bold tracking-tight text-gray-900">
        Welcome to Clawed
      </h1>

      <p className="mt-2 text-[15px] leading-relaxed text-gray-500">
        Set up your personal AI agent on this Mac.
        <br />
        It only takes about 30 seconds.
      </p>

      <button
        onClick={onSignIn}
        className="btn-claw mt-8 w-full max-w-[260px]"
      >
        Sign in to get started
      </button>

      <p className="mt-5 text-xs text-gray-400 leading-relaxed">
        Opens your browser to sign in with your clawed.chat account.
      </p>
    </div>
  )
}

// ─── Progress Screen ─────────────────────────────────────────────────────────

function ProgressScreen({
  steps,
  currentStep,
  done,
}: {
  steps: SetupStep[]
  currentStep: number
  done: boolean
}) {
  const waitingForAuth = currentStep < 0
  const pct = done ? 100 : waitingForAuth ? 0 : Math.round((currentStep / steps.length) * 100)

  return (
    <div className="animate-in w-full max-w-md mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-2">
        <ClawLogo className="w-8 h-8 rounded-lg" />
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          {done ? "All set!" : waitingForAuth ? "Waiting for sign-in…" : "Setting up your agent…"}
        </h2>
        <p className="text-xs text-gray-400 tracking-wide">
          {done
            ? "Your agent is ready."
            : waitingForAuth
              ? "Complete sign-in in your browser"
              : `Step ${Math.min(currentStep + 1, steps.length)} of ${steps.length}`}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        {steps.map((step, i) => {
          const status = waitingForAuth
            ? "pending"
            : i < currentStep ? "done" : i === currentStep && !done ? "running" : done ? "done" : "pending"

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 ${
                status === "running"
                  ? "bg-red-50/60"
                  : status === "pending"
                    ? "opacity-40"
                    : ""
              }`}
            >
              <div className="flex-shrink-0">
                {status === "done" && <CheckCircle />}
                {status === "running" && <Spinner />}
                {status === "pending" && <PendingDot />}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 leading-snug">
                  {step.label}
                </p>
                <p className="text-[11px] text-gray-400 leading-snug">
                  {step.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Connected Screen ────────────────────────────────────────────────────────

function ConnectedScreen({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <div className="animate-in flex flex-col items-center text-center max-w-sm mx-auto">
      {/* Status badge */}
      <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-50 border border-green-200">
        <span className="w-2 h-2 rounded-full bg-green-500 status-pulse" />
        <span className="text-xs font-semibold text-green-700 tracking-wide">Agent Online</span>
      </div>

      <h1 className="text-[26px] font-bold tracking-tight text-gray-900">
        Your agent is running
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-gray-500 max-w-xs">
        This Mac is now a personal AI agent connected to your clawed.chat account.
        Chat from the web, your phone, or smart glasses.
      </p>

      {/* Info card */}
      <div className="mt-6 w-full rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        <InfoRow label="Machine" value={getMachineName()} />
        <InfoRow label="Model" value="Claude Haiku 3.5" />
        <InfoRow label="Gateway" value="localhost:18789" />
        <InfoRow label="Status" value="Connected" valueClassName="text-green-600" />
      </div>

      <button
        onClick={onOpenDashboard}
        className="btn-claw mt-7 w-full max-w-[260px]"
      >
        Open dashboard
        <ExternalLinkIcon />
      </button>

      <p className="mt-5 text-xs text-gray-400 leading-relaxed">
        Keep this app running to keep your agent online.
        <br />
        Closing it will show your agent as offline.
      </p>
    </div>
  )
}

function InfoRow({
  label,
  value,
  valueClassName = "",
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className={`text-[13px] font-semibold text-gray-800 ${valueClassName}`}>{value}</span>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth")
  const [currentStep, setCurrentStep] = useState(0)
  const [setupDone, setSetupDone] = useState(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  const registerInstance = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/api/desktop/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ machine_name: getMachineName(), type: "local" }),
      })
    } catch {
      // non-fatal
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(async () => {
      try {
        await fetch(`${BACKEND_URL}/api/desktop/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ machine_name: getMachineName() }),
        })
      } catch {
        // silent
      }
    }, HEARTBEAT_INTERVAL_MS)
  }, [])

  // Run the fake install progress, then register for real
  const runSetupSequence = useCallback(() => {
    setScreen("progress")
    setCurrentStep(0)
    setSetupDone(false)

    let stepIndex = 0

    const runNextStep = () => {
      if (stepIndex >= SETUP_STEPS.length) {
        setSetupDone(true)
        registerInstance().finally(() => {
          startHeartbeat()
          setTimeout(() => setScreen("connected"), 600)
        })
        return
      }

      setCurrentStep(stepIndex)
      const step = SETUP_STEPS[stepIndex]
      stepIndex++
      setTimeout(runNextStep, step.durationMs)
    }

    setTimeout(runNextStep, 400)
  }, [registerInstance, startHeartbeat])

  const handleSignIn = useCallback(() => {
    // Open real Clerk sign-in in the user's browser
    window.open(CLERK_SIGN_IN_URL, "_blank")

    // Switch to a "waiting for sign-in" state, then after a short
    // delay (simulating the OAuth callback) proceed with setup.
    // In production this would listen for a real auth callback via
    // a localhost server or deep link.
    setScreen("progress")
    setCurrentStep(-1) // -1 = "Signing in..." before steps start

    // Wait for user to complete browser auth, then start setup
    setTimeout(() => {
      runSetupSequence()
    }, 3000)
  }, [runSetupSequence])

  const handleOpenDashboard = useCallback(() => {
    window.open(`${BACKEND_URL}/app/agents`, "_blank")
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center p-10 bg-gradient-to-b from-gray-50 to-white">
      {screen === "auth" && <AuthScreen onSignIn={handleSignIn} />}
      {screen === "progress" && (
        <ProgressScreen steps={SETUP_STEPS} currentStep={currentStep} done={setupDone} />
      )}
      {screen === "connected" && <ConnectedScreen onOpenDashboard={handleOpenDashboard} />}
    </div>
  )
}
