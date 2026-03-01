import type {
  Connection,
  AskConversation,
  SafetyMode,
  UserSettings,
} from "@frontend/types";

// ---------------------------------------------------------------------------
// Connections (with permissions for read/write/approval preview)
// ---------------------------------------------------------------------------

export const mockConnections: Connection[] = [
  {
    id: "conn-1",
    provider: "slack",
    name: "Slack",
    status: "connected",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    scopes: ["Read messages", "Send messages", "Manage DMs", "List channels"],
    permissions: [
      {
        action: "Read messages",
        type: "read",
        description: "View messages in channels and DMs you belong to",
      },
      {
        action: "Send messages",
        type: "write",
        description: "Post messages to channels and DMs on your behalf",
      },
      {
        action: "Manage DMs",
        type: "write",
        description: "Create and archive direct message conversations",
      },
      {
        action: "List channels",
        type: "read",
        description: "See available channels and their metadata",
      },
      {
        action: "Send to new channels",
        type: "approval",
        description:
          "Posting to a channel for the first time always requires your OK",
      },
    ],
    icon: "MessageSquare",
    lastSync: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    capability: "Read and send messages across your workspace",
  },
  {
    id: "conn-2",
    provider: "gmail",
    name: "Gmail",
    status: "connected",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    scopes: ["Read emails", "Send emails", "Manage drafts", "Manage labels"],
    permissions: [
      {
        action: "Read emails",
        type: "read",
        description: "Access your inbox and read email content",
      },
      {
        action: "Manage drafts",
        type: "write",
        description: "Create and edit email drafts for your review",
      },
      {
        action: "Manage labels",
        type: "write",
        description: "Apply and remove labels to organize your mail",
      },
      {
        action: "Send emails",
        type: "approval",
        description:
          "Sending to new recipients always requires your explicit approval",
      },
      {
        action: "Delete emails",
        type: "approval",
        description: "Permanently deleting emails always requires confirmation",
      },
    ],
    icon: "Mail",
    lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    capability: "Read, draft, and send emails on your behalf",
  },
  {
    id: "conn-3",
    provider: "google-calendar",
    name: "Google Calendar",
    status: "connected",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    scopes: ["Read events", "Create events", "Modify events"],
    permissions: [
      {
        action: "Read events",
        type: "read",
        description: "View your calendar events and availability",
      },
      {
        action: "Create events",
        type: "write",
        description: "Add new events to your calendar",
      },
      {
        action: "Modify events",
        type: "write",
        description: "Reschedule or update existing events",
      },
      {
        action: "Delete events",
        type: "approval",
        description: "Removing calendar events requires your confirmation",
      },
    ],
    icon: "Calendar",
    lastSync: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    capability: "Check your schedule and manage calendar events",
  },
  {
    id: "conn-4",
    provider: "notion",
    name: "Notion",
    status: "disconnected",
    scopes: ["Read pages", "Create pages", "Search"],
    permissions: [
      {
        action: "Read pages",
        type: "read",
        description: "Access and read your Notion pages and databases",
      },
      {
        action: "Create pages",
        type: "write",
        description: "Create new pages and entries in your workspace",
      },
      {
        action: "Search",
        type: "read",
        description: "Search across your Notion workspace content",
      },
    ],
    icon: "FileText",
    capability: "Search and create pages in your workspace",
  },
  {
    id: "conn-5",
    provider: "linear",
    name: "Linear",
    status: "disconnected",
    scopes: ["Read issues", "Create issues", "Update status"],
    permissions: [
      {
        action: "Read issues",
        type: "read",
        description: "View issues, projects, and team boards",
      },
      {
        action: "Create issues",
        type: "write",
        description: "File new issues and tasks",
      },
      {
        action: "Update status",
        type: "write",
        description: "Change issue status and assignees",
      },
    ],
    icon: "SquareKanban",
    capability: "Track and manage issues in your projects",
  },
  {
    id: "conn-6",
    provider: "github",
    name: "GitHub",
    status: "error",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    scopes: ["Read repos", "Read issues", "Read PRs"],
    permissions: [
      {
        action: "Read repos",
        type: "read",
        description: "View repository contents and metadata",
      },
      {
        action: "Read issues",
        type: "read",
        description: "Access issues and their comments",
      },
      {
        action: "Read PRs",
        type: "read",
        description: "View pull requests and review status",
      },
    ],
    icon: "Github",
    error: "Token expired. Please reconnect.",
    capability: "Read your repositories, issues, and pull requests",
  },
];

