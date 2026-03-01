import { useState, useEffect, useCallback, createContext, useContext, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMentraAuth } from "@mentra/react";
import { TooltipProvider } from "@frontend/components/ui/tooltip";
import { Toaster } from "@frontend/components/ui/sonner";
import { useAppStore } from "@frontend/stores/app-store";
import AppLayout from "@frontend/layouts/AppLayout";

const AskPage = lazy(() => import("@frontend/pages/app/AskPage"));
const ConnectionsPage = lazy(() => import("@frontend/pages/app/ConnectionsPage"));
const SettingsPage = lazy(() => import("@frontend/pages/app/SettingsPage"));

// Theme Context (preserved for backward compatibility)
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

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary" />
    </div>
  );
}

export default function App() {
  const { userId, isLoading, error, isAuthenticated } = useMentraAuth();
  const storeTheme = useAppStore((s) => s.theme);
  const setStoreTheme = useAppStore((s) => s.setTheme);

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

  // Sync theme with backend when user authenticates
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetch(`/api/theme-preference?userId=${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.theme === "dark" || data.theme === "light") {
            setTheme(data.theme);
            localStorage.setItem("theme", data.theme);
            setStoreTheme(data.theme);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, userId, setStoreTheme]);

  // Save theme to backend on change
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetch("/api/theme-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, theme }),
      }).catch(() => {});
    }
  }, [theme, isAuthenticated, userId]);

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

  // Loading state
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

  // Error state
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
    <ThemeContext.Provider
      value={{ theme, isDarkMode: theme === "dark", toggleTheme }}
    >
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <div className="font-sans bg-background text-foreground min-h-screen">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/app" replace />} />
                <Route path="/app" element={<AppLayout />}>
                  <Route index element={<AskPage userId={resolvedUserId} />} />
                  <Route path="connections" element={<ConnectionsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Suspense>
          </div>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeContext.Provider>
  );
}
