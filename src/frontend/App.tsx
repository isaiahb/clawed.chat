import { useState, useEffect, useCallback, createContext, useContext, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMentraAuth } from "@mentra/react";
import { TooltipProvider } from "@frontend/components/ui/tooltip";
import { Toaster } from "@frontend/components/ui/sonner";
import { useAppStore } from "@frontend/stores/app-store";
import { ScrollToTop } from "@frontend/components/shared/ScrollToTop";
import { IntroSplash } from "@frontend/components/shared/IntroSplash";
import AppLayout from "@frontend/layouts/AppLayout";

// Lazy-loaded app pages (authenticated)
const AskPage = lazy(() => import("@frontend/pages/app/AskPage"));
const ConnectionsPage = lazy(() => import("@frontend/pages/app/ConnectionsPage"));
const SettingsPage = lazy(() => import("@frontend/pages/app/SettingsPage"));

// Lazy-loaded site pages (public)
const SiteLayout = lazy(() => import("@frontend/layouts/SiteLayout"));
const Home = lazy(() => import("@frontend/pages/site/Home"));
const Pricing = lazy(() => import("@frontend/pages/site/Pricing"));
const Docs = lazy(() => import("@frontend/pages/site/Docs"));
const SignIn = lazy(() => import("@frontend/pages/site/SignIn"));
const NotFound = lazy(() => import("@frontend/pages/site/NotFound"));

// ──────────────────────────────────────────────
// Theme Context (preserved for backward compatibility)
// ──────────────────────────────────────────────

interface ThemeContextValue {
  theme: "light" | "dark";
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  isDarkMode: false,
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary" />
    </div>
  );
}

// IntroSplash — once per session
const INTRO_KEY = "clawed-intro-played";
function shouldShowIntro(): boolean {
  try { return !sessionStorage.getItem(INTRO_KEY); }
  catch { return false; }
}
function markIntroPlayed(): void {
  try { sessionStorage.setItem(INTRO_KEY, "1"); }
  catch {}
}

// ──────────────────────────────────────────────
// AuthGate — protects /app routes, handles MentraAuth
// ──────────────────────────────────────────────

function AuthGate() {
  const { userId, isLoading, error } = useMentraAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-destructive text-lg font-semibold mb-2">
            Authentication Error
          </h2>
          <p className="text-destructive/80 text-sm mb-4">{error}</p>
          <p className="text-muted-foreground text-xs">
            Please ensure you are opening this page from the MentraOS app.
          </p>
        </div>
      </div>
    );
  }

  const resolvedUserId = userId || "";

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<AskPage userId={resolvedUserId} />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

// ──────────────────────────────────────────────
// Main App
// ──────────────────────────────────────────────

export default function App() {
  const storeTheme = useAppStore((s) => s.theme);
  const setStoreTheme = useAppStore((s) => s.setTheme);

  // IntroSplash state
  const [introComplete, setIntroComplete] = useState(() => !shouldShowIntro());

  // Theme state with localStorage persistence
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
    }
    return storeTheme === "dark" ? "dark" : "light";
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      setStoreTheme(next);
      return next;
    });
  }, [setStoreTheme]);

  // Apply dark class to document root
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Keyboard shortcut: Cmd+Shift+D to toggle theme
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        toggleTheme();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggleTheme]);

  const handleIntroComplete = useCallback(() => {
    markIntroPlayed();
    setIntroComplete(true);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, isDarkMode: theme === "dark", toggleTheme }}
    >
      <TooltipProvider delayDuration={200}>
        {/* IntroSplash — once per session */}
        {!introComplete && <IntroSplash onComplete={handleIntroComplete} />}

        <div
          className="font-sans bg-background text-foreground min-h-screen"
          style={{
            opacity: introComplete ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: introComplete ? "auto" : "none",
          }}
        >
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public site routes */}
                <Route element={<SiteLayout />}>
                  <Route index element={<Home />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="docs" element={<Docs />} />
                </Route>

                {/* Sign-in (no layout chrome) */}
                <Route path="sign-in" element={<SignIn />} />

                {/* Authenticated app routes */}
                <Route path="app/*" element={<AuthGate />} />

                {/* 404 catch-all */}
                <Route element={<SiteLayout />}>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
            <Toaster />
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </ThemeContext.Provider>
  );
}
