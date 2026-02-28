import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { useNavigate } from "react-router-dom";
import {
  Inbox,
  MessageSquare,
  ShieldCheck,
  Clock,
  Plug,
  Glasses,
  Settings,
  Search,
  Send,
  CalendarPlus,
  FileText,
  Home,
  HelpCircle,
  Lock,
  CreditCard,
  LayoutDashboard,
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
    // App pages
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      action: () => go("/app"),
      group: "Navigate",
      keywords: ["overview", "home", "stats", "summary"],
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: <Inbox className="mr-2 h-4 w-4" />,
      action: () => go("/app/inbox"),
      group: "Navigate",
      keywords: ["messages", "mail", "notifications"],
    },
    {
      id: "ask",
      label: "Ask Assistant",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
      action: () => go("/app/ask"),
      group: "Navigate",
      keywords: ["chat", "prompt", "question", "assistant"],
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: <ShieldCheck className="mr-2 h-4 w-4" />,
      action: () => go("/app/approvals"),
      group: "Navigate",
      keywords: ["pending", "confirm", "review", "queue"],
    },
    {
      id: "timeline",
      label: "Timeline",
      icon: <Clock className="mr-2 h-4 w-4" />,
      action: () => go("/app/timeline"),
      group: "Navigate",
      keywords: ["history", "receipts", "audit", "log"],
    },
    {
      id: "connections",
      label: "Connections",
      icon: <Plug className="mr-2 h-4 w-4" />,
      action: () => go("/app/connections"),
      group: "Navigate",
      keywords: ["integrations", "apps", "services", "sync"],
    },
    {
      id: "devices",
      label: "Devices",
      icon: <Glasses className="mr-2 h-4 w-4" />,
      action: () => go("/app/devices"),
      group: "Navigate",
      keywords: ["glasses", "pair", "hardware"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
      action: () => go("/app/settings"),
      group: "Navigate",
      keywords: ["preferences", "account", "profile", "safety"],
    },

    // Quick actions
    {
      id: "new-ask",
      label: "New conversation",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
      action: () => go("/app/ask"),
      group: "Quick Actions",
      keywords: ["new", "chat", "prompt"],
    },
    {
      id: "draft-reply",
      label: "Draft a reply",
      icon: <Send className="mr-2 h-4 w-4" />,
      action: () => go("/app/ask"),
      group: "Quick Actions",
      keywords: ["reply", "respond", "message"],
    },
    {
      id: "create-event",
      label: "Create calendar event",
      icon: <CalendarPlus className="mr-2 h-4 w-4" />,
      action: () => go("/app/ask"),
      group: "Quick Actions",
      keywords: ["meeting", "schedule", "calendar"],
    },
    {
      id: "capture-note",
      label: "Capture a note",
      icon: <FileText className="mr-2 h-4 w-4" />,
      action: () => go("/app/ask"),
      group: "Quick Actions",
      keywords: ["remember", "save", "note"],
    },
    {
      id: "search-web",
      label: "Search the web",
      icon: <Search className="mr-2 h-4 w-4" />,
      action: () => go("/app/ask"),
      group: "Quick Actions",
      keywords: ["google", "lookup", "find", "browse"],
    },

    // Public pages
    {
      id: "site-home",
      label: "Home",
      icon: <Home className="mr-2 h-4 w-4" />,
      action: () => go("/"),
      group: "Site",
    },
    {
      id: "site-how-it-works",
      label: "How it works",
      icon: <HelpCircle className="mr-2 h-4 w-4" />,
      action: () => go("/how-it-works"),
      group: "Site",
    },
    {
      id: "site-security",
      label: "Security",
      icon: <Lock className="mr-2 h-4 w-4" />,
      action: () => go("/security"),
      group: "Site",
    },
    {
      id: "site-pricing",
      label: "Pricing",
      icon: <CreditCard className="mr-2 h-4 w-4" />,
      action: () => go("/pricing"),
      group: "Site",
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
