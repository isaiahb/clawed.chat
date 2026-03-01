import { useState, useRef, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { useDocumentTitle } from "@frontend/hooks/useDocumentTitle";
import { Button } from "@frontend/components/ui/button";
import { Badge } from "@frontend/components/ui/badge";
import { Textarea } from "@frontend/components/ui/textarea";
import { ScrollArea } from "@frontend/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@frontend/components/ui/tooltip";
import {
  MessageSquare,
  Send,
  Plus,
  Mail,
  Calendar,
  Globe,
  StickyNote,
  Hash,
  Sparkles,
  Loader2,
  Trash2,
  MoreHorizontal,
  Copy,
  Bookmark,
  Clock,
  Search,
  ArrowRight,
  X,
  CheckCircle2,
  FileText,
  Zap,
  Play,
  Edit3,
  Receipt,
  AlertTriangle,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@frontend/components/ui/dropdown-menu";
import { cn } from "@frontend/lib/utils";
import { mockConversations } from "@frontend/data/mock";
import type {
  AskConversation,
  AskMessage,
  AskContextChip,
  ChatCardType,
  ActionIndicatorStep,
} from "@frontend/types";
import { ACTION_SEQUENCES } from "@frontend/types";
import { useAppStore } from "@frontend/stores/app-store";
import { useOpenClaw } from "@frontend/lib/useOpenClaw";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ──────────────────────────────────────────────
// Context chip definitions
// ──────────────────────────────────────────────

interface ContextChipDef {
  id: AskContextChip;
  label: string;
  icon: LucideIcon;
  color: string;
  activeColor: string;
}

const contextChips: ContextChipDef[] = [
  {
    id: "email",
    label: "Email",
    icon: Mail,
    color: "text-muted-foreground border-border",
    activeColor: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    color: "text-muted-foreground border-border",
    activeColor: "text-violet-700 bg-violet-50 border-violet-200",
  },
  {
    id: "web",
    label: "Web",
    icon: Globe,
    color: "text-muted-foreground border-border",
    activeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    color: "text-muted-foreground border-border",
    activeColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "slack",
    label: "Slack",
    icon: Hash,
    color: "text-muted-foreground border-border",
    activeColor: "text-rose-700 bg-rose-50 border-rose-200",
  },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ──────────────────────────────────────────────
// Suggested prompts for empty state
// ──────────────────────────────────────────────

const suggestedPrompts = [
  {
    prompt: "What's in my inbox right now?",
    chips: ["email"] as AskContextChip[],
  },
  {
    prompt: "What's my next meeting and how should I prepare?",
    chips: ["calendar"] as AskContextChip[],
  },
  {
    prompt: "Summarize the latest messages from my team",
    chips: ["slack"] as AskContextChip[],
  },
  {
    prompt: "Draft a follow-up email to Acme Corp",
    chips: ["email"] as AskContextChip[],
  },
];

// ──────────────────────────────────────────────
// Card type config
// ──────────────────────────────────────────────

const cardTypeConfig: Record<
  ChatCardType,
  { label: string; icon: LucideIcon; accentClass: string }
> = {
  answer: {
    label: "Answer",
    icon: Sparkles,
    accentClass: "border-l-emerald-500",
  },
  action: {
    label: "Action Suggestion",
    icon: Zap,
    accentClass: "border-l-amber-500",
  },
  draft: {
    label: "Draft",
    icon: Edit3,
    accentClass: "border-l-blue-500",
  },
  receipt: {
    label: "Receipt",
    icon: Receipt,
    accentClass: "border-l-violet-500",
  },
};

// ──────────────────────────────────────────────
// Chat Card (block card, NOT bubble)
// ──────────────────────────────────────────────

function ChatCard({
  message,
  isLast,
}: {
  message: AskMessage;
  isLast: boolean;
}) {
  const isUser = message.role === "user";
  const cardType = message.cardType || "answer";
  const config = cardTypeConfig[cardType];

  if (isUser) {
    return (
      <div
        className={cn(
          "border border-border bg-card p-4 transition-colors duration-200 hover:border-foreground/20",
          isLast && "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none">
            You
          </span>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums select-none">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {message.content}
        </p>
        {message.context && message.context.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {message.context.map((chipId) => {
              const chip = contextChips.find((c) => c.id === chipId);
              if (!chip) return null;
              const Icon = chip.icon;
              return (
                <Badge
                  key={chipId}
                  variant="outline"
                  className="text-[10px] h-5 gap-1 font-normal px-1.5"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {chip.label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Assistant card — block style with left accent
  const CardIcon = config.icon;

  return (
    <div
      className={cn(
        "border border-border bg-card border-l-[3px] transition-colors duration-200 hover:border-foreground/20",
        config.accentClass,
        isLast && "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <CardIcon className="h-3.5 w-3.5 text-muted-foreground transition-colors duration-200" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none">
            {config.label}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums select-none">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* Card body — rendered with ReactMarkdown */}
      <div className="px-4 pb-3">
        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-pre:bg-muted prose-pre:rounded-lg">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Context chips */}
        {message.context && message.context.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {message.context.map((chipId) => {
              const chip = contextChips.find((c) => c.id === chipId);
              if (!chip) return null;
              const Icon = chip.icon;
              return (
                <Badge
                  key={chipId}
                  variant="outline"
                  className="text-[10px] h-5 gap-1 font-normal px-1.5"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {chip.label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Card footer actions */}
      <div className="flex items-center gap-1.5 px-4 pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground px-2"
        >
          <Copy className="h-3 w-3" />
          Copy
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground px-2"
        >
          <Bookmark className="h-3 w-3" />
          Save
        </Button>
        {message.suggestedAction && (
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1 ml-auto bg-claw-red hover:bg-claw-red-bright text-white px-3"
          >
            <CheckCircle2 className="h-3 w-3" />
            {message.suggestedAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Action Indicator — required feature per spec
// State machine: idle -> thinking -> acting -> done | error
// Shows what the assistant is actively doing
// ──────────────────────────────────────────────

function ActionIndicator({
  steps,
  currentStepIndex,
  onCancel,
}: {
  steps: ActionIndicatorStep[];
  currentStepIndex: number;
  onCancel: () => void;
}) {
  const currentStep = steps[currentStepIndex] ?? steps[0];
  const phase = currentStep?.phase ?? "thinking";

  const phaseConfig = {
    thinking: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-claw-red" />,
      dotClass: "bg-amber-500 animate-pulse",
    },
    acting: {
      icon: <Zap className="h-3.5 w-3.5 text-claw-red animate-pulse" />,
      dotClass: "bg-claw-red animate-pulse",
    },
    done: {
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
      dotClass: "bg-emerald-500",
    },
    error: {
      icon: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
      dotClass: "bg-destructive",
    },
    idle: {
      icon: null,
      dotClass: "bg-muted-foreground/40",
    },
  };

  const config = phaseConfig[phase] ?? phaseConfig.thinking;

  return (
    <div className="border border-border bg-card p-4 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep?.label ?? "Thinking..."}
          </span>
        </div>
        {phase !== "done" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-destructive px-2"
            onClick={onCancel}
          >
            <X className="h-3 w-3" />
            Cancel
          </Button>
        )}
      </div>

      {/* Step progress dots */}
      {steps.length > 1 && (
        <div className="flex items-center gap-1.5 mt-3">
          {steps.map((_step, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-1.5 w-1.5 transition-all duration-300",
                  idx < currentStepIndex
                    ? "bg-emerald-500"
                    : idx === currentStepIndex
                      ? config.dotClass
                      : "bg-border",
                )}
              />
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-4 transition-all duration-300",
                    idx < currentStepIndex ? "bg-emerald-500" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-[10px] text-muted-foreground">
            {currentStepIndex + 1}/{steps.length}
          </span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Error states for chat
// ──────────────────────────────────────────────

function MessageErrorState({
  onRetry,
  onCopyPrompt,
  lastPrompt,
}: {
  onRetry: () => void;
  onCopyPrompt?: () => void;
  lastPrompt?: string;
}) {
  return (
    <div className="border border-red-200 bg-red-50 p-4 animate-in fade-in-0 duration-300">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-800">
            Something went wrong
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            The assistant couldn't generate a response. Please try again.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 border-red-200 text-red-700 hover:bg-red-100"
              onClick={onRetry}
            >
              <RotateCcw className="h-3 w-3" />
              Try again
            </Button>
            {lastPrompt && onCopyPrompt && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1.5 text-red-600"
                onClick={onCopyPrompt}
              >
                <Copy className="h-3 w-3" />
                Copy last prompt
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2">
      <WifiOff className="h-3.5 w-3.5 text-amber-600" />
      <span className="text-xs font-medium text-amber-700">
        You're offline. Messages will be sent when you reconnect.
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Session box component
// ──────────────────────────────────────────────

function SessionBox({
  conversation,
  isActive,
  onClick,
  onDelete,
  isHovered,
  onHover,
  onLeave,
}: {
  conversation: AskConversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        "group relative w-full text-left border transition-all duration-200 p-3",
        isActive
          ? "border-foreground bg-foreground/[0.03] shadow-[inset_2px_0_0_var(--foreground)]"
          : "border-border bg-card hover:border-foreground/40 hover:bg-muted/30 active:translate-y-px",
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold truncate pr-6 text-foreground leading-snug">
          {conversation.title}
        </h4>

        {/* Status icon */}
        <div className="shrink-0 mt-0.5">
          {conversation.status === "running" ? (
            <Play className="h-3 w-3 text-emerald-500 fill-emerald-500" />
          ) : conversation.status === "completed" ? (
            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Clock className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
      </div>

      {/* Timestamp + mode tag */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatRelativeTime(conversation.updatedAt)}
        </span>
        {conversation.modeTag && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal">
            {conversation.modeTag}
          </Badge>
        )}
      </div>

      {/* Summary */}
      {conversation.summary && (
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug line-clamp-1 transition-colors duration-150">
          {conversation.summary}
        </p>
      )}

      {/* Hover preview — faint last assistant card */}
      {isHovered &&
        !isActive &&
        lastMessage &&
        lastMessage.role === "assistant" && (
          <div className="mt-2 p-2 bg-muted/40 border border-border text-[10px] text-muted-foreground leading-relaxed line-clamp-2 animate-fade-in">
            {lastMessage.content.slice(0, 120)}
            {lastMessage.content.length > 120 ? "..." : ""}
          </div>
        )}

      {/* Right-click actions (shown as dropdown on hover) */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex h-6 w-6 items-center justify-center border border-border bg-card hover:bg-muted hover:border-foreground/40 cursor-pointer transition-all duration-150">
              <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem className="gap-2 text-xs">
              <Edit3 className="h-3 w-3" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <FileText className="h-3 w-3" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete()}
              className="gap-2 text-xs text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────
// Empty state with lobster personality
// ──────────────────────────────────────────────

function EmptyState({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string, chips: AskContextChip[]) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 animate-fade-in">
      {/* Lobster claw watermark */}
      <div className="relative mb-6">
        <svg
          viewBox="-20 -20 40 40"
          className="h-20 w-20 text-claw-red/8 transition-colors duration-500"
          fill="currentColor"
        >
          <path d="M-10 2 C-10 2, -6 8, 2 10 C6 11, 12 8, 14 4 C14 4, 10 6, 6 5 C2 4, -4 2, -10 2Z" />
          <path d="M-10 -1 C-10 -1, -6 -8, 2 -10 C6 -11, 12 -6, 14 -2 C14 -2, 10 -5, 6 -4 C2 -3, -4 -1, -10 -1Z" />
          <circle cx={-10} cy={0.5} r={3} />
        </svg>
      </div>

      <h2 className="text-lg font-black text-foreground text-center">
        No sessions yet
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
        Create your first session — ask anything and your crustacean will get to
        work.
      </p>

      {/* Suggested prompts */}
      <div className="mt-8 grid w-full max-w-md gap-2 sm:grid-cols-2">
        {suggestedPrompts.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(suggestion.prompt, suggestion.chips)}
            className="group flex items-start gap-3 border border-border bg-card p-3.5 text-left transition-all duration-200 hover:border-foreground/40 hover:bg-muted/30 active:translate-y-px"
          >
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-claw-red group-hover:translate-x-0.5 transition-all duration-200" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-snug text-foreground">
                {suggestion.prompt}
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                {suggestion.chips.map((chipId) => {
                  const chip = contextChips.find((c) => c.id === chipId);
                  if (!chip) return null;
                  const Icon = chip.icon;
                  return (
                    <Badge
                      key={chipId}
                      variant="outline"
                      className="text-[9px] h-4 gap-0.5 font-normal px-1"
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {chip.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Prompt input bar
// ──────────────────────────────────────────────

function PromptInput({
  value,
  onChange,
  onSubmit,
  activeChips,
  onToggleChip,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  activeChips: Set<AskContextChip>;
  onToggleChip: (chip: AskContextChip) => void;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      textareaRef.current?.blur();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [value]);

  return (
    <div className="border-t border-border bg-card p-4 transition-colors duration-200">
      {/* Context chip toggles */}
      <div className="mb-3 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.08em] font-bold mr-1.5 select-none">
          Context
        </span>
        {contextChips.map((chip) => {
          const isActive = activeChips.has(chip.id);
          const Icon = chip.icon;
          return (
            <Tooltip key={chip.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggleChip(chip.id)}
                  className={cn(
                    "inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-medium transition-all duration-150",
                    isActive ? chip.activeColor : chip.color,
                    "hover:opacity-80 active:scale-95",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {chip.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {isActive ? "Remove" : "Include"} {chip.label.toLowerCase()}{" "}
                  context
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] max-h-[160px] resize-none pr-4 py-3 text-sm transition-[border-color,box-shadow] duration-150 focus:border-claw-red/30 focus:shadow-[0_0_0_3px_var(--claw-red-glow)]"
            rows={1}
            disabled={disabled}
          />
        </div>
        <Button
          size="icon"
          className="h-11 w-11 shrink-0 bg-claw-red hover:bg-claw-red-bright text-white transition-all duration-150 active:scale-95 disabled:opacity-40"
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
        >
          <Send className="h-4 w-4 transition-transform duration-150" />
          <span className="sr-only">Send</span>
        </Button>
      </div>

      {/* Hint */}
      <p className="mt-2.5 text-[10px] text-muted-foreground/70 text-center select-none">
        Clawed can make mistakes. Sensitive actions always require your
        approval.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Hook: useActionIndicator — drives the action step sequence
// ──────────────────────────────────────────────

function useActionIndicator() {
  const [steps, setSteps] = useState<ActionIndicatorStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setActionIndicator, clearActionIndicator } = useAppStore();

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsActive(false);
    setCurrentStepIndex(0);
    setSteps([]);
    clearActionIndicator();
  }, [clearActionIndicator]);

  const start = useCallback(
    (chips: AskContextChip[]) => {
      // Pick the sequence based on the first active chip, or default
      const primaryChip = chips[0] ?? "default";
      const sequence =
        ACTION_SEQUENCES[primaryChip] ?? ACTION_SEQUENCES.default;
      setSteps(sequence);
      setCurrentStepIndex(0);
      setIsActive(true);
      // Set initial state in global store for top bar pill
      if (sequence.length > 0) {
        setActionIndicator(sequence[0].phase, sequence[0].label);
      }
    },
    [setActionIndicator],
  );

  // Auto-advance through steps + sync to global store
  useEffect(() => {
    if (!isActive || steps.length === 0) return;

    const current = steps[currentStepIndex];
    if (!current) return;

    // Sync current step to global store for the top bar pill
    setActionIndicator(current.phase, current.label);

    // If we're at the last step (done), don't auto-advance
    if (currentStepIndex >= steps.length - 1) return;

    // Advance to next step after a delay
    const delay =
      current.phase === "thinking" ? 600 : 500 + Math.random() * 400;
    timerRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, currentStepIndex, steps, setActionIndicator]);

  return { steps, currentStepIndex, isActive, start, stop };
}

// ──────────────────────────────────────────────
// Main Ask Page (Dashboard) — with OpenClaw integration
// ──────────────────────────────────────────────

interface AskPageProps {
  userId: string;
}

export default function AskPage({ userId }: AskPageProps) {
  useDocumentTitle("Ask");

  // OpenClaw integration
  const { sendMessage, abort, status, onDelta } = useOpenClaw();

  // Streaming content for live response display
  const [streamingContent, setStreamingContent] = useState("");

  // Photo state for attachment
  const [photos, setPhotos] = useState<
    { id: string; requestId: string; url: string; timestamp: string }[]
  >([]);

  const {
    demoMode,
    savedSessions,
    setSavedSessions,
    activeSessionId: storedActiveSessionId,
    setActiveSessionId: storeSetActiveSessionId,
  } = useAppStore();

  // Initialize conversations from persisted store, falling back to mock data
  const [conversations, setConversationsLocal] = useState<AskConversation[]>(
    () => (savedSessions.length > 0 ? savedSessions : mockConversations),
  );
  const [activeConversationId, setActiveConversationIdLocal] = useState<
    string | null
  >(storedActiveSessionId);

  // Ref for activeConversationId so delta callbacks see latest value
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Wrap setConversations to also persist to store
  const setConversations = useCallback(
    (
      updater:
        | AskConversation[]
        | ((prev: AskConversation[]) => AskConversation[]),
    ) => {
      setConversationsLocal((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        setSavedSessions(next);
        return next;
      });
    },
    [setSavedSessions],
  );

  // Wrap setActiveConversationId to also persist to store
  const setActiveConversationId = useCallback(
    (id: string | null) => {
      setActiveConversationIdLocal(id);
      storeSetActiveSessionId(id);
    },
    [storeSetActiveSessionId],
  );

  const [promptValue, setPromptValue] = useState("");
  const [activeChips, setActiveChips] = useState<Set<AskContextChip>>(
    new Set(["email", "calendar"]),
  );
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  // Offline detection driven by OpenClaw status
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    setIsOffline(status === "disconnected");
  }, [status]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const actionIndicator = useActionIndicator();

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  // Auto-scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, isThinking, streamingContent]);

  // ──────────────────────────────────────────────
  // OpenClaw delta handling (streaming tokens, final, error, aborted)
  // ──────────────────────────────────────────────
  useEffect(() => {
    const streamRef = { content: "" };
    const finalizedRuns = new Set<string>();

    /** Notify server that Claude is done so wake word detection re-enables */
    const unlockWakeWord = () => {
      fetch(`/api/wake-word-unlock?userId=${encodeURIComponent(userId)}`, {
        method: "POST",
      }).catch(() => {});
    };

    const unsubscribe = onDelta((delta) => {
      const convId = activeConversationIdRef.current;

      // Deduplicate: skip events for runs we've already finalized
      if (
        delta.runId &&
        finalizedRuns.has(delta.runId) &&
        delta.state !== "delta"
      ) {
        return;
      }

      if (delta.state === "delta") {
        // Gateway sends full accumulated text in each delta (not incremental)
        if (delta.text) {
          streamRef.content = delta.text;
          setStreamingContent(delta.text);
        }
        return;
      }

      if (delta.state === "final") {
        // Mark this run as finalized to prevent duplicates
        if (delta.runId) finalizedRuns.add(delta.runId);
        // Use the final event's text if provided, otherwise use last delta
        const finalContent = delta.text || streamRef.content;
        streamRef.content = "";
        setStreamingContent("");
        setIsThinking(false);
        actionIndicator.stop();
        unlockWakeWord();

        if (finalContent && convId) {
          const assistantMessage: AskMessage = {
            id: `msg-${Date.now()}-reply`,
            role: "assistant",
            content: finalContent,
            timestamp: new Date().toISOString(),
            cardType: "answer",
          };
          // Add to the active conversation
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === convId) {
                return {
                  ...c,
                  messages: [...c.messages, assistantMessage],
                  updatedAt: new Date().toISOString(),
                  status: "completed" as const,
                  summary: "Response received",
                };
              }
              return c;
            }),
          );
        }
        return;
      }

      if (delta.state === "error") {
        if (delta.runId) finalizedRuns.add(delta.runId);
        streamRef.content = "";
        setStreamingContent("");
        setIsThinking(false);
        setGenerationError(true);
        actionIndicator.stop();
        unlockWakeWord();
        return;
      }

      if (delta.state === "aborted") {
        if (delta.runId) finalizedRuns.add(delta.runId);
        // Commit whatever was streamed so far
        const partial = streamRef.content;
        streamRef.content = "";
        setStreamingContent("");
        setIsThinking(false);
        actionIndicator.stop();
        unlockWakeWord();

        if (partial && convId) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === convId) {
                return {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: `msg-${Date.now()}-aborted`,
                      role: "assistant" as const,
                      content: partial + "\n\n_(aborted)_",
                      timestamp: new Date().toISOString(),
                      cardType: "answer" as const,
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                  status: "completed" as const,
                };
              }
              return c;
            }),
          );
        }
      }
    });

    return unsubscribe;
  }, [onDelta, userId]);

  // ──────────────────────────────────────────────
  // Photo SSE stream
  // ──────────────────────────────────────────────
  useEffect(() => {
    let eventSource: EventSource | null = null;
    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/photo-stream?userId=${encodeURIComponent(userId)}`,
        );
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") return;
            setPhotos((prev) => {
              if (prev.some((p) => p.requestId === data.requestId)) return prev;
              return [
                {
                  id: data.requestId,
                  requestId: data.requestId,
                  url: data.dataUrl,
                  timestamp: new Date(data.timestamp).toLocaleTimeString(),
                },
                ...prev,
              ].slice(0, 20);
            });
          } catch {
            /* ignore parse errors */
          }
        };
        eventSource.onerror = () => {
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {
        /* ignore connection errors */
      }
    };
    connect();
    return () => eventSource?.close();
  }, [userId]);

  // ──────────────────────────────────────────────
  // Handle sending a message
  // ──────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!promptValue.trim() || isThinking) return;

    setGenerationError(false);
    setLastFailedPrompt(null);

    const userMessage: AskMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: promptValue.trim(),
      timestamp: new Date().toISOString(),
      context: Array.from(activeChips),
    };

    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: [...c.messages, userMessage],
                updatedAt: new Date().toISOString(),
                status: "running" as const,
              }
            : c,
        ),
      );
    } else {
      const newConv: AskConversation = {
        id: `conv-${Date.now()}`,
        title:
          promptValue.trim().length > 40
            ? promptValue.trim().slice(0, 40) + "..."
            : promptValue.trim(),
        messages: [userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        summary: "Processing...",
        modeTag: "Draft first",
        status: "running",
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    }

    const messageText = promptValue.trim();
    setPromptValue("");
    setIsThinking(true);

    // Start action indicator sequence
    actionIndicator.start(Array.from(activeChips));

    // Send to OpenClaw
    sendMessage(messageText);
  }, [
    promptValue,
    isThinking,
    activeConversation,
    activeConversationId,
    activeChips,
    setConversations,
    setActiveConversationId,
    actionIndicator,
    sendMessage,
  ]);

  // Keep a ref to handleSubmit so the SSE effect doesn't reconnect on every render
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // ──────────────────────────────────────────────
  // Transcription SSE stream — voice queries auto-submit
  // ──────────────────────────────────────────────
  useEffect(() => {
    let eventSource: EventSource | null = null;
    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/transcription-stream?userId=${encodeURIComponent(userId)}`,
        );
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") return;
            if (data.type === "voice-query") {
              // Auto-submit voice query
              setPromptValue(data.query);
              setTimeout(() => handleSubmitRef.current(), 100);
              return;
            }
          } catch {
            /* ignore parse errors */
          }
        };
        eventSource.onerror = () => {
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {
        /* ignore connection errors */
      }
    };
    connect();
    return () => eventSource?.close();
  }, [userId]);

  // ──────────────────────────────────────────────
  // Cancel / Retry / Chip toggle handlers
  // ──────────────────────────────────────────────

  const handleCancelThinking = () => {
    abort(); // Call OpenClaw abort
    setIsThinking(false);
    setStreamingContent("");
    actionIndicator.stop();
  };

  // Toggle context chips
  const handleToggleChip = (chip: AskContextChip) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) {
        next.delete(chip);
      } else {
        next.add(chip);
      }
      return next;
    });
  };

  const handleRetry = () => {
    setGenerationError(false);
    if (lastFailedPrompt) {
      setPromptValue(lastFailedPrompt);
    }
  };

  const handleCopyLastPrompt = () => {
    if (lastFailedPrompt) {
      navigator.clipboard.writeText(lastFailedPrompt);
    }
  };

  const handleSelectPrompt = (prompt: string, chips: AskContextChip[]) => {
    setActiveChips(new Set(chips));
    setPromptValue(prompt);
    setActiveConversationId(null);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setPromptValue("");
  };

  const handleDelete = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  // Filter conversations
  const filteredConversations = conversations
    .filter((c) =>
      sidebarSearch
        ? c.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
          c.messages.some((m) =>
            m.content.toLowerCase().includes(sidebarSearch.toLowerCase()),
          )
        : true,
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  // For demo mode, pick 2 pinned prompts
  const demoPinnedPrompts = demoMode ? suggestedPrompts.slice(0, 2) : [];

  return (
    <div className="flex h-full">
      {/* ══════════════════════════════════════════════
          LEFT COLUMN — Session Boxes
          ══════════════════════════════════════════════ */}
      <div className="hidden md:flex w-72 lg:w-80 flex-col border-r border-border bg-background shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none">
            Sessions
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNewConversation}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New session</TooltipContent>
          </Tooltip>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full border border-border bg-card py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-claw-red/40 focus:border-claw-red/30 transition-all duration-150"
            />
          </div>
        </div>

        {/* Session boxes grid */}
        <ScrollArea className="flex-1 px-3 py-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {sidebarSearch
                  ? "No sessions match your search"
                  : "No sessions yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <SessionBox
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversationId === conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  onDelete={() => handleDelete(conv.id)}
                  isHovered={hoveredSession === conv.id}
                  onHover={() => setHoveredSession(conv.id)}
                  onLeave={() => setHoveredSession(null)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Session count */}
        <div className="border-t border-border px-4 py-2.5 bg-muted/30">
          <p className="text-[10px] text-muted-foreground tabular-nums select-none">
            {conversations.length} session
            {conversations.length !== 1 ? "s" : ""} ·{" "}
            {conversations.reduce((sum, c) => sum + c.messages.length, 0)}{" "}
            messages
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT COLUMN — Active Chat / Empty State
          ══════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Offline banner */}
        {isOffline && <OfflineBanner />}

        {/* Chat header */}
        {activeConversation && (
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <h3 className="truncate text-sm font-semibold text-foreground">
                {activeConversation.title}
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] h-5 font-normal shrink-0"
              >
                {activeConversation.messages.length} msgs
              </Badge>
              {/* OpenClaw status dot */}
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  status === "connected"
                    ? "bg-green-500"
                    : status === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500",
                )}
                title={`OpenClaw: ${status}`}
              />
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem className="gap-2 text-xs">
                    <Bookmark className="h-3 w-3" />
                    Save as shortcut
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-xs">
                    <Copy className="h-3 w-3" />
                    Copy conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-xs text-destructive focus:text-destructive"
                    onClick={() => handleDelete(activeConversation.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Demo mode pinned prompts */}
        {demoMode && !activeConversation && demoPinnedPrompts.length > 0 && (
          <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mr-2">
              Demo
            </span>
            {demoPinnedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSelectPrompt(p.prompt, p.chips)}
                className="text-[11px] border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
              >
                {p.prompt}
              </button>
            ))}
          </div>
        )}

        {/* Messages area */}
        {activeConversation ? (
          <>
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
                {/* Conversation start marker */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground pb-2">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px] uppercase tracking-widest">
                    Started {formatRelativeTime(activeConversation.createdAt)}
                  </span>
                </div>

                {activeConversation.messages.map((message, idx) => (
                  <ChatCard
                    key={message.id}
                    message={message}
                    isLast={
                      idx === activeConversation.messages.length - 1 &&
                      !streamingContent
                    }
                  />
                ))}

                {/* Streaming response in progress */}
                {streamingContent && (
                  <ChatCard
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                      timestamp: new Date().toISOString(),
                      cardType: "answer",
                    }}
                    isLast={true}
                  />
                )}

                {/* Action indicator while thinking (before first token arrives) */}
                {isThinking && actionIndicator.isActive && !streamingContent && (
                  <ActionIndicator
                    steps={actionIndicator.steps}
                    currentStepIndex={actionIndicator.currentStepIndex}
                    onCancel={handleCancelThinking}
                  />
                )}

                {generationError && (
                  <MessageErrorState
                    onRetry={handleRetry}
                    onCopyPrompt={
                      lastFailedPrompt ? handleCopyLastPrompt : undefined
                    }
                    lastPrompt={lastFailedPrompt ?? undefined}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <PromptInput
              value={promptValue}
              onChange={setPromptValue}
              onSubmit={handleSubmit}
              activeChips={activeChips}
              onToggleChip={handleToggleChip}
              disabled={isThinking || status !== "connected"}
            />
          </>
        ) : (
          <>
            {/* Mobile session boxes */}
            {conversations.length > 0 && (
              <div className="md:hidden border-b border-border bg-background px-3 py-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  Recent Sessions
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {filteredConversations.slice(0, 6).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className="shrink-0 w-48 border border-border bg-card p-2.5 text-left transition-all hover:border-foreground/40"
                    >
                      <h4 className="text-[11px] font-semibold truncate text-foreground">
                        {conv.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelativeTime(conv.updatedAt)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <EmptyState onSelectPrompt={handleSelectPrompt} />

            <PromptInput
              value={promptValue}
              onChange={setPromptValue}
              onSubmit={handleSubmit}
              activeChips={activeChips}
              onToggleChip={handleToggleChip}
              disabled={isThinking || status !== "connected"}
            />
          </>
        )}
      </div>
    </div>
  );
}
