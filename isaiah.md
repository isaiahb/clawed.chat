# Isaiah's Setup Checklist

> Things only you can do — API keys, accounts, third-party config. Claude can't do any of this.
> Check each off as you go. Order matters for some (marked with ⚠️).

---

## 1. Bun (local toolchain)

You probably have this already, but make sure you're on latest:

```bash
bun upgrade
bun --version  # should be 1.2+
```

---

## 2. MentraOS Developer Account + App Registration

This is needed before the app can talk to glasses.

1. Go to [console.mentra.glass](https://console.mentra.glass/)
2. Sign in with the same account you use on MentraOS
3. Click **"Create App"**
4. Set package name: `chat.clawed.app` (or whatever you want — just note it)
5. For "Public URL", enter your ngrok static URL (see step 3 below) or leave blank for now
6. **Add permissions:** microphone, camera (we need transcription + photos)
7. Copy your **API Key** from the app detail page
8. Save these values — they go in `.env`:
   ```
   PACKAGE_NAME=chat.clawed.app
   MENTRAOS_API_KEY=<your_api_key>
   ```

---

## 3. ngrok (expose local dev to MentraOS + Clerk)

MentraOS needs a public URL to reach your local server.

```bash
brew install ngrok
```

1. Create an account at [ngrok.com](https://ngrok.com)
2. Create a **static domain** at [dashboard.ngrok.com](https://dashboard.ngrok.com/) (free tier gets one)
3. Auth your CLI:
   ```bash
   ngrok config add-authtoken <your_token>
   ```
4. When developing, run:
   ```bash
   ngrok http --url=<your-static-url> 3000
   ```
5. Go back to MentraOS console and set your app's Public URL to this ngrok URL
6. Save for `.env`:
   ```
   PUBLIC_URL=https://<your-static-url>.ngrok-free.app
   ```

---

## 4. Clerk (auth)

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

## 5. Convex (database)

⚠️ Do this before running `bun run dev` — the app needs `CONVEX_URL`.

1. Go to [convex.dev](https://convex.dev) → Sign up / Sign in
2. Install the CLI (already in `package.json` devDeps, but just in case):
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

---

## 6. Browser Use (hackathon host — MUST integrate)

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

## 7. GCP (VM provisioning)

⚠️ This is the most involved setup. Do it when you have 30+ minutes.

### 7a. Project setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project: **"clawed-chat"**
3. Note the **Project ID** (not the display name — the slug like `clawed-chat-123456`)
4. Enable these APIs (search in the API Library):
   - **Compute Engine API**
   - **Cloud Resource Manager API**
5. Wait for Compute Engine to finish initializing (takes ~60 seconds on first enable)

### 7b. Service account for Pulumi

1. Go to **IAM & Admin → Service Accounts**
2. Create a service account:
   - Name: `pulumi-provisioner`
   - Description: "Provisions per-user VMs and manages lifecycle"
3. Grant these roles:
   - `Compute Admin` (roles/compute.admin)
   - `Service Account User` (roles/iam.serviceAccountUser)
4. Click into the service account → **Keys** tab → **Add Key** → **Create new key** → JSON
5. Download the JSON key file
6. Save for `.env`:
   ```
   GCP_PROJECT=clawed-chat-123456
   GCP_ZONE=us-west1-a
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
   ```
   Or alternatively, base64-encode the key:
   ```bash
   cat service-account-key.json | base64 | tr -d '\n'
   ```
   ```
   GCP_CREDENTIALS_BASE64=<base64_string>
   ```

### 7c. Firewall rule (allow traffic to OpenClaw instances)

```bash
gcloud config set project clawed-chat-123456

gcloud compute firewall-rules create allow-openclaw \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:18789,tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=openclaw-instance \
  --description="Allow traffic to OpenClaw gateway and web"
```

### 7d. Pre-baked VM image (hackathon day task)

This is the image every user VM boots from. Script will be in `scripts/bake-image/`. The idea:

1. Create a base VM (e2-small, Ubuntu 22.04)
2. SSH in, install: Node.js 22, OpenClaw, configure defaults
3. Stop the VM
4. Create an image from its disk:
   ```bash
   gcloud compute images create clawed-chat-openclaw-v1 \
     --source-disk=openclaw-base \
     --source-disk-zone=us-west1-a \
     --family=clawed-chat
   ```
5. Delete the base VM (you only need the image)

I'll flesh out the full bake script in `scripts/bake-image/` — but you need the GCP project set up first.

---

## 8. Cloudflare (DNS for *.clawed.chat)

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

## 9. Pulumi (infrastructure as code)

⚠️ Do this after GCP is set up.

1. Go to [app.pulumi.com](https://app.pulumi.com) → Sign up (GitHub OAuth is easiest)
2. Create an organization or use your personal account
3. Install the CLI:
   ```bash
   brew install pulumi
   ```
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

---

## 10. Anthropic API Key (for demo)

You'll need at least one LLM key to demo OpenClaw. Anthropic (Claude) is the recommended model.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. This is a **user-provided key** (BYOK model) — you'll paste it in the dashboard during the demo
4. Have it handy, but it does NOT go in `.env` (users bring their own)

---

## 11. Sponsor Credits to Claim

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
PACKAGE_NAME=chat.clawed.app
MENTRAOS_API_KEY=

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
GCP_PROJECT=
GCP_ZONE=us-west1-a
GOOGLE_APPLICATION_CREDENTIALS=  # path to JSON key file

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

- [ ] `bun --version` → 1.2+
- [ ] MentraOS console shows your app with API key
- [ ] `ngrok http --url=<url> 3000` → tunnel works
- [ ] Clerk dashboard shows app with Google OAuth enabled
- [ ] `bunx convex dev` → connects to your Convex project
- [ ] `curl` to Browser Use API → returns a browser session
- [ ] `gcloud compute instances list` → no errors (GCP project works)
- [ ] Cloudflare zone has `clawed.chat` with Zone ID noted
- [ ] `pulumi whoami` → shows your account
- [ ] Anthropic API key ready for demo day