<h1 align="center">
  <br>
  <img src="public/favicon.svg" alt="Clawed" width="48" height="48">
  <br>
  Clawed
  <br>
</h1>

<p align="center">
  <strong>Personal assistant for people on the go.</strong><br>
  Glanceable on glasses, controlled in the web hub.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#development">Development</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## Overview

Clawed is a personal AI assistant designed for people who are always moving. It pairs with smart glasses for glanceable, hands-free interactions and provides a full web hub for deeper control — inbox management, conversational AI, approval workflows, action receipts, and multi-device management.

The core philosophy: **ask in under 3 seconds, get results in under 5, approve with one tap, and always have a receipt.**

## Features

### 🌐 Marketing Site

| Page | Description |
|------|-------------|
| **Home** | Hero, three-pillar value prop, use cases, trust section, CTA |
| **How It Works** | Step-by-step flow from ask → result → approve → receipt |
| **Glasses Experience** | Interactive lens simulator, card types, interaction methods, pairing guide |
| **Security** | Safety modes, permission scopes, approval flow, receipt logging, data retention |
| **Pricing** | 3-tier pricing with annual toggle, feature comparison table, FAQs |
| **Docs** | Quick links, guides, API reference with code samples |
| **Sign In / Onboarding** | Auth forms + multi-step onboarding (safety mode → connections → devices → demo) |

### 🖥️ Web App

| Page | Description |
|------|-------------|
| **Dashboard** | Greeting, stats overview, quick actions, pending approvals, recent activity, top tools, glasses CTA |
| **Inbox** | Prioritized feed from email, Slack, calendar. Search, filter, detail panel, suggested actions |
| **Ask** | Chat interface with context chips (email, calendar, web, notes, Slack). Conversation history, pinning, suggested prompts |
| **Approvals** | Queue of pending actions with risk levels. Review, edit, approve/reject. Bulk approve low-risk |
| **Timeline** | Full action history with receipt cards. Filter by status/tool, export, undo support |
| **Connections** | Integration management (Slack, Gmail, Google Calendar, Notion, Linear, GitHub). Scope viewer, test, disconnect |
| **Devices** | Smart glasses + other device management. Pairing flow, glance layout settings, quiet hours, test prompts |
| **Settings** | Profile, safety mode, theme, notifications, glance config, data retention, sessions, danger zone |

### ⚡ Shared Features

- **Safety Modes** — Read Only, Draft First, Assisted — with visual indicators everywhere
- **Command Bar** — `⌘K` global search and quick actions
- **Dark Mode** — Full dark theme with system preference detection and manual toggle
- **Responsive** — Mobile-first with collapsible sidebar, sheet menus, and adaptive layouts
- **Glasses Simulator** — Interactive lens demo with voice simulation, layout modes, and auto-play
- **Receipt System** — Every action logged with what, where, when, data used, and undo availability

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) 1.0+
- A modern browser

### Install & Run

```bash
# Clone the repository
git clone https://github.com/your-username/Clawed.git
cd Clawed

# Install dependencies (bun or npm)
bun install
# or: npm install

# Start the dev server
bun dev
# or: npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for Production

```bash
bun run build
# or: npm run build

# Preview the production build
bun run preview
# or: npm run preview
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
├──────────────┬──────────────────────────────┤
│  Marketing   │         Web App              │
│  Site        │                              │
│  (SiteLayout)│  ┌────────┐  ┌───────────┐  │
│              │  │Sidebar │  │  Page      │  │
│  • Home      │  │        │  │  Content   │  │
│  • How It    │  │ Nav    │  │            │  │
│    Works     │  │ Safety │  │ Dashboard  │  │
│  • Glasses   │  │ Search │  │ Inbox      │  │
│  • Security  │  │ User   │  │ Ask        │  │
│  • Pricing   │  │        │  │ Approvals  │  │
│  • Docs      │  └────────┘  │ Timeline   │  │
│              │  (AppLayout)  │ ...        │  │
│              │               └───────────┘  │
├──────────────┴──────────────────────────────┤
│               Shared Layer                   │
│  Components │ Stores │ Types │ Mock Data     │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **Zustand Store** (`app-store.ts`) — Global state for safety mode, theme, sidebar, command bar, onboarding, glasses connection, quiet hours. Persisted to localStorage.
2. **Mock Data** (`data/mock.ts`) — Rich demo data for inbox items, approvals, timeline entries, connections, devices, conversations, settings, and stats.
3. **React Query** — Configured and ready for real API integration when a backend is connected.

### Safety Mode System

