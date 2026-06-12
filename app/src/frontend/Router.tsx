import { lazy, Suspense, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "./components/ui/tooltip"
import { Toaster } from "./components/ui/sonner"
import { ScrollToTop } from "./components/shared/ScrollToTop"
import { IntroSplash } from "./components/shared/IntroSplash"

// Layouts (eagerly loaded — they wrap everything)
import SiteLayout from "./layouts/SiteLayout"
import AppLayout from "./layouts/AppLayout"

// ─── Lazy-loaded Site Pages ───
const Home = lazy(() => import("./pages/Home"))
const Demo = lazy(() => import("./pages/Demo"))
const Pricing = lazy(() => import("./pages/Pricing"))
const Docs = lazy(() => import("./pages/Docs"))
const SignIn = lazy(() => import("./pages/SignIn"))
const NotFound = lazy(() => import("./pages/NotFound"))

// ─── Lazy-loaded App Pages ───
const AgentsPage = lazy(() => import("./pages/app/AgentsPage"))
const ChatPage = lazy(() => import("./pages/app/ChatPage"))
const ConnectionsPage = lazy(() => import("./pages/app/ConnectionsPage"))
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"))

// ─── Query Client ───
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

// ─── Session-based intro logic ───
const INTRO_KEY = "clawed-intro-played"

function shouldShowIntro(): boolean {
  try {
    // ?intro=1 forces the intro to play (useful for demos)
    const params = new URLSearchParams(window.location.search)
    if (params.get("intro") === "1") return true

    return !sessionStorage.getItem(INTRO_KEY)
  } catch {
    return false
  }
}

function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_KEY, "1")
  } catch {
    // ignore
  }
}

// ─── Suspense Fallback ───
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full animate-spin border-2 border-claw-red/20 border-t-claw-red" />
          <div className="absolute inset-1 rounded-full animate-[spin_1.5s_linear_infinite_reverse] border border-claw-red/10 border-b-claw-red/40" />
        </div>
        <span className="text-xs text-muted-foreground tracking-widest uppercase">
          Loading…
        </span>
      </div>
    </div>
  )
}

// ─── Router ───

export default function Router() {
  const [introComplete, setIntroComplete] = useState(!shouldShowIntro())

  const handleIntroComplete = () => {
    markIntroPlayed()
    setIntroComplete(true)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {/* ─── Intro Splash (once per session) ─── */}
        {!introComplete && (
          <IntroSplash
            onComplete={handleIntroComplete}
            duration={5500}
            skippable
          />
        )}

        {/* ─── Main Application ─── */}
        <div
          className="min-h-screen flex flex-col bg-background"
          style={{
            opacity: introComplete ? 1 : 0,
            transition: "opacity 0.5s ease-in-out 0.1s",
            pointerEvents: introComplete ? "auto" : "none",
          }}
        >
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ─── Public Site Routes ─── */}
                <Route element={<SiteLayout />}>
                  <Route index element={<Home />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="docs" element={<Docs />} />
                </Route>

                {/* ─── Glasses POV experience (full-bleed, no chrome) ─── */}
                <Route path="demo" element={<Demo />} />

                {/* ─── Auth (no layout chrome) ─── */}
                <Route
                  path="sign-in"
                  element={
                    <>
                      <Unauthenticated>
                        <SignIn />
                      </Unauthenticated>
                      <Authenticated>
                        <Navigate to="/app/agents" replace />
                      </Authenticated>
                    </>
                  }
                />

                {/* ─── App Routes — protected by Auth ─── */}
                <Route
                  path="app"
                  element={
                    <>
                      <AuthLoading>
                        <PageLoader />
                      </AuthLoading>
                      <Authenticated>
                        <AppLayout />
                      </Authenticated>
                      <Unauthenticated>
                        <Navigate to="/sign-in" replace />
                      </Unauthenticated>
                    </>
                  }
                >
                  {/* /app → redirect to agents list */}
                  <Route index element={<Navigate to="/app/agents" replace />} />

                  {/* /app/agents — manage your deployed agents */}
                  <Route path="agents" element={<AgentsPage />} />

                  {/* /app/chat/:instanceId — chat with a specific agent */}
                  <Route path="chat/:instanceId" element={<ChatPage />} />

                  {/* /app/connections — Composio OAuth integrations */}
                  <Route path="connections" element={<ConnectionsPage />} />

                  {/* /app/settings — account, keys, preferences */}
                  <Route path="settings" element={<SettingsPage />} />

                  {/* Catch-all within /app */}
                  <Route path="*" element={<Navigate to="/app/agents" replace />} />
                </Route>

                {/* ─── 404 Catch-all ─── */}
                <Route element={<SiteLayout />}>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "oklch(from var(--card) l c h / 0.7)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
                borderRadius: "12px",
                backdropFilter: "blur(20px) saturate(1.4)",
                WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                boxShadow:
                  "0 4px 24px oklch(0 0 0 / 0.1), inset 0 1px 0 oklch(1 0 0 / 0.05)",
              },
            }}
          />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
