import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActionIndicatorPhase } from "../types";
import type { AskConversation } from "../types";

export type SafetyMode = "read-only" | "draft-first" | "assisted";

export type Theme = "light" | "dark" | "system";

export type ResponseStyle = "short" | "medium" | "verbose";

export type AgentStatus =
  | "live"
  | "idle"
  | "provisioning"
  | "offline"
  | "error";

interface AppState {
  // Safety mode
  safetyMode: SafetyMode;
  setSafetyMode: (mode: SafetyMode) => void;

  // Command bar
  commandBarOpen: boolean;
  setCommandBarOpen: (open: boolean) => void;
  toggleCommandBar: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Response style
  responseStyle: ResponseStyle;
  setResponseStyle: (style: ResponseStyle) => void;

  // Agent status
  agentStatus: AgentStatus;
  setAgentStatus: (status: AgentStatus) => void;

  // Demo mode
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;

  // Action indicator — persistent pill in top bar
  actionIndicatorPhase: ActionIndicatorPhase;
  actionIndicatorLabel: string;
  setActionIndicator: (phase: ActionIndicatorPhase, label: string) => void;
  clearActionIndicator: () => void;

  // Session persistence
  savedSessions: AskConversation[];
  setSavedSessions: (sessions: AskConversation[]) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;


}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Safety mode — default to draft-first per spec
      safetyMode: "draft-first",
      setSafetyMode: (mode) => set({ safetyMode: mode }),

      // Command bar
      commandBarOpen: false,
      setCommandBarOpen: (open) => set({ commandBarOpen: open }),
      toggleCommandBar: () =>
        set((s) => ({ commandBarOpen: !s.commandBarOpen })),

      // Theme — dark by default (matches Parth's design system)
      theme: "dark",
      setTheme: (theme) => set({ theme }),

      // Response style — medium by default
      responseStyle: "medium",
      setResponseStyle: (style) => set({ responseStyle: style }),

      // Agent status
      agentStatus: "live",
      setAgentStatus: (status) => set({ agentStatus: status }),

      // Demo mode
      demoMode: false,
      setDemoMode: (enabled) => set({ demoMode: enabled }),

      // Action indicator — top bar pill
      actionIndicatorPhase: "idle" as ActionIndicatorPhase,
      actionIndicatorLabel: "",
      setActionIndicator: (phase, label) =>
        set({ actionIndicatorPhase: phase, actionIndicatorLabel: label }),
      clearActionIndicator: () =>
        set({
          actionIndicatorPhase: "idle" as ActionIndicatorPhase,
          actionIndicatorLabel: "",
        }),

      // Session persistence — stored in localStorage
      savedSessions: [],
      setSavedSessions: (sessions) => set({ savedSessions: sessions }),
      activeSessionId: null,
      setActiveSessionId: (id) => set({ activeSessionId: id }),


    }),
    {
      name: "clawed-app-store",
      partialize: (state) => ({
        safetyMode: state.safetyMode,
        theme: state.theme,
        responseStyle: state.responseStyle,
        demoMode: state.demoMode,
        savedSessions: state.savedSessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
