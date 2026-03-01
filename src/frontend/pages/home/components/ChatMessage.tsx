import { User, Bot } from "lucide-react";
import { cn } from "../../../components/ui/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  photo?: {
    url: string;
    requestId: string;
  };
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-4",
        isUser ? "bg-transparent" : "bg-muted/30",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-primary" : "bg-chart-4",
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary-foreground" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? "You" : "Clawed"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {message.timestamp}
          </span>
        </div>

        {/* Photo attachment */}
        {message.photo && (
          <div className="rounded-lg overflow-hidden border max-w-xs">
            <img
              src={message.photo.url}
              alt="Captured photo"
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Text content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}
