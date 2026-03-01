import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/shared/ScrollToTop";

// Layout (eagerly loaded — it wraps everything)
import AppLayout from "@/layouts/AppLayout";

// ─── Lazy-loaded Pages ───
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

// ─── Suspense Fallback ───
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ─── Root redirects straight to app ─── */}
              <Route index element={<Navigate to="/app" replace />} />

              {/* ─── Login ─── */}
              <Route path="login" element={<SignIn />} />
              {/* Keep /sign-in as an alias for backward compat */}
              <Route
                path="sign-in"
                element={<Navigate to="/login" replace />}
              />

              {/* ─── App Routes — only Ask, Connections, Settings ─── */}
              <Route path="app" element={<AppLayout />}>
                {/* Ask (Chat) is the default landing */}
                <Route index element={<AskPage />} />
                <Route path="ask" element={<Navigate to="/app" replace />} />
                <Route path="chat" element={<Navigate to="/app" replace />} />
                <Route path="connections" element={<ConnectionsPage />} />
                <Route
                  path="integrations"
                  element={<Navigate to="/app/connections" replace />}
                />
                <Route path="settings" element={<SettingsPage />} />
                {/* Catch dead app routes → redirect to Ask */}
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Route>

              {/* ─── 404 Catch-all ─── */}
              <Route path="*" element={<NotFound />} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}
