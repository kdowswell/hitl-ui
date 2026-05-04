# examples/vercel-ai-sdk

Live demo: a real LLM agent powered by **Vercel AI SDK v6** drives the conversation, calls the `assess` and `decide` tools when it needs structured input, and the corresponding **hitl-ui** components render inline. The user's submission flows back to the agent as the tool result; the conversation continues.

This is the "actually agentic" companion to `examples/nextjs-tool-call/` (which renders the same components against a static mock payload).

---

## Quick start

```bash
# From the monorepo root:
pnpm install
pnpm build                    # builds the CLI so prebuild can install the components

cd examples/vercel-ai-sdk
cp .env.example .env.local    # then edit to set your provider key (see below)
pnpm dev
```

Open http://localhost:3001.

The first time `pnpm dev` runs, the prebuild hook calls `hitl-ui add assess` and `hitl-ui add decide` to populate `components/hitl-ui/`, `tools/hitl-ui/`, and `instructions/hitl-ui/` from the bundled CLI registry.

---

## Provider setup (pick one)

The demo supports three paths. Resolution order: `AI_PROVIDER` override → `AI_GATEWAY_API_KEY` → `OPENAI_API_KEY` → Ollama localhost.

### Path A — Vercel AI Gateway (RECOMMENDED for AI SDK users)

The natural path for anyone using the AI SDK: **one API key, any provider, swap models with a string change.** Free tier covers casual development; pay-as-you-go beyond that. No SaaS subscription required, no provider lock-in.

1. Get an API key at https://vercel.com/dashboard/ai-gateway (free tier).
2. Add to `.env.local`:
   ```bash
   AI_GATEWAY_API_KEY=vck_...
   ```
3. Default model is `anthropic/claude-haiku-4-5` — Anthropic's small Claude model with excellent tool-calling reliability. Override with `AI_GATEWAY_MODEL`:
   ```bash
   AI_GATEWAY_MODEL=anthropic/claude-haiku-4-5      # default — fast & cheap
   AI_GATEWAY_MODEL=anthropic/claude-sonnet-4-6     # higher quality
   AI_GATEWAY_MODEL=anthropic/claude-opus-4-7       # top-tier reasoning
   AI_GATEWAY_MODEL=openai/gpt-5-mini               # cheap OpenAI
   AI_GATEWAY_MODEL=openai/gpt-5                    # top OpenAI
   AI_GATEWAY_MODEL=google/gemini-2.5-flash         # cheap Google
   AI_GATEWAY_MODEL=google/gemini-2.5-pro           # top Google
   ```
4. `pnpm dev`.

The Gateway-routed model strings work with the same `streamText` call — no other code changes required.

### Path B — OpenAI direct

If you'd rather use your existing OpenAI key without the Gateway in between:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini   # default; or gpt-5 / gpt-5-nano
```

Force this path with `AI_PROVIDER=openai` if you also have a Gateway key set.

### Path C — Ollama (local, free, OSS)

For zero API cost and OSS alignment, run a local model via Ollama. **Tool calling reliability varies a lot by model** — pick from the curated list below.

1. Install Ollama: https://ollama.com (one-click installer for macOS / Linux / Windows).
2. Pull a tool-capable model (recommended order, best to worst for tool use):
   ```bash
   ollama pull qwen3:8b        # gold standard for local tool calling, ~6 GB
   ollama pull gpt-oss:20b     # OpenAI's open-weights model, designed for agents, ~13 GB
   ollama pull llama3.3:70b    # ~GPT-4-class but needs 32+ GB RAM, ~43 GB
   ollama pull qwen3-coder:30b # if you want stronger structured output, ~20 GB
   ```
3. Start Ollama (it usually runs as a background service after install).
4. Add to `.env.local` (or rely on the auto-detect default of `qwen3:8b`):
   ```bash
   OLLAMA_MODEL=qwen3:8b
   ```
5. `pnpm dev`. The provider helper auto-detects `http://localhost:11434`.

**Avoid `llama3.2:3b`** — it's small but its tool-calling output is too inconsistent for HITL flows. The 3 B size class can't reliably emit valid structured tool-call payloads. Use `qwen3:8b` as the floor.

To force this path even if other keys are set: `AI_PROVIDER=ollama`.

---

## How it works

```
┌─────────────┐   tool_call("assess", {...})    ┌──────────────────┐
│  LLM agent  │ ──────────────────────────────▶ │ AI SDK streamText │
└─────────────┘                                  └──────────┬───────┘
                                                            │ stream
                                                            ▼
                                                  ┌──────────────────┐
                                                  │ useChat (React)  │
                                                  └────────┬─────────┘
                                                           │ part.state = "input-available"
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  <Assess />      │
                                                  │   (hitl-ui)      │
                                                  └────────┬─────────┘
                                                           │ onSubmit(result)
                                                           ▼
                                                  ┌──────────────────┐
                                                  │ addToolResult({  │
                                                  │   tool, output   │
                                                  │ })               │
                                                  └────────┬─────────┘
                                                           │ resumes stream
                                                           ▼
                                                       agent continues
```

Key files:

- **`app/api/chat/route.ts`** — registers `assess` and `decide` as client-side tools (no `execute` function). Tool calls pause at `state: "input-available"` so the React side can render UI.
- **`app/page.tsx`** — `useChat()` exposes `messages` and `addToolResult`. For each `tool-assess` / `tool-decide` part with state `input-available`, it renders the matching component and wires `onSubmit` to `addToolResult`.
- **`lib/provider.ts`** — provider selection (Gateway → OpenAI direct → Ollama).
- **`hitl-ui.config.ts`** — points the CLI at this app's install paths.

---

## Suggested test prompts

- *"I want to set up a new feature flag — what do you need to know?"* → expect `assess` invocation.
- *"Help me pick a database for an events pipeline."* → expect `decide` in `select` mode.
- *"Score Postgres vs ClickHouse vs DynamoDB across cost, query speed, and ops burden."* → expect `decide` in `score` mode.
- *"Plan the migration for my Next.js app."* → expect `assess` to gather context first.

---

## Customizing

Extend the demo with any new pattern as you ship it:

1. `pnpm install:components` after a new component lands in the registry.
2. Import it in `app/page.tsx`.
3. Register the tool in `app/api/chat/route.ts` using its exported Zod schema as `inputSchema`.
4. Add a render branch for `tool-<name>` in `Message`.

The pattern stays the same regardless of which agent runtime you swap in (CopilotKit, Mastra, LangGraph.js, OpenAI Agents SDK, etc.) — only the wiring changes.
