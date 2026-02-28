import { useState, useRef, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  User,
  ShieldCheck,
  Loader2,
  Pin,
  PinOff,
  Trash2,
  MoreHorizontal,
  Copy,
  Bookmark,
  ChevronRight,
  Clock,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { mockConversations } from "@/data/mock";
import type { AskConversation, AskMessage, AskContextChip } from "@/types";

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
    activeColor:
      "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-800",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    color: "text-muted-foreground border-border",
    activeColor:
      "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/40 dark:border-violet-800",
  },
  {
    id: "web",
    label: "Web",
    icon: Globe,
    color: "text-muted-foreground border-border",
    activeColor:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    color: "text-muted-foreground border-border",
    activeColor:
      "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800",
  },
  {
    id: "slack",
    label: "Slack",
    icon: Hash,
    color: "text-muted-foreground border-border",
    activeColor:
      "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-800",
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
    prompt: "Find flights from SFO to NYC next Thursday",
    chips: ["web"] as AskContextChip[],
  },
  {
    prompt: "Draft a follow-up email to Acme Corp",
    chips: ["email"] as AskContextChip[],
  },
  {
    prompt: "What action items did I capture this week?",
    chips: ["notes"] as AskContextChip[],
  },
];

// ──────────────────────────────────────────────
// Message bubble component
// ──────────────────────────────────────────────

