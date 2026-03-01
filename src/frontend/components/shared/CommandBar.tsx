import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@frontend/components/ui/command";

import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Plug,
  Settings,
  Search,
  Send,
  CalendarPlus,
  FileText,
  LogOut,
} from "lucide-react";

interface CommandAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string[];
}

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const navigate = useNavigate();

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const actions: CommandAction[] = [
    // App pages — only Chat, Connections, Settings
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
      action: () => go("/app"),
      group: "Navigate",
      keywords: [
        "ask",
        "chat",
        "prompt",
        "question",
        "assistant",
        "dashboard",
        "home",
      ],
    },
    {
      id: "connections",
      label: "Connections",
      icon: <Plug className="mr-2 h-4 w-4" />,
      action: () => go("/app/connections"),
      group: "Navigate",
      keywords: ["integrations", "apps", "services", "sync", "tools"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
      action: () => go("/app/settings"),
      group: "Navigate",
      keywords: [
        "preferences",
        "account",
        "profile",
        "safety",
        "theme",
        "appearance",
      ],
    },

    // Quick actions
    {
      id: "new-session",
      label: "New session",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
      action: () => go("/app"),
      group: "Quick Actions",
      keywords: ["new", "chat", "prompt", "conversation"],
    },
    {
      id: "draft-reply",
      label: "Draft a reply",
      icon: <Send className="mr-2 h-4 w-4" />,
      action: () => go("/app"),
      group: "Quick Actions",
      keywords: ["reply", "respond", "message", "email"],
    },
    {
      id: "create-event",
      label: "Create calendar event",
      icon: <CalendarPlus className="mr-2 h-4 w-4" />,
      action: () => go("/app"),
      group: "Quick Actions",
      keywords: ["meeting", "schedule", "calendar"],
    },
    {
      id: "capture-note",
      label: "Capture a note",
      icon: <FileText className="mr-2 h-4 w-4" />,
      action: () => go("/app"),
      group: "Quick Actions",
      keywords: ["remember", "save", "note"],
    },
    {
      id: "search-web",
      label: "Search the web",
      icon: <Search className="mr-2 h-4 w-4" />,
      action: () => go("/app"),
      group: "Quick Actions",
      keywords: ["google", "lookup", "find", "browse"],
    },
    // Account
    {
      id: "sign-out",
      label: "Sign out",
      icon: <LogOut className="mr-2 h-4 w-4" />,
      action: () => go("/login"),
      group: "Account",
      keywords: ["logout", "sign out", "exit"],
    },
  ];

  // Group actions
  const groups = actions.reduce<Record<string, CommandAction[]>>(
    (acc, action) => {
      if (!acc[action.group]) acc[action.group] = [];
      acc[action.group].push(action);
      return acc;
    },
    {},
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groups).map(([group, items], groupIndex) => (
          <div key={group}>
            {groupIndex > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={[item.label, ...(item.keywords ?? [])].join(" ")}
                  onSelect={() => item.action()}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
