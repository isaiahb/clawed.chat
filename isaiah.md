# Isaiah's Setup Checklist

> Priority order: **CLI-authable items first** (auth it → agent takes over) then browser-only items.
>
> ✅ = done, ⏳ = in progress, ❌ = not started

---

## How This List Works

Items are ordered by **how much they unblock agents**:

1. 🔑 **CLI auth items** — you auth once, then agents do the rest. DO THESE FIRST.
2. 🌐 **Browser-only items** — no CLI, you have to do it manually. Quick though.
3. 🎯 **Nice-to-have** — do while agents are working on code.

---

## CLI Tools Status

All installed. Just need auth on a few:

```bash
# ✅ Installed + authed
# - bun 1.2+
# - ngrok 3.35.0
# - mentra CLI 1.0.3
# - gcloud 558.0.0 (authed, project created)
# - pulumi 3.224.0 (authed as isaiahb)
# - convex 1.32.0 (authed, project created, schema pushed)
```

**All CLI tools authed. Agents are fully unblocked for infra + database work.**

---

# 🔑 PART 1: CLI Auth Items (do these first, 5 min total)

## ✅ 1. Pulumi Auth — DONE

Authed as `isaiahb`.

```bash
pulumi whoami  # isaiahb
```

Still need access token for `.env`:
1. Go to [app.pulumi.com/account/tokens](https://app.pulumi.com/account/tokens)
2. Create a token
3. Save:
   ```
   PULUMI_ACCESS_TOKEN=pul-...
   ```

**Agents can now:** create stacks, set config, run `pulumi preview`, deploy infra.

---

## ✅ 2. Convex Auth — DONE

Project created and schema pushed.

- **Project:** `clawed-chat` (team: `isaiah-ballah`)
- **Deployment:** `dev:adorable-sturgeon-328`
- **Dashboard:** https://dashboard.convex.dev/d/adorable-sturgeon-328
- **CONVEX_URL:** `https://adorable-sturgeon-328.convex.cloud`
- **Schema:** pushed (users, instances, api_keys tables)
- **Functions:** deployed (users.ts, instances.ts)

When developing, keep this running in a separate terminal:
```bash
bunx convex dev
```

Save for `.env`:
```
CONVEX_URL=https://adorable-sturgeon-328.convex.cloud
```

**Agents can now:** push schema changes, write server functions, test queries.

---

# 🌐 PART 2: Browser-Only Items (no CLI, you do these manually)

## ❌ 3. Clerk (auth) — ~5 min

**Why first in this section:** gates ALL authenticated features. Nothing works without it.

1. Go to [clerk.com](https://clerk.com) → Sign up / Sign in
2. Create a new application called **"clawed.chat"**
3. Enable **Google OAuth** as the sign-in method (Google only for hackathon)
4. In the Clerk dashboard → **API Keys** → Copy:
   - `CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
   - `CLERK_SECRET_KEY` (starts with `sk_`)
5. Go to **Domains** → Add `localhost:3000` as allowed origin
6. **Webhooks** → Create endpoint:
   - URL: `https://<your-ngrok-url>/api/webhooks/clerk`
   - Events: `user.created`
   - Copy the **Signing Secret** (starts with `whsec_`)
7. Save for `.env`:
   ```
   CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

---

## ❌ 4. Browser Use (hackathon host — MUST) — ~5 min

1. Go to [browser-use.com](https://browser-use.com) → Sign up
2. **Claim hackathon credits:** Fill out the form linked from the hackathon page ($100 free)
3. Go to API Keys → Create a new key
4. Save for `.env`:
   ```
   BROWSER_USE_API_KEY=bu_...
   ```
5. Test it:
   ```bash
   curl -X POST https://api.browser-use.com/api/v1/browsers \
     -H "Authorization: Bearer bu_..." \
     -H "Content-Type: application/json" \
     -d '{"proxy_country_code": "us"}'
   ```

---

## ❌ 5. Cloudflare (DNS) — ~5 min

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Make sure `clawed.chat` is added as a zone
3. Zone → **Overview** → copy **Zone ID** (right sidebar)
4. **My Profile → API Tokens → Create Token**
   - Template: **"Edit zone DNS"**
   - Zone: Specific zone → `clawed.chat`
   - Permissions: Zone / DNS / Edit
5. Copy the token
6. Save for `.env`:
   ```
   CLOUDFLARE_ZONE_ID=<zone_id>
   CLOUDFLARE_API_TOKEN=<token>
   ```
7. Verify wildcard A record exists (or create it):
   - Type: `A`, Name: `*`, Content: `1.2.3.4` (placeholder), Proxy: OFF (grey cloud)

---

## ❌ 6. Composio (integrations — Gmail, GitHub, Calendar) — ~10 min

Composio lets agents use Gmail/GitHub/Calendar via fast API instead of slow browser automation. See Design Doc 04.

### 6a. Account + API key

1. Go to [composio.dev](https://composio.dev) → Sign up
2. Dashboard → **API Keys** → Copy your key
3. Save for `.env`:
   ```
   COMPOSIO_API_KEY=...
   ```

### 6b. Create Auth Configs (one-time setup)

In the Composio dashboard, create auth configs for each service:

1. **Gmail** → OAuth2 → Scopes: `gmail.readonly`, `gmail.send`, `gmail.compose`
   - Copy the auth config ID → `COMPOSIO_GMAIL_AUTH_CONFIG=ac_...`
2. **Google Calendar** → OAuth2 → Scopes: `calendar.readonly`, `calendar.events`
   - Copy → `COMPOSIO_GCAL_AUTH_CONFIG=ac_...`
3. **GitHub** → OAuth2 → Scopes: `repo`, `read:user`
   - Copy → `COMPOSIO_GITHUB_AUTH_CONFIG=ac_...`

4. **Set callback URL** in each auth config: `https://<your-ngrok-url>/api/connections/callback`

5. Save all for `.env`:
   ```
   COMPOSIO_API_KEY=...
   COMPOSIO_GMAIL_AUTH_CONFIG=ac_...
   COMPOSIO_GCAL_AUTH_CONFIG=ac_...
   COMPOSIO_GITHUB_AUTH_CONFIG=ac_...
   ```

For hackathon: Composio's default developer OAuth app works fine (shows "Composio" in consent screen).

---

## ❌ 7. Generate Encryption Secret — ~30 sec

Used to encrypt LLM API keys at rest in Convex (AES-256-GCM). See Design Doc 08.

```bash
openssl rand -hex 32
```

Save for `.env`:
```
KEY_ENCRYPTION_SECRET=<the-hex-string>
```

Also generate the cookie secret while you're at it:
```bash
openssl rand -hex 32
```
```
COOKIE_SECRET=<another-hex-string>
```

---

## ❌ 8. ngrok Static URL + Mentra App Update — ~2 min

1. Check [dashboard.ngrok.com](https://dashboard.ngrok.com/) for your static domain
2. Update the Mentra app:
   ```bash
   mentra app update com.isaiah.clawed --public-url "https://<your-static-url>"
   ```
3. Save for `.env`:
   ```
   PUBLIC_URL=https://<your-static-url>.ngrok-free.app
   ```
4. When developing, run in a separate terminal:
   ```bash
   ngrok http --url=<your-static-url> 3000
   ```

---

# 🎯 PART 3: Nice-to-Have (do while agents work)

## ❌ 10. Anthropic API Key (for demo) — ~2 min

You'll paste this in the dashboard during the demo (BYOK model).

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Have it handy for demo day — does NOT go in `.env`

---

## ❌ 11. Sponsor Credits to Claim — ~15 min

Check the boxes for judges. Sign up even if we don't integrate all of them:

| Sponsor | URL | Credits | Priority |
|---------|-----|---------|----------|
| Browser Use | browser-use.com (hackathon form) | $100 | **Done in step 4** |
| Composio | composio.dev | Free | **Done in step 6** |
| Laminar | laminar.run | $150 | SHOULD — agent observability |
| AgentMail | agentmail.dev | Free dev plan | SHOULD |
| Supermemory | supermemory.com | $100 | SHOULD |
| Google DeepMind | (hackathon form) | $20 | NICE |
| OpenAI | (hackathon form) | Credits | NICE |
| Minimax | (hackathon form) | $30 | NICE |
| HUD | hud.ai | $200 | NICE |

---

# ✅ Already Done

## ✅ Bun (local toolchain)

Installed and working.

---

## ✅ MentraOS App

Created via `mentra` CLI:

- **Package name:** `com.isaiah.clawed`
- **App name:** Clawed Chat
- **Org:** Isaiah (`6837a2889e30d977f1b8cb35`)
- **Permissions:** MICROPHONE, CAMERA
- **Public URL:** https://clawed.chat (update to ngrok URL for dev)
- **API Key:** `a6ed85a71b0d442b4d96396f86e8bb58843725d6c6dd3c2b0716f1abf943b1dd`

---

## ✅ ngrok

Installed and authed. Config at `~/Library/Application Support/ngrok/ngrok.yml`.

---

## ✅ GCP (VM provisioning)

All set up via `gcloud` CLI:

- **Project ID:** `clawed-chat`
- **Project Number:** `917234576075`
- **Billing:** linked to `016120-888B2D-47F90B`
- **APIs Enabled:** Compute Engine, Cloud Resource Manager
- **Service Account:** `pulumi-provisioner@clawed-chat.iam.gserviceaccount.com`
  - Roles: `roles/compute.admin`, `roles/iam.serviceAccountUser`
  - Key: `~/.config/gcloud/clawed-chat-sa-key.json`
- **Firewall Rule:** `allow-openclaw` → tcp:18789,80,443 → tag `openclaw-instance`

### Pre-baked VM image — ❌ not done yet

An agent can build this now that GCP is set up. See `scripts/bake-image/README.md`.
Image should use **Ubuntu 24.04 LTS** + **Docker** + OpenClaw container (not native install).

---

# Complete `.env` File

After all the above, your `app/.env` should look like:

```bash
# ─── MentraOS ────────────────────────────────────────────────────────────────
PACKAGE_NAME=com.isaiah.clawed
MENTRAOS_API_KEY=a6ed85a71b0d442b4d96396f86e8bb58843725d6c6dd3c2b0716f1abf943b1dd

# ─── Server ──────────────────────────────────────────────────────────────────
PORT=3000
PUBLIC_URL=https://your-url.ngrok-free.app
COOKIE_SECRET=                    # openssl rand -hex 32

# ─── Auth (Clerk) ────────────────────────────────────────────────────────────
CLERK_PUBLISHABLE_KEY=pk_
CLERK_SECRET_KEY=sk_
CLERK_WEBHOOK_SECRET=whsec_

# ─── Database (Convex) ───────────────────────────────────────────────────────
CONVEX_URL=https://adorable-sturgeon-328.convex.cloud

# ─── Browser Use ─────────────────────────────────────────────────────────────
BROWSER_USE_API_KEY=bu_

# ─── GCP ─────────────────────────────────────────────────────────────────────
GCP_PROJECT=clawed-chat
GCP_ZONE=us-west1-a
GOOGLE_APPLICATION_CREDENTIALS=/Users/isaiah/.config/gcloud/clawed-chat-sa-key.json

# ─── Cloudflare ──────────────────────────────────────────────────────────────
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=

# ─── Pulumi ──────────────────────────────────────────────────────────────────
PULUMI_ACCESS_TOKEN=pul-

# ─── Composio (integrations) ─────────────────────────────────────────────────
COMPOSIO_API_KEY=
COMPOSIO_GMAIL_AUTH_CONFIG=ac_
COMPOSIO_GCAL_AUTH_CONFIG=ac_
COMPOSIO_GITHUB_AUTH_CONFIG=ac_

# ─── Encryption ──────────────────────────────────────────────────────────────
KEY_ENCRYPTION_SECRET=            # openssl rand -hex 32

# ─── TTS ─────────────────────────────────────────────────────────────────────
# NOT NEEDED — MentraOS has built-in TTS via appSession.audio.speak()
# ElevenLabs is handled by the MentraOS runtime, not our app.
```

---

# Quick Status Check

- [x] `bun --version` → 1.2+
- [x] MentraOS app created: `com.isaiah.clawed` (MICROPHONE + CAMERA)
- [x] ngrok installed and authed
- [x] gcloud installed, authed, project `clawed-chat` created
- [x] GCP: billing, APIs, service account, key, firewall rule — all done
- [x] pulumi CLI installed (v3.224.0)
- [x] convex CLI installed (v1.32.0), authed, project created
- [x] SA key moved to `~/.config/gcloud/`
- [x] `pulumi whoami` → `isaiahb`
- [x] `bunx convex dev` → project `clawed-chat` created, schema pushed, functions deployed
- [ ] Clerk app created with Google OAuth + webhook
- [ ] Browser Use API key obtained + tested
- [ ] Cloudflare zone ID + API token
- [ ] Composio API key + 3 auth configs (Gmail, Calendar, GitHub)
- [ ] `KEY_ENCRYPTION_SECRET` generated
- [ ] `COOKIE_SECRET` generated
- [ ] ngrok static URL set + Mentra app updated
- [ ] Anthropic API key ready for demo day