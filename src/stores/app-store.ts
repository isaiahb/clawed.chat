import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SafetyMode = "read-only" | "draft-first" | "assisted";

export type Theme = "light" | "dark" | "system";

interface AppState {
  // Safety mode
  safetyMode: SafetyMode;
  setSafetyMode: (mode: SafetyMode) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Command bar
  commandBarOpen: boolean;
  setCommandBarOpen: (open: boolean) => void;
  toggleCommandBar: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Onboarding
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;

  // Glasses connection
  glassesConnected: boolean;
  setGlassesConnected: (connected: boolean) => void;

  // Quiet hours
  quietHoursEnabled: boolean;
  setQuietHoursEnabled: (enabled: boolean) => void;
  quietHoursStart: string;
  quietHoursEnd: string;
  setQuietHours: (start: string, end: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Safety mode — default to draft-first per spec
      safetyMode: "draft-first",
      setSafetyMode: (mode) => set({ safetyMode: mode }),

      // Sidebar — open by default on desktop
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Command bar
      commandBarOpen: false,
      setCommandBarOpen: (open) => set({ commandBarOpen: open }),
      toggleCommandBar: () =>
        set((s) => ({ commandBarOpen: !s.commandBarOpen })),

      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),

      // Onboarding
      onboardingComplete: false,
      setOnboardingComplete: (complete) =>
        set({ onboardingComplete: complete }),
      onboardingStep: 0,
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      // Glasses
      glassesConnected: false,
      setGlassesConnected: (connected) =>
        set({ glassesConnected: connected }),

      // Quiet hours
      quietHoursEnabled: false,
      setQuietHoursEnabled: (enabled) =>
        set({ quietHoursEnabled: enabled }),
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      setQuietHours: (start, end) =>
        set({ quietHoursStart: start, quietHoursEnd: end }),
    }),
    {
      name: "clawed-app-store",
      partialize: (state) => ({
        safetyMode: state.safetyMode,
        theme: state.theme,
        onboardingComplete: state.onboardingComplete,
        onboardingStep: state.onboardingStep,
        quietHoursEnabled: state.quietHoursEnabled,
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
      }),
    }
  )
);