| Mode | Behavior |
|------|----------|
| 🔒 **Read Only** | Can read and summarize. Cannot send or change anything. |
| 📝 **Draft First** | Drafts all actions for review. Nothing executes without explicit approval. |
| ⚡ **Assisted** | Low-risk actions execute automatically. Sensitive actions still require approval. |

The active safety mode is visible in the sidebar, top bar, dashboard banner, and settings page.

## Project Structure

```
src/
├── App.tsx                    # Router config with all routes
├── main.tsx                   # React entry point
├── index.css                  # Tailwind config, theme variables, animations
│
├── layouts/
│   ├── SiteLayout.tsx         # Marketing header + footer + theme toggle
│   └── AppLayout.tsx          # App sidebar + top bar + command bar
│
├── pages/
│   ├── site/
│   │   ├── Home.tsx           # Landing page
│   │   ├── HowItWorks.tsx     # Product explainer
│   │   ├── GlassesExperience.tsx  # Glasses demo page
│   │   ├── Security.tsx       # Trust & safety page
│   │   ├── Pricing.tsx        # Pricing tiers + comparison
│   │   ├── Docs.tsx           # Documentation hub
│   │   ├── SignIn.tsx         # Auth + onboarding wizard
│   │   └── NotFound.tsx       # 404 page
│   │
│   └── app/
│       ├── DashboardPage.tsx  # Overview with stats & quick actions
│       ├── InboxPage.tsx      # Smart inbox
│       ├── AskPage.tsx        # AI chat interface
│       ├── ApprovalsPage.tsx  # Action approval queue
│       ├── TimelinePage.tsx   # Action history & receipts
│       ├── ConnectionsPage.tsx # Integration management
│       ├── DevicesPage.tsx    # Device & glasses management
│       └── SettingsPage.tsx   # User preferences
│
├── components/
│   ├── ui/                    # shadcn/ui primitives (19 components)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── command.tsx
│   │   └── ...
│   │
│   └── shared/                # Product-specific components
│       ├── ApprovalModal.tsx   # Full approval review dialog
│       ├── AssistantCard.tsx   # Reusable result card
│       ├── CommandBar.tsx      # ⌘K command palette
│       ├── GlassesSimulator.tsx # Interactive lens demo
│       ├── ReceiptCard.tsx     # Expandable action receipt
│       └── SafetyModeIndicator.tsx # Mode badge with tooltip
│
├── stores/
│   └── app-store.ts           # Zustand global state
│
├── data/
│   └── mock.ts                # Demo data for all features
│
├── types/
│   └── index.ts               # Full TypeScript type system
│
├── hooks/                     # Custom hooks (extensible)
│
└── lib/
    └── utils.ts               # cn() utility for class merging
```

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 7](https://vite.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Components** | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Routing** | [React Router 7](https://reactrouter.com/) |
| **State** | [Zustand 5](https://zustand.docs.pmnd.rs/) |
| **Data Fetching** | [TanStack React Query 5](https://tanstack.com/query) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Toasts** | [Sonner 2](https://sonner.emilkowal.dev/) |
| **Animations** | [tw-animate-css](https://github.com/nicepkg/tw-animate-css) + custom keyframes |

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start Vite dev server with HMR |
| `bun run build` | Type-check + production build |
| `bun run preview` | Preview production build locally |
| `bun run lint` | Run ESLint |

### Adding a New App Page

1. Create the page component in `src/pages/app/`
2. Add a route in `src/App.tsx` under the `app` layout
3. Add a nav item in `src/layouts/AppLayout.tsx`
4. Add a command bar entry in `src/components/shared/CommandBar.tsx`
5. Define types in `src/types/index.ts` and mock data in `src/data/mock.ts`

### Adding a shadcn/ui Component

```bash
npx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/`.

### Theme Customization

Theme variables are defined in `src/index.css` using CSS custom properties with OKLCH color space. Both light and dark themes are fully configured. The theme is controlled via Zustand store and persisted to localStorage.

## Design Principles

1. **Safety First** — Every destructive or high-risk action requires explicit approval. Safety mode is always visible.
2. **Receipts for Everything** — Every action has a logged receipt with what, where, when, data used, and undo status.
3. **Glanceable** — Information is designed to be consumed in under 5 seconds, whether on glasses or web.
4. **Progressive Disclosure** — Start with summaries, expand for details. Compact by default, rich on demand.
5. **Keyboard Friendly** — Command bar (`⌘K`), keyboard shortcuts, and focus management throughout.

## Browser Support

- Chrome / Edge 90+
- Firefox 90+
- Safari 15+

## License

This project is private. All rights reserved.

---

<p align="center">
  Built for <strong>people on the move</strong> ⚡
</p>