function MessageBubble({
  message,
  isLast,
}: {
  message: AskMessage;
  isLast: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        isLast && "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900 dark:to-amber-800 dark:text-amber-300",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm",
          )}
        >
          {/* Render markdown-like content */}
          {message.content.split("\n").map((line, i) => {
            if (line.startsWith("**") && line.endsWith("**")) {
              return (
                <p key={i} className="font-semibold">
                  {line.replace(/\*\*/g, "")}
                </p>
              );
            }
            if (line.startsWith("> ")) {
              return (
                <blockquote
                  key={i}
                  className={cn(
                    "border-l-2 pl-3 my-1 italic",
                    isUser
                      ? "border-primary-foreground/40 text-primary-foreground/80"
                      : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {line.replace(/^>\s*/, "")}
                </blockquote>
              );
            }
            if (line.startsWith("- ") || line.startsWith("• ")) {
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                  <span>{line.replace(/^[-•]\s*/, "")}</span>
                </div>
              );
            }
            if (line.match(/^\d+\.\s/)) {
              return (
                <p key={i} className="ml-1">
                  {line}
                </p>
              );
            }
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            // Handle inline bold
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i}>
                {parts.map((part, j) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={j}>{part.replace(/\*\*/g, "")}</strong>;
                  }
                  return <span key={j}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>

        {/* Context chips on assistant messages */}
        {!isUser && message.context && message.context.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
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

        {/* Suggested action */}
        {!isUser && message.suggestedAction && (
          <div className="mt-1.5 flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs gap-1.5 rounded-full">
              <ShieldCheck className="h-3 w-3" />
              {message.suggestedAction.label}
            </Button>
            {message.suggestedAction.type === "approval" && (
              <Badge
                variant="secondary"
                className="text-[10px] h-5 font-normal"
              >
                Requires approval
              </Badge>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Thinking indicator
// ──────────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex gap-3 animate-in fade-in-0 duration-300">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900 dark:to-amber-800 dark:text-amber-300">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Thinking…</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Conversation list sidebar item
// ──────────────────────────────────────────────

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onPin,
  onDelete,
}: {
  conversation: AskConversation;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MessageSquare className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-medium">{conversation.title}</h4>
          {conversation.pinned && (
            <Pin className="h-3 w-3 shrink-0 text-primary/60" />
          )}
        </div>
        {lastMessage && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {lastMessage.content.slice(0, 60)}
            {lastMessage.content.length > 60 ? "…" : ""}
          </p>
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(conversation.updatedAt)}
        </span>
      </div>

      {/* Quick actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className="gap-2"
          >
            {conversation.pinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
            {conversation.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  );
}

// ──────────────────────────────────────────────
// Empty state / new conversation
// ──────────────────────────────────────────────

function EmptyConversation({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string, chips: AskContextChip[]) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary mb-6">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold text-center">
        What can I help with?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
        Ask me anything — I can read your email, check your calendar, search the
        web, and take actions (with your approval).
      </p>

      {/* Suggested prompts grid */}
      <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {suggestedPrompts.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(suggestion.prompt, suggestion.chips)}
            className="group flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
          >
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">
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
    <div className="border-t bg-background p-4">
      {/* Context chips */}
      <div className="mb-3 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mr-1">
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
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                    isActive ? chip.activeColor : chip.color,
                    "hover:shadow-sm",
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
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] max-h-[160px] resize-none pr-4 py-3 text-sm rounded-xl"
            rows={1}
            disabled={disabled}
          />
        </div>
        <Button
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>

      {/* Hint */}
      <p className="mt-2 text-[10px] text-muted-foreground text-center">
        Clawed can make mistakes. Sensitive actions always require your
        approval.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Ask Page
// ──────────────────────────────────────────────

export default function AskPage() {
  useDocumentTitle("Ask");
  const [conversations, setConversations] =
    useState<AskConversation[]>(mockConversations);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [promptValue, setPromptValue] = useState("");
  const [activeChips, setActiveChips] = useState<Set<AskContextChip>>(
    new Set(["email", "calendar"]),
  );
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, isThinking]);

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

  // Handle sending a message
  const handleSubmit = () => {
    if (!promptValue.trim() || isThinking) return;

    const userMessage: AskMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: promptValue.trim(),
      timestamp: new Date().toISOString(),
      context: Array.from(activeChips),
    };

    if (activeConversation) {
      // Add to existing conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: [...c.messages, userMessage],
                updatedAt: new Date().toISOString(),
              }
            : c,
        ),
      );
    } else {
      // Create new conversation
      const newConv: AskConversation = {
        id: `conv-${Date.now()}`,
        title:
          promptValue.trim().length > 40
            ? promptValue.trim().slice(0, 40) + "…"
            : promptValue.trim(),
        messages: [userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    }

    setPromptValue("");
    setIsThinking(true);

    // Simulate assistant response
    setTimeout(
      () => {
        const assistantMessage: AskMessage = {
          id: `msg-${Date.now()}-reply`,
          role: "assistant",
          content:
            "I've looked into that for you. Here's what I found:\n\n" +
            "Based on your connected sources, I can see the relevant information. " +
            "Let me know if you'd like me to take any action on this — I'll draft it for your review first.\n\n" +
            "Would you like me to:\n- Draft a response\n- Create a calendar event\n- Save a note about this",
          timestamp: new Date().toISOString(),
          context: Array.from(activeChips),
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId ||
            c.id === prev.find((pc) => pc.messages.includes(userMessage))?.id
              ? {
                  ...c,
                  messages: [...c.messages, assistantMessage],
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        );

        setIsThinking(false);
      },
      1500 + Math.random() * 1000,
    );
  };

  // Handle selecting a suggested prompt
  const handleSelectPrompt = (prompt: string, chips: AskContextChip[]) => {
    setActiveChips(new Set(chips));
    setPromptValue(prompt);
    setActiveConversationId(null);
  };

  // Handle creating a new conversation
  const handleNewConversation = () => {
    setActiveConversationId(null);
    setPromptValue("");
  };

  // Handle pinning
  const handlePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    );
  };

  // Handle deleting
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
      // Pinned first, then by updatedAt
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="flex h-full">
      {/* ── Conversation List Sidebar ── */}
      <div
        className={cn(
          "flex flex-col border-r bg-muted/30 transition-all duration-200",
          showSidebar ? "w-72 lg:w-80" : "w-0 overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Conversations</h2>
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
            <TooltipContent>New conversation</TooltipContent>
          </Tooltip>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 px-2 py-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                {sidebarSearch
                  ? "No conversations match your search"
                  : "No conversations yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversationId === conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  onPin={() => handlePin(conv.id)}
                  onDelete={() => handleDelete(conv.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Stats */}
        <div className="border-t px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground">
            {conversations.length} conversation
            {conversations.length !== 1 ? "s" : ""} ·{" "}
            {conversations.reduce((sum, c) => sum + c.messages.length, 0)}{" "}
            messages
          </p>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat header */}
        {activeConversation && (
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:hidden"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showSidebar && "rotate-180",
                  )}
                />
              </Button>
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate text-sm font-medium">
                {activeConversation.title}
              </h3>
              <Badge
                variant="secondary"
                className="text-[10px] h-5 font-normal shrink-0"
              >
                {activeConversation.messages.length} messages
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handlePin(activeConversation.id)}
                  >
                    {activeConversation.pinned ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {activeConversation.pinned ? "Unpin" : "Pin"} conversation
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem className="gap-2">
                    <Bookmark className="h-3.5 w-3.5" />
                    Save as shortcut
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Copy className="h-3.5 w-3.5" />
                    Copy conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => handleDelete(activeConversation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Messages area */}
        {activeConversation ? (
          <>
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl space-y-6 p-6">
                {/* Conversation start marker */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    Started {formatRelativeTime(activeConversation.createdAt)}
                  </span>
                </div>

                {activeConversation.messages.map((message, idx) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={idx === activeConversation.messages.length - 1}
                  />
                ))}

                {isThinking && <ThinkingIndicator />}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <PromptInput
              value={promptValue}
              onChange={setPromptValue}
              onSubmit={handleSubmit}
              activeChips={activeChips}
              onToggleChip={handleToggleChip}
              disabled={isThinking}
            />
          </>
        ) : (
          <>
            <EmptyConversation onSelectPrompt={handleSelectPrompt} />
            <PromptInput
              value={promptValue}
              onChange={setPromptValue}
              onSubmit={handleSubmit}
              activeChips={activeChips}
              onToggleChip={handleToggleChip}
              disabled={isThinking}
            />
          </>
        )}
      </div>
    </div>
  );
}
