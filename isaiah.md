# Isaiah's Setup Checklist

> Things only you can do — API keys, accounts, third-party config.
> Check each off as you go. Order matters for some (marked with ⚠️).
>
> ✅ = done, ⏳ = in progress, ❌ = not started

---

## CLI Tools to Install

Claude can help with anything that has a CLI. Install these so agents can do the heavy lifting:

```bash
# Already installed ✅
# - bun
# - ngrok 3.35.0 (authed)
# - mentra CLI 1.0.3 (authed)
# - gcloud 558.0.0 (installed, needs auth)
# - pulumi 3.224.0 (installed, needs auth)
# - convex 1.32.0 (installed, needs auth)

# Just auth these — they're already installed:
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>
pulumi login

# Optional:
brew install cloudflare/cloudflare/cloudflared  # wrangler alternative for tunnels
```

Once these are authed, spin up agents and they can handle most of the infra setup for you.

---

## ✅ 1. Bun (local toolchain)

Already installed.

```bash
bun upgrade
bun --version  # should be 1.2+
```

---

## ✅ 2. MentraOS Developer Account + App Registration

**DONE — created via `mentra` CLI.**

- **Package name:** `com.isaiah.clawed`
- **App name:** Clawed Chat
- **Org:** Isaiah (`6837a2889e30d977f1b8cb35`)
- **Permissions:** MICROPHONE, CAMERA
- **Public URL:** https://clawed.chat (update to ngrok URL for dev)
- **API Key:** `a6ed85a71b0d442b4d96396f86e8bb58843725d6c6dd3c2b0716f1abf943b1dd`

Save these values in `.env`:
```
PACKAGE_NAME=com.isaiah.clawed
MENTRAOS_API_KEY=a6ed85a71b0d442b4d96396f86e8bb58843725d6c6dd3c2b0716f1abf943b1dd
```

To update the public URL to ngrok later:
```bash
mentra app update com.isaiah.clawed --public-url "https://<your-ngrok-url>"
```

---

## ✅ 3. ngrok (expose local dev to MentraOS + Clerk)

**DONE — ngrok installed and authed.**

Already configured at `~/Library/Application Support/ngrok/ngrok.yml`.

