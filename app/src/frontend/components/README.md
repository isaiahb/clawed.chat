# components/ — Shared UI Components

> Reusable UI primitives and composites used across multiple pages.

## Conventions

- **Naming:** `<ComponentName>.tsx` (PascalCase)
- Default export for each component
- Co-locate component-specific types in the same file
- If a component is only used by one page, it belongs in that page's `components/` subfolder instead

## Structure

```
components/
├── ui/                   ← low-level primitives (button, card, input, badge, etc.)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── skeleton.tsx
│   └── index.ts          ← barrel export
├── InstanceStatusBadge.tsx
├── AgentAvatar.tsx
└── ...
```

## `ui/` — Primitive Components

Low-level, unstyled (or minimally styled) primitives. Built with:
- [Radix UI](https://www.radix-ui.com/) for accessible headless components
- [class-variance-authority](https://cva.style/) for variant props
- [tailwind-merge](https://github.com/dcastil/tailwind-merge) + `clsx` for class merging

These follow the shadcn/ui pattern — copy-paste, own the code, no package dependency.

## Top-Level Components

Composed from `ui/` primitives. Domain-aware (know about instances, agents, etc.) but still reusable across pages.

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
- Use `cn()` utility for conditional classes (from `ui/utils.ts`)
- Tailwind classes only — no CSS modules, no styled-components