# web/ — clawed.chat Marketing Site (Cloudflare Pages)

> The marketing site at clawed.chat is a **static export of the app's React
> frontend** (Home, Pricing, Docs are pure client-side pages), deployed to
> Cloudflare Pages. This folder holds the deploy workflow, not the source —
> the pages live in `../app/src/frontend/pages/`.

## Deploy

```bash
# from repo root — build the static bundle
cd app && bun run build

# copy runtime assets the server normally serves at /assets/*
mkdir -p dist/assets && cp -r src/public/assets/ dist/assets/ && cp src/public/favicon.svg dist/
rm -f dist/assets/.DS_Store dist/*.js.map
printf '/* /index.html 200\n' > dist/_redirects   # SPA fallback

# deploy (wrangler OAuth; run from OUTSIDE app/ so app/.env's
# DNS-scoped CLOUDFLARE_API_TOKEN doesn't shadow your login)
cd .. && bunx wrangler pages deploy app/dist --project-name clawed-chat-web --branch prod --commit-dirty=true
```

Production: https://clawed-chat-web.pages.dev (Pages project `clawed-chat-web`,
production branch `prod`).

## Notes

- Clerk publishable key + Convex URL are baked in at build time from
  `app/.env` (`BUN_PUBLIC_*`). Marketing pages + sign-in work fully static;
  `/app/*` dashboard routes need the Bun backend.
- To point the root domain here: add `clawed.chat` as a custom domain on the
  Pages project and remove the A record pointing at the backend VM (it's
  Pulumi-managed — update `deploy/index.ts` so CI doesn't recreate it).
