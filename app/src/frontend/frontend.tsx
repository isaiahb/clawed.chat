/**
 * Frontend Entry Point
 *
 * Provider stack (outermost → innermost):
 *   ClerkProvider → ConvexProviderWithClerk → MentraAuthProvider → App
 *
 * Clerk handles user identity (Google OAuth).
 * Convex gets auth tokens from Clerk automatically via ConvexProviderWithClerk.
 * MentraAuth handles glasses hardware session linking.
 */

import {StrictMode} from "react"
import {createRoot} from "react-dom/client"
import {ClerkProvider, useAuth} from "@clerk/clerk-react"
import {ConvexProviderWithClerk} from "convex/react-clerk"
import {ConvexReactClient} from "convex/react"
import {MentraAuthProvider} from "@mentra/react"

import "./index.css"

import App from "./App"

const CLERK_PUBLISHABLE_KEY = process.env.BUN_PUBLIC_CLERK_PUBLISHABLE_KEY
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing BUN_PUBLIC_CLERK_PUBLISHABLE_KEY in env")
}

const CONVEX_URL = process.env.BUN_PUBLIC_CONVEX_URL
if (!CONVEX_URL) {
  throw new Error("Missing BUN_PUBLIC_CONVEX_URL in env")
}

const convex = new ConvexReactClient(CONVEX_URL)

const elem = document.getElementById("root")!

const app = (
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <MentraAuthProvider>
          <App />
        </MentraAuthProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
)

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem))
  root.render(app)
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app)
}
