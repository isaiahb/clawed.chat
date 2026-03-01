import { User, Bot } from "lucide-react";
import { cn } from "../../../components/ui/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-pre:bg-muted prose-pre:rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
