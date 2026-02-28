import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { GlanceLayout, AssistantState } from "@/types";

// ──────────────────────────────────────────────
// Glasses card data for the simulator
// ──────────────────────────────────────────────

interface GlassesCard {
  id: string;
  line1: string;
  line2?: string;
  primaryAction?: { label: string; action: string };
  secondaryAction?: { label: string; action: string };
  state: AssistantState;
  category?: "inbox" | "calendar" | "reply" | "navigation" | "capture";
}

const demoCards: GlassesCard[] = [
  {
    id: "gc-1",
    line1: "Alex Chen · Slack",
    line2: "Review Q3 budget before tomorrow",
    primaryAction: { label: "Reply", action: "draft-reply" },
    secondaryAction: { label: "Dismiss", action: "dismiss" },
    state: "done",
    category: "inbox",
  },
  {
    id: "gc-2",
    line1: "Design Review in 45 min",
    line2: "Zoom · Jamie, Sam, Priya",
    primaryAction: { label: "Prep notes", action: "prep" },
    secondaryAction: { label: "Join", action: "join" },
    state: "done",
    category: "calendar",
  },
  {
    id: "gc-3",
    line1: "Replying to Alex…",
    line2: '"I\'ll review by EOD. Flagged 2 issues."',
    primaryAction: { label: "Send", action: "send" },
    secondaryAction: { label: "Edit", action: "edit" },
    state: "done",
    category: "reply",
  },
  {
    id: "gc-4",
    line1: "SFO → NYC · June 14",
    line2: "Departs 8:45 AM · Gate B12 · Seat 14A",
    primaryAction: { label: "Add to cal", action: "calendar" },
    state: "done",
    category: "navigation",
  },
  {
    id: "gc-5",
    line1: "📝 Note captured",
    line2: "3 action items from Design Review saved",
    primaryAction: { label: "View", action: "view" },
    state: "done",
    category: "capture",
  },
];

// ──────────────────────────────────────────────
// State indicator dot + label
// ──────────────────────────────────────────────

function StateIndicator({ state }: { state: AssistantState }) {
  const config: Record<
    AssistantState,
    { color: string; label: string; animate: boolean }
  > = {
    idle: { color: "bg-muted-foreground/40", label: "Ready", animate: false },
    listening: { color: "bg-blue-500", label: "Listening…", animate: true },
    thinking: { color: "bg-amber-500", label: "Thinking…", animate: true },
    done: { color: "bg-emerald-500", label: "Done", animate: false },
    error: { color: "bg-destructive", label: "Error", animate: false },
  };

  const c = config[state];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          c.color,
          c.animate && "animate-pulse",
        )}
      />
      <span className="text-[9px] uppercase tracking-widest opacity-70">
        {c.label}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Single glasses card inside the simulator lens
// ──────────────────────────────────────────────

