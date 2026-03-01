/**
 * App — root component for clawed.chat dashboard
 *
 * Wraps with MentraAuth, renders a placeholder dashboard.
 * Clerk integration will be added once the package is configured.
 */

import {useState, useEffect, useCallback, createContext, useContext} from "react"
import {useMentraAuth} from "@mentra/react"

// ─── Theme Context ───────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: "light" | "dark"
  isDarkMode: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  isDarkMode: true,
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const {userId, isLoading, error, isAuthenticated} = useMentraAuth()

  // Theme state — default dark for the hacker aesthetic
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clawed-theme")
      if (saved === "dark" || saved === "light") return saved
    }
    return "dark"
  })

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem("clawed-theme", next)
      return next
    })
  }, [])

  // Apply dark class to document root
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  // Keyboard shortcut: Cmd+Shift+D to toggle theme
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        toggleTheme()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggleTheme])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-neutral-100" />
          <p className="text-sm text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-red-400 text-lg font-semibold mb-2">Authentication Error</h2>
          <p className="text-red-400/80 text-sm mb-4">{error}</p>
          <p className="text-neutral-500 text-xs">
            If you're opening this from a browser, MentraOS auth is for glasses only.
            Clerk auth for the web dashboard is coming soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={{theme, isDarkMode: theme === "dark", toggleTheme}}>
      <div className="font-sans bg-neutral-950 text-neutral-100 min-h-screen">
        <Dashboard userId={userId || "anonymous"} isAuthenticated={isAuthenticated} />
      </div>
    </ThemeContext.Provider>
  )
}

// ─── Dashboard (placeholder) ─────────────────────────────────────────────────

function Dashboard({userId, isAuthenticated}: {userId: string, isAuthenticated: boolean}) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐾</span>
          <h1 className="text-xl font-bold tracking-tight">clawed.chat</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500">
            {isAuthenticated ? `user: ${userId}` : "not signed in"}
          </span>
        </div>
      </header>

      {/* Empty state */}
      <div className="border border-dashed border-neutral-800 rounded-xl p-16 text-center">
        <div className="text-4xl mb-4">🤖</div>
        <h2 className="text-lg font-semibold mb-2">No agents yet</h2>
        <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
          Deploy your first OpenClaw AI agent to the cloud, or connect your Mac.
          Your agent can browse the web, manage files, send emails, and more.
        </p>
        <button
          className="px-6 py-2.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          onClick={() => console.log("TODO: deploy flow")}
        >
          Deploy your first agent
        </button>
      </div>

      {/* Feature cards (placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <FeatureCard
          emoji="☁️"
          title="Cloud Deploy"
          description="One-click GCP VM with OpenClaw pre-installed. ~60 seconds to running."
          status="coming soon"
        />
        <FeatureCard
          emoji="👓"
          title="Smart Glasses"
          description="Talk to your agent hands-free via Mentra glasses. Voice in, voice out."
          status={isAuthenticated ? "connected" : "not connected"}
        />
        <FeatureCard
          emoji="🌐"
          title="Watch Your Agent"
          description="Live browser view powered by Browser Use. See what your agent sees."
          status="coming soon"
        />
      </div>

      {/* Health check */}
      <div className="mt-8 text-center">
        <p className="text-xs text-neutral-600">
          API health: <HealthCheck />
        </p>
      </div>
    </div>
  )
}

// ─── Feature Card ────────────────────────────────────────────────────────────

function FeatureCard({emoji, title, description, status}: {
  emoji: string
  title: string
  description: string
  status: string
}) {
  return (
    <div className="border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors">
      <div className="text-2xl mb-3">{emoji}</div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-neutral-500 text-xs mb-3">{description}</p>
      <span className="text-[10px] uppercase tracking-wider text-neutral-600">{status}</span>
    </div>
  )
}

// ─── Health Check ────────────────────────────────────────────────────────────

function HealthCheck() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking")

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status === "ok" ? "ok" : "error"))
      .catch(() => setStatus("error"))
  }, [])

  if (status === "checking") return <span className="text-neutral-500">checking...</span>
  if (status === "ok") return <span className="text-green-500">✓ ok</span>
  return <span className="text-red-500">✗ unreachable</span>
}
