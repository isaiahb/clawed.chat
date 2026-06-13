# clawed.chat backend — Bun + Hono server for Fly.io
# Serves /api/* (vision, judge, llm-proxy, dashboard API), the React
# dashboard (runtime-bundled), and the OpenClaw gateway WS proxy.

FROM oven/bun:1

WORKDIR /src

# Trim the monorepo to just the `app` workspace so we don't install
# electrobun (desktop) or pulumi (deploy) — neither is needed at runtime.
COPY package.json ./
RUN bun --eval "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));p.workspaces=['app'];fs.writeFileSync('package.json',JSON.stringify(p,null,2))"

# Install deps (incl. devDeps — tailwindcss is needed for runtime CSS bundling)
COPY app/package.json ./app/package.json
RUN bun install

# Source: the app workspace + the Convex generated client it imports relatively
COPY app ./app
COPY convex ./convex

WORKDIR /src/app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Prod server: development:false → cached, minified runtime bundles
CMD ["bun", "src/index.ts"]