// ---------------------------------------------------------------------------
// Ask / Conversations
// ---------------------------------------------------------------------------

export const mockConversations: AskConversation[] = [
  {
    id: "conv-1",
    title: "Q3 Budget Review",
    messages: [
      {
        id: "msg-1a",
        role: "user",
        content: "Summarize the key points from Alex's Q3 budget email",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: "msg-1b",
        role: "assistant",
        content:
          "Here are the key points from Alex's Q3 budget proposal:\n\n1. **Total budget request**: $2.4M (up 12% from Q2)\n2. **Engineering headcount**: 3 new hires proposed\n3. **Infrastructure costs**: Moving to reserved instances, saving ~$18K/mo\n4. **Marketing**: Requesting $200K for product launch campaign\n\nTwo items flagged: The contractor line item seems duplicated, and the travel budget doesn't match the approved policy.",
        timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
        context: ["email"],
        cardType: "answer",
      },
      {
        id: "msg-1c",
        role: "user",
        content:
          "Draft a reply to Alex saying I'll review it and flag the two issues",
        timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
      },
      {
        id: "msg-1d",
        role: "assistant",
        content:
          "I've drafted a reply. Here's the preview:\n\n> Hi Alex, I'll have the Q3 budget reviewed by end of day. I've flagged two line items that look off — let's discuss in tomorrow's meeting.\n\nThis will be sent to **alex@acme.com** via Gmail.",
        timestamp: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
        context: ["email"],
        cardType: "draft",
        suggestedAction: {
          label: "Send reply",
          type: "approval",
          approvalId: "apr-1",
        },
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
    summary: "Summarized Q3 budget, drafted reply to Alex",
    modeTag: "Draft first",
    status: "completed",
  },
  {
    id: "conv-2",
    title: "Flight details lookup",
    messages: [
      {
        id: "msg-2a",
        role: "user",
        content: "What are the details of my upcoming flight?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      },
      {
        id: "msg-2b",
        role: "assistant",
        content:
          "Found your flight confirmation from Maria Lopez:\n\n✈️ **SFO → NYC**\n📅 June 14, departing 8:45 AM\n🎫 Confirmation: AF29K\n🪑 Seat 14A (window)\n\nWould you like me to add this to your calendar or set a reminder for the day before?",
        timestamp: new Date(
          Date.now() - 1000 * 60 * 60 * 3 + 5000,
        ).toISOString(),
        context: ["email"],
        cardType: "answer",
        suggestedAction: {
          label: "Add to calendar",
          type: "approval",
          approvalId: "apr-2",
        },
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3 + 5000).toISOString(),
    summary: "Found SFO → NYC flight on June 14",
    modeTag: "Draft first",
    status: "completed",
  },
  {
    id: "conv-3",
    title: "Meeting prep",
    messages: [
      {
        id: "msg-3a",
        role: "user",
        content: "What's my next meeting and what should I prep?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: "msg-3b",
        role: "assistant",
        content:
          "Your next meeting is:\n\n📋 **Design Review — Glasses UI**\n⏰ In 45 minutes · Zoom\n👥 Jamie, Sam, Priya\n\n**Suggested prep:**\n- Review the latest Figma mockups (Jamie shared them yesterday)\n- Check the open issues in Linear tagged `glasses-ui`\n- Sam mentioned wanting to discuss notification stacking\n\nWant me to pull up the Figma link or summarize the Linear issues?",
        timestamp: new Date(
          Date.now() - 1000 * 60 * 60 * 5 + 4000,
        ).toISOString(),
        context: ["calendar", "slack"],
        cardType: "answer",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5 + 4000).toISOString(),
    summary: "Prepped for Design Review with Jamie, Sam, Priya",
    modeTag: "Read only",
    status: "completed",
  },
];

// ---------------------------------------------------------------------------
// User settings
// ---------------------------------------------------------------------------

export const mockUserSettings: UserSettings = {
  safetyMode: "draft-first" as SafetyMode,
  responseStyle: "medium",
  name: "Parth",
  email: "parth@example.com",
  avatar: null,
  theme: "light" as "light" | "dark" | "system",
};
