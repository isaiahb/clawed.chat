# web/ — clawed.chat Landing Page

> Marketing site at clawed.chat. Deployed to Cloudflare Pages. Separate from the app.

## What This Is

A standalone landing page that:

1. Explains what clawed.chat does (one-click OpenClaw deployment)
2. Shows features (cloud deploy, smart glasses, stealth browsing, auto sleep/wake)
3. Has a "Get Started" CTA → redirects to the app dashboard (Clerk sign-in)
4. SEO-optimized, fast, static

## Why It's Separate

- **Different deploy target:** Cloudflare Pages (static) vs the app (Bun server on GCP)
- **Different dev cycle:** designer can iterate on marketing copy without touching the product
- **Different performance profile:** static HTML, no JS framework needed (or minimal)

## Planned Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | TBD — could be plain HTML, Astro, or Bun static site | Keep it simple |
| Styling | Tailwind CSS | Consistent with app |
| Deploy | Cloudflare Pages | Free, fast, global CDN |
| Domain | clawed.chat (root) | App lives at clawed.chat/dashboard or app.clawed.chat |

## Priority

**Low for hackathon.** The app dashboard IS the demo. A simple landing page with hero + CTA is enough. Polish later.

## Structure (planned)

```
web/
├── package.json
├── README.md
├── src/
│   ├── index.html        ← landing page
│   ├── styles.css         ← Tailwind
│   └── assets/            ← images, icons
└── wrangler.toml          ← Cloudflare Pages config (if needed)
```

## Running

```bash
# from repo root
bun run dev:web

# or from this directory
bun run dev
```

## Style

- No semicolons, double quotes, trailing commas, `{thing}` not `{ thing }`
