# pages/ — Page Components

> Each page is a top-level view in the dashboard. Pages compose smaller components from `../components/`.

## Planned Pages

| Page | Route | Description |
|------|-------|-------------|
| `DashboardPage` | `/dashboard` | Main view — list of instances, deploy button, status overview |
| `InstancePage` | `/dashboard/:id` | Single instance — chat, Browser Use live view, controls |
| `DeployPage` | `/dashboard/deploy` | Deploy flow — choose LLM provider, paste API key, confirm |

## Conventions

- **Naming:** `<PageName>Page.tsx` (e.g., `DashboardPage.tsx`)
- One page per file, default export
- Pages handle data fetching (Convex queries) and pass data down to components
- Keep pages thin — layout + data, delegate rendering to components
- Sub-components specific to a page go in a `components/` subfolder next to the page

## Structure Example

```
pages/
├── dashboard/
│   ├── DashboardPage.tsx
│   └── components/
│       ├── InstanceCard.tsx
│       └── DeployButton.tsx
├── instance/
│   ├── InstancePage.tsx
│   └── components/
│       ├── ChatPanel.tsx
│       ├── BrowserView.tsx
│       └── InstanceControls.tsx
└── deploy/
    └── DeployPage.tsx
```

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
