# Clawed Connector — run the glasses demo

Bridges your **local OpenClaw** to the **Clawed miniapp** on your Mentra glasses,
via the public relay. Three processes (three terminals), same Mac:

```
glasses miniapp ──relay──► clawed.chat ──relay──► connector ──► local OpenClaw (Kimi)
```

## 1. OpenClaw gateway (your agent, on Nebius/Kimi)

```bash
cd ~/Documents/BallahTech2/clawed.chat
env -u OPENCLAW_GATEWAY_URL \
  NEBIUS_API_KEY="$(grep '^NEBIUS_API_KEY=' app/.env | cut -d= -f2-)" \
  openclaw gateway --auth token --allow-unconfigured --force
```

## 2. The connector (bridge)

```bash
cd ~/Documents/BallahTech2/clawed.chat
CLAWED_PAIR=clawed-demo node clawed-connector/connector.mjs
```
Reads keys from `app/.env`. Pair code must match the miniapp (default `clawed-demo`).

For the demo tool path, create `clawed-connector/.env` from
`clawed-connector/.env.example` and set:

```bash
CLAWED_DEMO_CONTACT_ARIAN=arian@company.com
CLAWED_DEMO_EMAIL_DRY_RUN=0
```

Then this exact glasses command is handled locally before falling back to
OpenClaw:

```text
Hey Claude, search the web for information on the Buildershare Packathon and email it to Arian.
```

The bridge normalizes "Buildershare Packathon" to "Buildership Hackathon", runs
Tavily, writes a short sourced brief, and sends it with Composio
`GMAIL_SEND_EMAIL`. If Composio auth is unavailable, it tries the local macOS
`mail` command as a fallback.

## 3. The miniapp (serve + QR)

```bash
cd ~/Documents/BallahTech2/clawed.chat/glasses-miniapp
bun run dev      # prints a QR
```
On your phone (same Wi-Fi): **Mentra app → Settings → Developer settings →
Mini App Development → Scan Mini App QR Code**. Open Clawed → **Pair** screen →
code `clawed-demo` → **Pair & connect**.

## Use it

- **Press the glasses button** → talk → **press again** → your words go to OpenClaw → it answers, **spoken back** + on the lens.
- Tap **👀** (or the agent requests a photo) → camera frame → Nebius vision → the agent answers about what you see.

## Env (from app/.env, overridable)

`CLAWED_PAIR` · `OPENCLAW_GATEWAY_TOKEN` · `CLAWED_RELAY` (default `wss://api.clawed.chat/api/relay`) · `LOCAL_GATEWAY` (default `ws://127.0.0.1:18789`) · `NEBIUS_API_KEY` · `NEBIUS_VISION_MODEL` · `TAVILY_API_KEY` · `COMPOSIO_API_KEY` · `CLAWED_DEMO_CONTACT_ARIAN`
