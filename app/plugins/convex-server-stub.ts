/**
 * Bun plugin to stub out `convex/server` for the frontend HTML bundler.
 *
 * The Convex generated file `convex/_generated/api.js` imports `anyApi` from
 * `convex/server`. That module is server-only and not needed at runtime in the
 * browser — `anyApi` is just a Proxy that builds function references.
 *
 * Bun's HTML bundler tries to resolve and bundle `convex/server` from the
 * `.bun/` hoisted cache, which fails with "Unseekable reading file" on macOS.
 *
 * This plugin intercepts the import and returns a tiny stub that re-exports
 * only the symbols the generated code actually uses (`anyApi` and
 * `componentsGeneric`), implemented as simple Proxy objects that mirror
 * Convex's real runtime behavior in the browser.
 */
import type { BunPlugin } from "bun";

const STUB = `
// Stubbed convex/server for frontend bundle
// anyApi is a recursive Proxy that builds dot-separated function references
function makeProxy(path) {
  return new Proxy(function() {}, {
    get(_, prop) {
      if (typeof prop === "string") {
        return makeProxy(path ? path + "." + prop : prop);
      }
      return undefined;
    },
    apply() {
      return path;
    },
  });
}

export const anyApi = makeProxy("");
export function componentsGeneric() { return {}; }
export function getFunctionName(ref) { return ref; }
export function makeFunctionReference(name) { return name; }
`;

const convexServerStubPlugin: BunPlugin = {
  name: "convex-server-stub",
  setup(build) {
    // Stub `convex/server` — only the re-exports used by _generated/api.js
    build.onResolve({ filter: /^convex\/server$/ }, (args) => {
      return {
        path: "convex/server",
        namespace: "convex-server-stub",
      };
    });

    build.onLoad(
      { filter: /.*/, namespace: "convex-server-stub" },
      () => {
        return {
          contents: STUB,
          loader: "js",
        };
      }
    );
  },
};

export default convexServerStubPlugin;
