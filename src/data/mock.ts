import type {
  InboxItem,
  Approval,
  TimelineEntry,
  Connection,
  Device,
  AskConversation,
  SafetyMode,
} from "@/types";

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export const mockInboxItems: InboxItem[] = [
  {
    id: "inb-1",
    type: "message",
    title: "Alex Chen",
    summary: "Can you review the Q3 budget proposal before tomorrow's meeting?",
    source: "slack",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    priority: "high",
    suggestedAction: {
      label: "Draft reply",
      type: "draft-reply",
    },
  },
  {
    id: "inb-2",
    type: "message",
    title: "Maria Lopez",
    summary:
      "Flight confirmation for SFO → NYC on June 14. Confirmation #AF29K.",
    source: "email",
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    read: false,
    priority: "medium",
    suggestedAction: {
      label: "Add to calendar",
      type: "create-task",
    },
  },
  {
    id: "inb-3",
    type: "calendar",
    title: "Design Review — Glasses UI",
    summary: "In 45 min · Zoom · With Jamie, Sam, Priya",
    source: "calendar",
    timestamp: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    read: true,
    priority: "high",
    suggestedAction: {
      label: "Prep notes",
      type: "draft-reply",
    },
  },
  {
    id: "inb-4",
    type: "message",
    title: "DevOps Bot",
    summary: "Deploy to staging succeeded. 3 new warnings in build log.",
    source: "slack",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: true,
    priority: "low",
  },
  {
    id: "inb-5",
    type: "message",
    title: "Jordan Reeves",
    summary: "Hey, are we still on for lunch Thursday?",
    source: "email",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    read: false,
    priority: "low",
    suggestedAction: {
      label: "Quick reply",
      type: "draft-reply",
    },
  },
  {
    id: "inb-6",
    type: "reminder",
    title: "Follow up: Partnership proposal",
    summary: "You asked to be reminded to follow up with Acme Corp today.",
    source: "assistant",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
    priority: "medium",
    suggestedAction: {
      label: "Draft email",
      type: "draft-reply",
    },
  },
  {
    id: "inb-7",
    type: "message",
    title: "Newsletter — TechCrunch",
    summary: "Apple announces new AR glasses SDK. OpenAI ships GPT-5 turbo.",
    source: "email",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: true,
    priority: "low",
  },
  {
    id: "inb-8",
    type: "calendar",
    title: "Weekly 1:1 with Pat",
    summary: "Tomorrow 10:00 AM · Google Meet",
    source: "calendar",
    timestamp: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
    read: true,
    priority: "medium",
  },
];

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export const mockApprovals: Approval[] = [
  {
    id: "apr-1",
    actionSummary: "Send reply to Alex Chen on Slack",
    risk: "low",
    status: "pending",
    destination: "Slack · #product-team",
    preview:
      "Hi Alex, I'll have the Q3 budget reviewed by end of day. I've flagged two line items that look off — let's discuss in tomorrow's meeting.",
    inputs: {
      originalMessage:
        "Can you review the Q3 budget proposal before tomorrow's meeting?",
      channel: "#product-team",
    },
    toolName: "slack.sendMessage",
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "apr-2",
    actionSummary: "Create calendar event: Lunch with Jordan",
    risk: "low",
    status: "pending",
    destination: "Google Calendar",
    preview:
      "Thursday, 12:30 PM – 1:30 PM\nLocation: Poke Bar on 3rd St\nGuest: jordan@example.com",
    inputs: {
      date: "Thursday",
      time: "12:30 PM",
      duration: "1 hour",
    },
    toolName: "calendar.createEvent",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "apr-3",
    actionSummary: "Send partnership follow-up email to Acme Corp",
    risk: "medium",
    status: "pending",
    destination: "Email · sarah@acmecorp.com",
    preview:
      "Hi Sarah,\n\nFollowing up on our conversation last week about the integration partnership. We've put together a draft proposal — would love to schedule 30 minutes to walk through it.\n\nBest,\nYou",
    inputs: {
      to: "sarah@acmecorp.com",
      subject: "Re: Integration Partnership — Follow Up",
    },
    toolName: "email.send",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "apr-4",
    actionSummary: "Delete 47 archived newsletter emails",
    risk: "high",
    status: "pending",
    destination: "Gmail · Archive",
    preview:
      "Permanently delete 47 newsletter emails from TechCrunch, Morning Brew, and TLDR that are older than 30 days.",
    inputs: {
      count: 47,
      sources: ["TechCrunch", "Morning Brew", "TLDR"],
      olderThan: "30 days",
    },
    toolName: "email.bulkDelete",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "apr-5",
    actionSummary: "Post update to company Slack #general",
    risk: "high",
    status: "pending",
    destination: "Slack · #general (142 members)",
    preview:
      "📢 Team update: We're moving the Friday demo to Thursday 3 PM this week only. Same Zoom link. See you there!",
    inputs: {
      channel: "#general",
      memberCount: 142,
    },
    toolName: "slack.sendMessage",
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "apr-6",
    actionSummary: "Archive Slack DMs older than 90 days",
    risk: "low",
    status: "approved",
    destination: "Slack · DMs",
    preview:
      "Archive 23 direct message threads that have been inactive for more than 90 days.",
    inputs: {
      count: 23,
      olderThan: "90 days",
    },
    toolName: "slack.archiveDMs",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const mockTimelineEntries: TimelineEntry[] = [
  {
    id: "tl-1",
    action: "Sent Slack message to Alex Chen",
    tool: "slack.sendMessage",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    details: {
      what: "Sent reply about Q3 budget review",
      where: "Slack · #product-team",
      dataUsed: "Original message from Alex, calendar context",
      undoAvailable: true,
    },
  },
  {
    id: "tl-2",
    action: "Created calendar event",
    tool: "calendar.createEvent",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    details: {
      what: "Lunch with Jordan — Thursday 12:30 PM",
      where: "Google Calendar",
      dataUsed: "Email thread with Jordan Reeves",
      undoAvailable: true,
    },
  },
  {
    id: "tl-3",
    action: "Summarized inbox",
    tool: "email.summarize",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    details: {
      what: "Generated summary of 12 unread emails",
      where: "Gmail inbox",
      dataUsed: "Email subjects and previews",
      undoAvailable: false,
    },
  },
  {
    id: "tl-4",
    action: "Archived 23 old Slack DMs",
    tool: "slack.archiveDMs",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    details: {
      what: "Archived 23 DM threads inactive for 90+ days",
      where: "Slack · Direct Messages",
      dataUsed: "Thread activity timestamps",
      undoAvailable: true,
    },
  },
  {
    id: "tl-5",
    action: "Web lookup: SFO → NYC flights June 14",
    tool: "browser.search",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    details: {
      what: "Searched for flight options and compared prices",
      where: "Web · Google Flights",
      dataUsed: "Travel dates from email confirmation",
      undoAvailable: false,
    },
  },
  {
    id: "tl-6",
    action: "Failed to send email to sarah@acmecorp.com",
    tool: "email.send",
    status: "failed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    details: {
      what: "Attempted to send partnership follow-up",
      where: "Gmail",
      dataUsed: "Draft email content, contact info",
      undoAvailable: false,
      error: "SMTP authentication expired. Please reconnect Gmail.",
    },
  },
  {
    id: "tl-7",
    action: "Created reminder: Follow up with Acme Corp",
    tool: "assistant.reminder",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    details: {
      what: "Set reminder for today to follow up on partnership proposal",
      where: "Clawed · Reminders",
      dataUsed: "User voice command",
      undoAvailable: true,
    },
  },
  {
    id: "tl-8",
    action: "Captured meeting notes",
    tool: "assistant.note",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    details: {
      what: "Saved 3 action items from Design Review meeting",
      where: "Clawed · Notes",
      dataUsed: "Voice transcription from glasses",
      undoAvailable: false,
    },
  },
  {
    id: "tl-9",
    action: "Snoozed 5 low-priority emails",
    tool: "email.snooze",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    details: {
      what: "Auto-snoozed newsletters and promotional emails until weekend",
      where: "Gmail",
      dataUsed: "Email sender categories, priority rules",
      undoAvailable: true,
    },
  },
  {
    id: "tl-10",
    action: "Draft reply to Maria Lopez",
    tool: "email.draft",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    details: {
      what: "Created draft acknowledging flight confirmation",
      where: "Gmail · Drafts",
      dataUsed: "Flight confirmation email",
      undoAvailable: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export const mockConnections: Connection[] = [
  {
    id: "conn-1",
    provider: "slack",
    name: "Slack",
    status: "connected",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    scopes: ["Read messages", "Send messages", "Manage DMs", "List channels"],
    icon: "MessageSquare",
    lastSync: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "conn-2",
    provider: "gmail",
    name: "Gmail",
    status: "connected",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    scopes: ["Read emails", "Send emails", "Manage drafts", "Manage labels"],
    icon: "Mail",
    lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "conn-3",
    provider: "google-calendar",
    name: "Google Calendar",
    status: "connected",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    scopes: ["Read events", "Create events", "Modify events"],
    icon: "Calendar",
    lastSync: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "conn-4",
    provider: "notion",
    name: "Notion",
    status: "disconnected",
    scopes: ["Read pages", "Create pages", "Search"],
    icon: "FileText",
  },
  {
    id: "conn-5",
    provider: "linear",
    name: "Linear",
    status: "disconnected",
    scopes: ["Read issues", "Create issues", "Update status"],
    icon: "SquareKanban",
  },
  {
    id: "conn-6",
    provider: "github",
    name: "GitHub",
    status: "error",
    connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    scopes: ["Read repos", "Read issues", "Read PRs"],
    icon: "Github",
    error: "Token expired. Please reconnect.",
  },
];

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export const mockDevices: Device[] = [
  {
    id: "dev-1",
    name: "Meta Ray-Ban Stories",
    type: "glasses",
    status: "paired",
    lastSync: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    battery: 72,
    firmwareVersion: "4.2.1",
    glanceLayout: "compact",
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  },
  {
    id: "dev-2",
    name: "Even Realities G1",
    type: "glasses",
    status: "disconnected",
    firmwareVersion: "2.0.3",
    glanceLayout: "standard",
    quietHoursEnabled: false,
  },
  {
    id: "dev-3",
    name: "MacBook Pro — Chrome",
    type: "browser",
    status: "paired",
    lastSync: new Date(Date.now() - 1000 * 60).toISOString(),
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
          "I've drafted a reply. Here's the preview:\n\n> Hi Alex, I'll have the Q3 budget reviewed by end of day. I've flagged two line items that look off — let's discuss in tomorrow's meeting.\n\nThis will be sent to **Slack · #product-team**.",
        timestamp: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
        context: ["email", "slack"],
        suggestedAction: {
          label: "Send reply",
          type: "approval",
          approvalId: "apr-1",
        },
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
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
        suggestedAction: {
          label: "Add to calendar",
          type: "approval",
          approvalId: "apr-2",
        },
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3 + 5000).toISOString(),
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
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5 + 4000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// User settings
// ---------------------------------------------------------------------------

export const mockUserSettings = {
  safetyMode: "draft-first" as SafetyMode,
  name: "Parth",
  email: "parth@example.com",
  avatar: null,
  theme: "system" as "light" | "dark" | "system",
  glanceMaxLines: 2,
  notificationsEnabled: true,
  weeklyDigest: true,
};

// ---------------------------------------------------------------------------
// Quick stats for dashboard
// ---------------------------------------------------------------------------

export const mockStats = {
  actionsThisWeek: 34,
  approvalsWaiting: 5,
  undoRate: 0.03,
  avgResponseTime: 2.8,
  topTools: [
    { name: "Slack", count: 14 },
    { name: "Gmail", count: 11 },
    { name: "Calendar", count: 6 },
    { name: "Browser", count: 3 },
  ],
};
