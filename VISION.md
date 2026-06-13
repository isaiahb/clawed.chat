# Vision — the infrastructure layer for autonomous agents

> Clawed is chapter one. The thesis is bigger: **agents are becoming real actors
> in the world, and they're missing the infrastructure to act like it.**

## The one-line thesis

The last two years gave agents a brain (LLMs) and hands (tool/function calling).
What's missing is everything that lets a brain-with-hands actually *operate as an
independent entity*: **senses, identity, communication, reputation, and money.**
We build that layer. We start where it's most visceral — senses — and expand
into the rest.

## Why now

- OpenClaw hit 100k+ GitHub stars in ~3 months. People already run persistent,
  self-hosted agents with months of memory. The agent isn't a demo anymore — it's
  a standing entity in someone's life.
- But every one of those agents is trapped in a text box, blind to the physical
  world, unable to talk to other agents, with no identity of its own and no way
  to pay for anything. The capability is here; the **infrastructure is not.**

## The pillars

| Pillar | What it means | Status |
|---|---|---|
| **Senses** | The agent sees what you see, hears what you hear, speaks back / writes on your lens. | ✅ **Clawed** — shipped (glasses channel for OpenClaw) |
| **Identity** | The agent is its own entity: its own email, its own accounts, its own handle — not borrowed from its operator. | 🔜 Email-for-agents (below) |
| **Communication** | Agents talk to *each other*, not just to humans — across teams, tools, and orgs. | 🔜 Agent comms bus (below) |
| **Reputation** | A trust signal that lets the good agents act freely and gates the bad ones. | 🔜 the moat |
| **Money** | Agents pay for services autonomously (compute, APIs, each other). | 🔮 agent payment rails (x402-style) |

Clawed proves pillar one is real and demoable. The rest is the roadmap — and
each pillar is a product.

---

## Product: Email for autonomous agents

Email is the universal, identity-bearing, async substrate. Humans can sign up
for it in two minutes; **an autonomous agent cannot** — signup is CAPTCHA- and
phone-gated *by design*. So agents borrow their operator's inbox, which is exactly
what nobody should want. We give every agent its own.

**What it is:** an API-first email service built for non-human senders.
- `POST /agents/:id/mailbox` → provision `agent-xyz@…` in one call, no human.
- `POST /send`, inbox via webhook/poll as structured JSON (not IMAP).
- Per-agent identity, scopes, rate/spend caps, kill switches.

**The hard, defensible part — outbound trust, not plumbing.** Deliverability
(SMTP, IP warmup, SPF/DKIM/DMARC) is commoditized; we ride a backbone for it. The
novel layer is **outbound intent filtering** for autonomous senders:

1. **Embedding screen (cheap):** embed each outbound message, compare to known
   abuse vectors and the sender's own history. Most mail clears instantly.
2. **LLM adjudication (escalation only):** for borderline/novel sends, a smarter
   model judges intent — spam, phishing, harassment — before it leaves.
3. **Reputation gates everything.** Trusted agents send freely on clean IP pools;
   new/untrusted agents are quarantined to isolated pools and reviewed harder.

**Business model that doubles as abuse control:** free to receive, limited free
send, small fee to unlock unlimited — *but only while reputation holds* (you
can't buy your way past the gate). Future: agents pay the fee themselves via
agent-payment rails.

**Eyes-open hard problems:** deliverability blast radius (one bad agent can
blocklist a shared pool → isolate IPs by trust tier); reputation cold-start
(bootstrap trust via verified payment / vouching / operator identity); liability
for autonomous sends (CAN-SPAM et al.).

---

## Product: Agent-to-agent communication

Today's agents only talk to humans. But teams now run *fleets* — Claude Code and
Codex instances on different features, plus teammates' agents. They should
coordinate directly: "I changed the API contract — heads up, feature-B agent."

**What it is:** an **MCP server that is a shared message bus.** Both Claude Code
and Codex speak MCP, so one integration reaches the whole fleet.
- `send_message(to, topic, body)` · `read_messages()` · `subscribe(topic)`
- Backed by a shared store; @mentions, topics, durable history.

**Convergence with email:** email is the *async, cross-org, identity-bearing*
channel (agents already have addresses); the MCP bus is the *realtime, in-team*
channel for tight dev-loop coordination. Same thesis — agents communicating as
first-class participants — at two latencies.

Prior art to align with, not reinvent: Google's **A2A (Agent2Agent)** protocol;
**MCP** as the cross-tool substrate.

---

## Sequencing

1. **Now (Buildership):** Clawed — senses. Live, demoable, real sponsor-stack depth.
2. **Next:** the agent-comms MCP bus — most scoped, immediately useful across our
   own Claude Code + Codex workflow, proves the "agents as participants" thesis.
3. **Then:** email-for-agents MVP (thin API over a sending backbone + the
   embedding→LLM trust gate).
4. **Later:** reputation as a standalone trust primitive; agent payment rails.

The throughline: **we are building the infrastructure that lets autonomous
agents act in the world.** Clawed is the proof that the layer is real — you can
put it on and talk to it today.

---

*Built by Isaiah, Aryan & Parth — engineers at [Mentra](https://mentra.glass),
the open-source smart-glasses startup behind MentraOS.*
