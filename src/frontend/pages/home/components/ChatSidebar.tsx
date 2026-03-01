import { useState } from "react";
import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { Button, ScrollArea } from "../../../components/ui";
import { cn } from "../../../components/ui/utils";

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border"
      >
        {isOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <Menu className="w-4 h-4" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative z-40 h-full w-64 border-r bg-card flex flex-col transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* New chat button */}
        <div className="p-3 border-b">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              onNew();
              setIsOpen(false);
            }}
          >
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-3">
                No conversations yet. Start a new chat!
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                    activeId === conv.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                  onClick={() => {
                    onSelect(conv.id);
                    setIsOpen(false);
                  }}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{conv.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            MentraOS Chat
          </p>
        </div>
      </div>
    </>
  );
}
