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

## Budget reality (no credits until you win)

The whole demo stack runs for roughly **the price of lunch**, self-funded:

| Thing | Cost |
| --- | --- |
| Nebius inference (Kimi/Qwen, pay-as-you-go) | cents — demo traffic is a few hundred K tokens |
| Nebius smallest VM, ~5 days | ~$5–15 (keeps the all-sponsor story) |
| Tavily | free tier (1,000 credits/mo) covers the demo many times over |
| Composio | existing free/dev tier, already wired |
| Cloudflare Pages (site) | $0 |

**$0 alternative for compute:** run OpenClaw + the Bun backend on your own
Mac (mini or laptop) with a `cloudflared` tunnel for the public `/api/vision`
+ `/api/judge` URLs. This is maximally on-brand — "self-hosted agent on my
own hardware" IS the OpenClaw ethos — and on the boat the laptop is in the
room anyway. Recommended: laptop for the gateway + a $5 Nebius VM for the
public endpoints, so the judge endpoint stays up after you leave the boat.

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
> Live: clawed.chat · Repo: github.com/BallahTech/clawed.chat
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
