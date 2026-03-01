import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { IntroSplash } from "@/components/shared/IntroSplash";

// Layouts (eagerly loaded — they wrap everything)
import SiteLayout from "@/layouts/SiteLayout";
import AppLayout from "@/layouts/AppLayout";

// ─── Lazy-loaded Site Pages ───
const Home = lazy(() => import("@/pages/site/Home"));
const Pricing = lazy(() => import("@/pages/site/Pricing"));
const Docs = lazy(() => import("@/pages/site/Docs"));
const SignIn = lazy(() => import("@/pages/site/SignIn"));
const NotFound = lazy(() => import("@/pages/site/NotFound"));

// ─── Lazy-loaded App Pages (only 3: Ask, Connections, Settings) ───
const AskPage = lazy(() => import("@/pages/app/AskPage"));
const ConnectionsPage = lazy(() => import("@/pages/app/ConnectionsPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));

// ─── Query Client ───
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// ─── Session-based intro logic ───
// Only show the intro splash once per browser session.
// After it plays, we stash a flag in sessionStorage so
// refreshes / navigations within the same tab skip it.
const INTRO_KEY = "clawed-intro-played";

function shouldShowIntro(): boolean {
  try {
    return !sessionStorage.getItem(INTRO_KEY);
  } catch {
    return false; // storage blocked → skip intro
  }
}

function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // ignore
  }
}

// ─── Suspense Fallback (shown during lazy chunk loads) ───
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin border-2 border-claw-red/20 border-t-claw-red" />
          <div className="absolute inset-1 animate-[spin_1.5s_linear_infinite_reverse] border border-claw-red/10 border-b-claw-red/40" />
        </div>
        <span className="text-xs text-muted-foreground tracking-widest uppercase">
          Loading…
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [introComplete, setIntroComplete] = useState(!shouldShowIntro());

  // When the intro finishes (or is skipped), mark it and reveal the app
  const handleIntroComplete = () => {
    markIntroPlayed();
    setIntroComplete(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {/* ─── Intro Splash (once per session) ─── */}
        {!introComplete && (
          <IntroSplash
            onComplete={handleIntroComplete}
            duration={4200}
            skippable
          />
        )}

        {/* ─── Main Application ─── */}
        <div
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
                {/* ─── Public Site Routes (landing page, pricing, docs) ─── */}
                <Route element={<SiteLayout />}>
                  <Route index element={<Home />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="docs" element={<Docs />} />
                </Route>

                {/* ─── Auth (no layout chrome) ─── */}
                <Route path="sign-in" element={<SignIn />} />

                {/* ─── App Routes — only Ask, Connections, Settings ─── */}
                <Route path="app" element={<AppLayout />}>
                  {/* Ask is the dashboard / default landing */}
                  <Route index element={<AskPage />} />
                  <Route path="ask" element={<Navigate to="/app" replace />} />
                  <Route path="connections" element={<ConnectionsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  {/* Catch dead app routes → redirect to Ask */}
                  <Route path="*" element={<Navigate to="/app" replace />} />
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
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
                borderRadius: "0px",
              },
            }}
          />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