⏳ **Still need:** your static domain URL. Check [dashboard.ngrok.com](https://dashboard.ngrok.com/) for your static domain, then:

```bash
# When developing, run in a separate terminal:
ngrok http --url=<your-static-url> 3000

# Then update the Mentra app's public URL:
mentra app update com.isaiah.clawed --public-url "https://<your-static-url>"
```

Save for `.env`:
```
PUBLIC_URL=https://<your-static-url>.ngrok-free.app
```

---

## ❌ 4. Clerk (auth) — ~5 min

1. Go to [clerk.com](https://clerk.com) → Sign up / Sign in
2. Create a new application called **"clawed.chat"**
3. Enable **Google OAuth** as a sign-in method (this is the primary auth for the hackathon)
4. In the Clerk dashboard, go to **API Keys**
5. Copy:
   - `CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
   - `CLERK_SECRET_KEY` (starts with `sk_`)
6. Go to **Domains** → Add `clawed.chat` and `localhost:3000` as allowed origins
7. Save for `.env`:
   ```
   CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   ```

---

## ❌ 5. Convex (database) — ~5 min

⚠️ Do this before running `bun run dev` — the app needs `CONVEX_URL`.

1. Go to [convex.dev](https://convex.dev) → Sign up / Sign in
2. Install the CLI:
   ```bash
   bun add -g convex
   ```
3. From the **project root** (not `app/`), run:
   ```bash
   bunx convex dev
   ```
   - This will prompt you to create a new project — name it **"clawed-chat"**
   - It will generate `convex/_generated/` (gitignored)
   - It will give you a deployment URL
4. Copy the URL for `.env`:
   ```
   CONVEX_URL=https://your-project-123.convex.cloud
   ```
5. Keep `bunx convex dev` running in a separate terminal during development — it syncs schema changes live

✅ **Convex CLI installed** (v1.32.0). Just needs first run to create the project.

---

## ❌ 6. Browser Use (hackathon host — MUST integrate) — ~5 min

1. Go to [browser-use.com](https://browser-use.com) → Sign up
2. **Claim hackathon credits:** Fill out the form linked from the hackathon page ($100 free credits)
3. Go to API Keys → Create a new key
4. Save for `.env`:
   ```
   BROWSER_USE_API_KEY=bu_...
   ```
5. Test it works:
   ```bash
   curl -X POST https://api.browser-use.com/api/v1/browsers \
     -H "Authorization: Bearer bu_..." \
     -H "Content-Type: application/json" \
     -d '{"proxy_country_code": "us"}'
   ```
   You should get back `{ "browser_id": "...", "cdp_url": "wss://...", "live_url": "https://..." }`

---

## ✅ 7. GCP (VM provisioning) — DONE

**All set up via `gcloud` CLI.**

- **Project ID:** `clawed-chat`
- **Project Number:** `917234576075`
- **Billing:** linked to `016120-888B2D-47F90B` (My Billing Account 4)
- **APIs Enabled:** Compute Engine, Cloud Resource Manager
- **Service Account:** `pulumi-provisioner@clawed-chat.iam.gserviceaccount.com`
  - Roles: `roles/compute.admin`, `roles/iam.serviceAccountUser`
  - Key: `/tmp/clawed-chat-sa-key.json` ⚠️ **move this somewhere safe!**
    ```bash
    mkdir -p ~/.config/gcloud
    mv /tmp/clawed-chat-sa-key.json ~/.config/gcloud/clawed-chat-sa-key.json
    ```
- **Firewall Rule:** `allow-openclaw` → tcp:18789,80,443 → tag `openclaw-instance`

Save for `.env`:
```
GCP_PROJECT=clawed-chat
GCP_ZONE=us-west1-a
GOOGLE_APPLICATION_CREDENTIALS=/Users/isaiah/.config/gcloud/clawed-chat-sa-key.json
```

### 7d. Pre-baked VM image (hackathon day task) — ❌ not done yet

This is the image every user VM boots from. Script will be in `scripts/bake-image/`. An agent can build this now that GCP is set up.

---

## ⏳ 8. Cloudflare (DNS for *.clawed.chat) — ~5 min

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Make sure `clawed.chat` is added as a zone (you probably already have this)
3. Go to the zone → **Overview** → note your **Zone ID** (right sidebar)
4. Go to **My Profile → API Tokens → Create Token**
5. Use the **"Edit zone DNS"** template:
   - Zone Resources: Include → Specific zone → `clawed.chat`
   - Permissions: Zone / DNS / Edit
6. Copy the token
7. Save for `.env`:
   ```
   CLOUDFLARE_ZONE_ID=<zone_id>
   CLOUDFLARE_API_TOKEN=<token>
   ```
8. Verify the wildcard record exists (or create it):
   - Type: `A`
   - Name: `*`
   - Content: `1.2.3.4` (placeholder — Pulumi will create per-user records that override this)
   - Proxy: OFF (DNS only — grey cloud). OpenClaw uses WebSockets, Cloudflare proxy can interfere.

---

## ⏳ 9. Pulumi (infrastructure as code) — ~5 min

⚠️ Do this after GCP is set up.
✅ **Pulumi CLI installed** (v3.224.0). Just need to auth:

1. Go to [app.pulumi.com](https://app.pulumi.com) → Sign up (GitHub OAuth is easiest)
2. Create an organization or use your personal account
3. ~~Install the CLI~~ ✅ already installed
4. Login:
   ```bash
   pulumi login
   ```
5. Get your access token from [app.pulumi.com/account/tokens](https://app.pulumi.com/account/tokens)
6. Save for `.env`:
   ```
   PULUMI_ACCESS_TOKEN=pul-...
   ```
7. You do NOT need to run `pulumi new` — the Automation API in our code creates stacks programmatically

**Once the CLI is authed, agents can create stacks, set config, and run `pulumi preview`.**

---

## ❌ 10. Anthropic API Key (for demo) — ~2 min

You'll need at least one LLM key to demo OpenClaw. Anthropic (Claude) is the recommended model.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. This is a **user-provided key** (BYOK model) — you'll paste it in the dashboard during the demo
4. Have it handy, but it does NOT go in `.env` (users bring their own)

---

## ❌ 11. Sponsor Credits to Claim — ~15 min (do while agents work)

These are optional but check the boxes for judges:

| Sponsor | URL | Credits | Priority |
|---------|-----|---------|----------|
| Browser Use | browser-use.com (hackathon form) | $100 | **Done above** |
| Laminar | laminar.run | $150 | SHOULD — claim now, integrate later |
| AgentMail | agentmail.dev | Free dev plan | SHOULD |
| Supermemory | supermemory.com | $100 | SHOULD |
| Google DeepMind | (hackathon form) | $20 | NICE |
| OpenAI | (hackathon form) | Credits | NICE |
| Minimax | (hackathon form) | $30 | NICE |
| HUD | hud.ai | $200 | NICE |

Sign up for all of them now even if we don't integrate them all. Having accounts ready = zero friction later.

---

## 12. Final `.env` File

After all the above, your `app/.env` should look like:

```bash
# MentraOS
PACKAGE_NAME=com.isaiah.clawed
MENTRAOS_API_KEY=a6ed85a71b0d442b4d96396f86e8bb58843725d6c6dd3c2b0716f1abf943b1dd

# Server
PORT=3000
PUBLIC_URL=https://your-url.ngrok-free.app
COOKIE_SECRET=  # generate: openssl rand -hex 32

# Clerk
CLERK_PUBLISHABLE_KEY=pk_
CLERK_SECRET_KEY=sk_

# Convex
CONVEX_URL=https://your-project.convex.cloud

# Browser Use
BROWSER_USE_API_KEY=bu_

# GCP
GCP_PROJECT=clawed-chat
GCP_ZONE=us-west1-a
GOOGLE_APPLICATION_CREDENTIALS=/Users/isaiah/.config/gcloud/clawed-chat-sa-key.json

# Cloudflare
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=

# Pulumi
PULUMI_ACCESS_TOKEN=pul-
```

Generate your cookie secret:
```bash
openssl rand -hex 32
```

---

## Quick Status Check

Once everything is set up, you should be able to:

- [x] `bun --version` → 1.2+
- [x] MentraOS app created: `com.isaiah.clawed` (MICROPHONE + CAMERA)
- [x] ngrok installed and authed
- [x] `gcloud version` → 558.0.0 installed
- [x] `pulumi version` → 3.224.0 installed
- [x] `convex --version` → 1.32.0 installed
- [x] GCP project `clawed-chat` created, billing linked, APIs enabled
- [x] GCP service account + key + firewall rule created
- [ ] ⚠️ Move SA key: `mv /tmp/clawed-chat-sa-key.json ~/.config/gcloud/`
- [ ] ngrok static URL set + Mentra app public URL updated
- [ ] Clerk dashboard shows app with Google OAuth enabled
- [ ] `bunx convex dev` → connects to your Convex project
- [ ] `curl` to Browser Use API → returns a browser session
- [ ] Cloudflare zone has `clawed.chat` with Zone ID noted
- [ ] `pulumi login` → `pulumi whoami` shows your account
- [ ] Anthropic API key ready for demo day