function GlassesCardView({
  card,
  layout,
}: {
  card: GlassesCard;
  layout: GlanceLayout;
}) {
  const isCompact = layout === "compact";
  const isExpanded = layout === "expanded";

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <StateIndicator state={card.state} />

      <p
        className={cn(
          "font-medium leading-tight text-white",
          isCompact ? "text-[11px]" : isExpanded ? "text-sm" : "text-xs",
        )}
      >
        {card.line1}
      </p>

      {card.line2 && (
        <p
          className={cn(
            "leading-snug text-white/70",
            isCompact ? "text-[10px]" : isExpanded ? "text-xs" : "text-[11px]",
          )}
        >
          {card.line2}
        </p>
      )}

      {/* Actions row */}
      {(card.primaryAction || card.secondaryAction) && (
        <div
          className={cn(
            "flex items-center gap-2 pt-1",
            isCompact ? "gap-1.5" : "gap-2",
          )}
        >
          {card.primaryAction && (
            <button
              className={cn(
                "rounded-full bg-white/20 backdrop-blur-sm text-white font-medium",
                "hover:bg-white/30 transition-colors",
                isCompact
                  ? "px-2 py-0.5 text-[9px]"
                  : isExpanded
                    ? "px-3 py-1 text-xs"
                    : "px-2.5 py-0.5 text-[10px]",
              )}
            >
              {card.primaryAction.label}
            </button>
          )}
          {card.secondaryAction && (
            <button
              className={cn(
                "rounded-full text-white/60 font-medium",
                "hover:text-white/80 transition-colors",
                isCompact
                  ? "text-[9px]"
                  : isExpanded
                    ? "text-xs"
                    : "text-[10px]",
              )}
            >
              {card.secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Safely-managed timeout hook — auto-clears on unmount
// and prevents setState after unmount
// ──────────────────────────────────────────────

function useSafeTimeouts() {
  const mountedRef = useRef(true);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear ALL pending timeouts on unmount
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
    };
  }, []);

  const safeTimeout = useCallback(
    (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
      const id = setTimeout(() => {
        timersRef.current.delete(id);
        if (mountedRef.current) {
          fn();
        }
      }, ms);
      timersRef.current.add(id);
      return id;
    },
    [],
  );

  const clearAll = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current.clear();
  }, []);

  const isMounted = useCallback(() => mountedRef.current, []);

  return { safeTimeout, clearAll, isMounted };
}

// ──────────────────────────────────────────────
// Main GlassesSimulator
// ──────────────────────────────────────────────

interface GlassesSimulatorProps {
  layout?: GlanceLayout;
  className?: string;
  interactive?: boolean;
}

export function GlassesSimulator({
  layout = "compact",
  className,
  interactive = true,
}: GlassesSimulatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [simState, setSimState] = useState<AssistantState>("done");
  const [muted, setMuted] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  // Track whether a transition is actively in-flight to prevent overlapping
  const transitionActiveRef = useRef(false);

  const { safeTimeout, clearAll } = useSafeTimeouts();

  const card = demoCards[currentIndex];

  // Auto-cycle through cards when autoPlay is on
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      // Skip if a transition is already in progress
      if (transitionActiveRef.current) return;

      transitionActiveRef.current = true;
      setSimState("thinking");

      safeTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % demoCards.length);
        setSimState("done");
        transitionActiveRef.current = false;
      }, 1200);
    }, 4000);

    return () => {
      clearInterval(interval);
      // Don't clearAll here — let in-flight transitions finish
      // but do mark transition as done so next cycle can start fresh
    };
  }, [autoPlay, safeTimeout]);

  // Cleanup all timeouts when the component fully unmounts
  useEffect(() => {
    return () => {
      clearAll();
      transitionActiveRef.current = false;
    };
  }, [clearAll]);

  const goNext = useCallback(() => {
    if (transitionActiveRef.current) return;
    if (currentIndex >= demoCards.length - 1) return;

    transitionActiveRef.current = true;
    setSimState("thinking");

    safeTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setSimState("done");
      transitionActiveRef.current = false;
    }, 600);
  }, [currentIndex, safeTimeout]);

  const goPrev = useCallback(() => {
    if (transitionActiveRef.current) return;
    if (currentIndex <= 0) return;

    transitionActiveRef.current = true;
    setSimState("thinking");

    safeTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setSimState("done");
      transitionActiveRef.current = false;
    }, 600);
  }, [currentIndex, safeTimeout]);

  const simulateVoice = useCallback(() => {
    if (transitionActiveRef.current) return;

    transitionActiveRef.current = true;
    setSimState("listening");

    safeTimeout(() => {
      setSimState("thinking");

      safeTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % demoCards.length);
        setSimState("done");
        transitionActiveRef.current = false;
      }, 1500);
    }, 2000);
  }, [safeTimeout]);

  const activeCard = { ...card, state: simState };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Lens frame */}
      <div className="relative">
        {/* Outer lens shape */}
        <div
          className={cn(
            "relative overflow-hidden",
            "w-[340px] h-[180px] sm:w-[400px] sm:h-[200px]",
            "rounded-[50%/40%]",
            "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950",
            "border border-white/10",
            "shadow-[0_0_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]",
          )}
        >
          {/* Subtle lens reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />

          {/* HUD scan lines effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
            }}
          />

          {/* Card content area */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "px-10 py-6 sm:px-12 sm:py-8",
            )}
          >
            {simState === "thinking" ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                <span className="text-[10px] text-white/50 uppercase tracking-widest">
                  Thinking…
                </span>
              </div>
            ) : simState === "listening" ? (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Mic className="h-5 w-5 text-blue-400" />
                  <span className="absolute -inset-2 rounded-full border border-blue-400/40 animate-ping" />
                </div>
                <span className="text-[10px] text-white/50 uppercase tracking-widest">
                  Listening…
                </span>
              </div>
            ) : (
              <GlassesCardView card={activeCard} layout={layout} />
            )}
          </div>

          {/* Bottom-right: card position indicator */}
          <div className="absolute bottom-3 right-5 flex items-center gap-1">
            {demoCards.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === currentIndex ? "w-3 bg-white/50" : "w-1 bg-white/20",
                )}
              />
            ))}
          </div>

          {/* Top-right: category badge */}
          {simState === "done" && card.category && (
            <div className="absolute top-3 right-5">
              <span className="text-[8px] uppercase tracking-widest text-white/30 font-medium">
                {card.category}
              </span>
            </div>
          )}
        </div>

        {/* Nose bridge (connecting piece) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-3 bg-neutral-800 rounded-b-full border-x border-b border-white/5" />
      </div>

      {/* Interactive controls */}
      {interactive && (
        <div className="flex flex-col items-center gap-3">
          {/* Navigation + voice */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={goPrev}
              disabled={
                currentIndex === 0 ||
                transitionActiveRef.current ||
                simState !== "done"
              }
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant={simState === "listening" ? "destructive" : "default"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={simulateVoice}
              disabled={simState !== "done" && simState !== "idle"}
            >
              {simState === "listening" ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={goNext}
              disabled={
                currentIndex === demoCards.length - 1 ||
                transitionActiveRef.current ||
                simState !== "done"
              }
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Secondary controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground"
              onClick={() => setMuted(!muted)}
            >
              {muted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
              {muted ? "Unmute" : "Mute"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground"
              onClick={() => {
                // When toggling autoplay off, cancel any in-flight transition
                // and reset to a clean "done" state
                if (autoPlay) {
                  clearAll();
                  transitionActiveRef.current = false;
                  setSimState("done");
                }
                setAutoPlay(!autoPlay);
              }}
            >
              <Eye className="h-3 w-3" />
              {autoPlay ? "Stop demo" : "Auto demo"}
            </Button>
          </div>

          {/* Layout label */}
          <span className="text-[10px] capitalize text-muted-foreground rounded-full border px-2.5 py-0.5">
            {layout} layout
          </span>
        </div>
      )}
    </div>
  );
}

export default GlassesSimulator;
