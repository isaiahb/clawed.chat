# agent-memory/ — the demo agent's brain food

Files to load into the demo OpenClaw's workspace before judging. They power
**judge mode** (`/api/judge` interviews) and the **boat-day co-pitch**.

## Install

```bash
# on the machine running the demo OpenClaw
cp scripts/agent-memory/CLAWED.md   ~/.openclaw/workspace/memory/clawed-project.md
cp scripts/agent-memory/BUILDERSHIP.md ~/.openclaw/workspace/memory/buildership-event.md
cp scripts/agent-memory/PITCH.md    ~/.openclaw/workspace/memory/pitch-mode.md
# (adjust paths to your OpenClaw workspace/memory layout — `openclaw doctor`
# prints the workspace root)
```

Then verify: `curl -X POST <backend>/api/judge -d '{"message":"What are you?"}'`
— the reply should reference the glasses channel unprompted.

## Files

| File | Feeds |
| --- | --- |
| `CLAWED.md` | What the project is, architecture, where code lives — judge Q&A |
| `BUILDERSHIP.md` | Event schedule, rubric, sponsors — context for boat day |
| `PITCH.md` | The "anything to add?" co-pitch trigger + email stunt protocol |

Before boat day, append to `BUILDERSHIP.md`: judge names/emails (for the
Composio stunt), yacht facts, anything overheard during the morning.
