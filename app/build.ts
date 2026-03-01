/**
 * Production Build Script
 *
 * Builds the frontend HTML entry to dist/ for static hosting or CDN.
 * Matches the official Bun template pattern:
 *   bun build ./src/frontend/index.html --outdir=dist --target=browser --minify
 *
 * The prod server does NOT use dist/ — it uses development: false which does
 * lazy runtime bundling with caching + minification. This build is for
 * static hosting (CDN, nginx, etc.) if needed.
 *
 * Usage:
 *   bun run build        # build frontend to dist/
 *   bun run start        # prod server (runtime bundling, no HMR)
 *   bun dev              # dev server (HMR)
 */

import tailwind from "bun-plugin-tailwind"
import reactDedupe from "./plugins/react-dedupe"
import { rmSync } from "node:fs"

const start = performance.now()

// Clean previous build
try { rmSync("./dist", { recursive: true, force: true }) } catch {}

console.log("[build] Building frontend...")

const result = await Bun.build({
  entrypoints: ["./src/frontend/index.html"],
  outdir: "./dist",
  target: "browser",
  minify: true,
  sourcemap: "linked",
  env: "BUN_PUBLIC_*",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [tailwind, reactDedupe],
})

if (!result.success) {
  console.error("[build] Build failed:")
  for (const log of result.logs) {
    console.error(" ", log)
  }
  process.exit(1)
}

const elapsed = (performance.now() - start).toFixed(0)
const outputs = result.outputs.map((o) => ({
  path: o.path.replace(process.cwd() + "/", ""),
  size: (o.size / 1024).toFixed(1) + " KB",
  kind: o.kind,
}))

console.log(`[build] Done in ${elapsed}ms`)
for (const o of outputs) {
  console.log(`  ${o.kind.padEnd(10)} ${o.size.padStart(10)}  ${o.path}`)
}
