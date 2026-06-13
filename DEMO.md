# 🦞 Buildership Demo Plan — June 14, on the boat

> Every agent demo today lives in a browser tab. Ours is standing on this boat with us.

## The three moments

### Moment 1 — "What island is that?" (the opener)

Mid-pitch, look out at the water through Mentra Live: **"Hey Clawed, what am I looking at?"**

Pipeline on display: glasses camera → local miniapp → `/api/vision` → **Nebius** vision model identifies → **Tavily** pulls live facts → answer spoken in-ear (and shown on the projector via the dashboard).

*Deps: Mentra Live, miniapp installed, NEBIUS_API_KEY + TAVILY_API_KEY on backend, boat Wi-Fi.*

### Moment 2 — hand the glasses to a judge

"Don't take my word for it." Judge wears them, asks anything. The agent answers with *our* context — it knows the repo, the boat, the hackathon.

*Prep: feed the agent's memory (OpenClaw memory files) with: this repo's README, the Buildership schedule, judge/sponsor names, yacht facts.*

### Moment 3 — the agent co-pitches (the closer)

**"Clawed, anything to add?"** The agent, through the speaker:
1. A one-liner referencing something it overheard earlier in the pitch
2. *"I've already emailed each judge the repo, the demo video, and my own write-up of why we should win. Check your inbox."* → **Composio** Gmail fires live, phones buzz.

*Prep: a pre-staged agent task/cron with judge emails + draft, triggered by that exact phrase (OpenClaw instruction in its memory: "when asked 'anything to add' during the pitch, ...").*

Sponsor scorecard in one demo: **OpenClaw** (is the agent) · **Nebius** (sees + thinks) · **Tavily** (knows now) · **Composio** (acts).

## The vision (for the investor judges — 20%)

One line: **agents got a brain and hands; they're missing the infrastructure to
act as real entities — senses, identity, communication, reputation, money. We
build that layer.**

- "OpenClaw went 0→100k stars in three months — people run persistent,
  self-hosted agents already. But every one is trapped in a text box: blind,
  mute, with no identity of its own and no way to talk to other agents."
- "**Clawed is chapter one: senses.** You can put it on and talk to it today."
- "Next: agents that **own services** (email any agent can provision via API,
  with an LLM trust-gate so they can't spam) and **talk to each other** (an MCP
  bus across Claude Code, Codex, whole agent fleets)."
- "We're from **Mentra** — we build the smart-glasses OS. We made the thing we
  most wanted: our agent, on our glasses. And it's the wedge into the whole
  agent-infrastructure layer."

Full write-up: [VISION.md](VISION.md). Keep the pitch to the senses demo; the
rest is the roadmap slide, not vaporware — the senses layer is live.

## Budget reality (no credits until you win)

The whole demo stack runs for roughly **the price of lunch**, self-funded:

Verified prices (June 11, 2026 — docs.nebius.com + OpenRouter's Nebius catalog):

| Thing | Cost |
| --- | --- |
| Nebius vision: Qwen2.5-VL-72B ($0.25/$0.75 per M) | ~$0.001 per "what am I looking at?" — 1,000 queries ≈ $1 |
| Nebius text: gpt-oss-120b ($0.15/$0.60 per M) | heavy agent day ≈ $1.35 |
| Nebius VM: 2 vCPU/8GiB ($0.012/vCPU·h + $0.0032/GiB·h) | ~$1.19/day → ~$6 for the week (+~$0.60 disk) |
| Tavily | free tier (1,000 credits/mo) covers the demo many times over |
| Composio | existing free/dev tier, already wired |
| Cloudflare Pages (site) | $0 |

⚠ Kimi K2 is NOT in Nebius's served catalog — default text model is
`openai/gpt-oss-120b` (env-overridable via `NEBIUS_TEXT_MODEL`).

**$0 alternative for compute:** `./scripts/demo-local.sh` — runs the backend
on your own Mac and exposes `/api/vision` + `/api/judge` through a free
Cloudflare quick tunnel (no account needed). Maximally on-brand —
"self-hosted agent on my own hardware" IS the OpenClaw ethos — and the
laptop is on the boat anyway. Recommended split: laptop for the gateway +
a ~$6/week Nebius VM for the public endpoints, so the judge endpoint stays
up after you leave the boat.

## Pre-demo checklist

- [ ] Backend + OpenClaw live: laptop + cloudflared ($0) or small self-paid Nebius VM (see Budget reality / [deploy/NEBIUS.md](deploy/NEBIUS.md))
- [ ] `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `VISION_API_TOKEN` set on backend; vision endpoint smoke-tested with a phone photo
- [ ] Miniapp on Isaiah's phone via QR sideload; gateway URL + token configured; wake word tested outdoors (wind!)
- [ ] Agent memory loaded: repo summary, schedule, judges, yacht trivia
- [ ] Judge endpoint live + judge token in README; tested from a phone on cellular
- [ ] Composio Gmail connected on the demo agent; co-pitch email drafted + addressed
- [ ] Phone hotspot as Wi-Fi fallback (boat Starlink + 40 laptops = chaos)
- [ ] **Record every moment as video the night before** — the only unforgivable failure is having nothing to show

## Fallback matrix

| Failure | Fallback |
| --- | --- |
| Boat Wi-Fi dies | Phone hotspot (miniapp → gateway over cellular works — it's just a WebSocket) |
| Gateway VM down | Pre-recorded video of Moment 1 + live UI walkthrough on phone |
| Wake word mishears | Glasses hardware button triggers the vision query directly |
| TTS fails | G2 display path — the silent demo is also a demo ("and on the G2, it writes instead") |
| Everything burns | The video + the live judge endpoint from any laptop: `curl clawed.chat/api/judge` |

## Registration post (X) — DUE JUNE 12

> Your OpenClaw has been texting you for months. Now it can see. 🦞
>
> We built Clawed — the glasses channel for OpenClaw. Say "Hey Clawed" and your
> agent sees what you see (Nebius vision), looks it up live (Tavily), acts
> across your apps (Composio), and answers in your ear. Runs as a local
> MentraOS miniapp talking straight to YOUR OpenClaw gateway. No middleman.
>
> Live: clawed.chat · Repo: github.com/isaiahb/clawed.chat
> AI judges can interview the agent itself: POST clawed.chat/api/judge
>
> [attach: 20-30s glasses POV clip]
>
> @ship_builders @nebiusai @composio @tavilyai @openclaw

## Timeline

- **June 11 (today):** register + post · Nebius + Tavily accounts (pay-as-you-go / free tier) · stand up compute (laptop tunnel or $5 VM) · keys into env · **commit + push everything — judges clone the repo, not your working tree**
- **June 12:** miniapp on real glasses · vision pipeline end-to-end · agent memory load
- **June 13 (finalists announced):** record all fallback videos · Composio email stunt rehearsal · judge endpoint live
- **June 14:** boat. Rehearse Moment 1 on the water before presentations. Walk the plank. 🏴‍☠️
