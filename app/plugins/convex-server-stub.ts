/**
 * Bun plugin to stub out `convex/server` for the frontend HTML bundler.
 *
 * The Convex generated file `convex/_generated/api.js` imports from
 * `convex/server`. That module is server-only and Bun's HTML bundler
 * tries to resolve it from the `.bun/` hoisted cache, which fails with
 * "Unseekable reading file" on macOS.
 *
 * This plugin intercepts the import and returns a stub that re-exports
 * only the symbols the generated code and the Convex React client
 * actually use at runtime.
 *
 * The critical piece is `anyApi` — a recursive Proxy that builds
 * dot-separated function references using `Symbol.for("functionName")`
 * as the key. This mirrors the real Convex `createApi()` implementation
 * in `convex/dist/esm/server/api.js`.
 *
 * When you write `api.instances.listByUser`, the proxy accumulates
 * path parts `["instances", "listByUser"]`. When the Convex client
 * accesses `Symbol.for("functionName")` on it, it returns
 * `"instances:listByUser"` — exactly like the real implementation.
 */
import type { BunPlugin } from "bun";

const STUB = `
// Stubbed convex/server for frontend bundle
// Mirrors the real createApi() from convex/dist/esm/server/api.js

const functionName = Symbol.for("functionName");
const toReferencePath = Symbol.for("toReferencePath");

function isFunctionHandle(s) {
  return typeof s === "string" && s.startsWith("function://");
}

function getFunctionAddress(functionReference) {
  if (typeof functionReference === "string") {
    if (isFunctionHandle(functionReference)) {
      return { functionHandle: functionReference };
    }
    return { name: functionReference };
  }
  if (functionReference[functionName]) {
    return { name: functionReference[functionName] };
  }
  const referencePath = functionReference[toReferencePath] ?? null;
  if (!referencePath) {
    throw new Error(String(functionReference) + " is not a functionReference");
  }
  return { reference: referencePath };
}

export function getFunctionName(functionReference) {
  const address = getFunctionAddress(functionReference);
  if (address.name === undefined) {
    if (address.functionHandle !== undefined) {
      throw new Error(
        "Expected function reference like \\"api.file.func\\", but received function handle " + address.functionHandle
      );
    }
    if (address.reference !== undefined) {
      throw new Error(
        "Expected function reference in the current component, but received reference " + address.reference
      );
    }
    throw new Error(
      "Expected function reference like \\"api.file.func\\", but received " + JSON.stringify(address)
    );
  }
  if (typeof functionReference === "string") return functionReference;
  const name = functionReference[functionName];
  if (!name) {
    throw new Error(String(functionReference) + " is not a functionReference");
  }
  return name;
}

export function makeFunctionReference(name) {
  return { [functionName]: name };
}

function createApi(pathParts) {
  if (!pathParts) pathParts = [];
  const handler = {
    get(_, prop) {
      if (typeof prop === "string") {
        return createApi([...pathParts, prop]);
      }
      if (prop === functionName) {
        if (pathParts.length < 2) {
          const found = ["api", ...pathParts].join(".");
          throw new Error(
            "API path is expected to be of the form \`api.moduleName.functionName\`. Found: \`" + found + "\`"
          );
        }
        const path = pathParts.slice(0, -1).join("/");
        const exportName = pathParts[pathParts.length - 1];
        if (exportName === "default") {
          return path;
        }
        return path + ":" + exportName;
      }
      if (prop === Symbol.toStringTag) {
        return "FunctionReference";
      }
      return undefined;
    }
  };
  return new Proxy({}, handler);
}

export const anyApi = createApi();

export function componentsGeneric() { return {}; }
export function filterApi(api) { return api; }
export function justInternal(api) { return api; }
export function justPublic(api) { return api; }
export function justQueries(api) { return api; }
export function justMutations(api) { return api; }
export function justActions(api) { return api; }
export function justPaginatedQueries(api) { return api; }
export function justSchedulable(api) { return api; }

// Re-export functionName symbol for anything that needs it
export { functionName };
`;

const convexServerStubPlugin: BunPlugin = {
  name: "convex-server-stub",
  setup(build) {
    // Stub `convex/server` — only the re-exports used by _generated/api.js
    // and the Convex React client at runtime
    build.onResolve({ filter: /^convex\/server$/ }, () => {
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
