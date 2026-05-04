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
pnpm dev
```

Open http://localhost:3001.

The first time `pnpm dev` runs, the prebuild hook calls `hitl-ui add assess` and `hitl-ui add decide` to populate `components/hitl-ui/`, `tools/hitl-ui/`, and `instructions/hitl-ui/` from the bundled CLI registry.

---

## Provider setup (pick one)

The demo defaults to **local Ollama** so you can run it with zero API costs. If you have an OpenAI key, it'll be picked up automatically.

### Option A — Ollama (local, free, OSS-aligned default)

1. Install Ollama from https://ollama.com (one-click installers for macOS / Linux / Windows).
2. Pull a model with tool-calling support:
   ```bash
   ollama pull llama3.2          # 3B, fast, basic tool support
   # or for better results:
   ollama pull qwen2.5:7b        # stronger structured-output reliability
   ollama pull llama3.1:8b       # good middle ground
   ```
3. Start Ollama (it usually runs as a background service after install).
4. Run the demo: `pnpm dev` — the provider helper auto-detects `http://localhost:11434`.

To pick a different model, set `OLLAMA_MODEL` in `.env.local`:

```bash
OLLAMA_MODEL=qwen2.5:7b
```

**Note:** Local model tool-calling reliability varies. Smaller models may hallucinate tool args or skip calling tools entirely. If the agent doesn't pick up the tools, try a larger model (`qwen2.5:7b` or above) or fall back to OpenAI.

### Option B — OpenAI (cloud, paid, most reliable)

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY=sk-...`. Optionally pin a model with `OPENAI_MODEL=gpt-4o-mini` (the default).
3. Run `pnpm dev`. The provider helper detects the key and uses OpenAI.

To force OpenAI even with Ollama running, set `AI_PROVIDER=openai`.

### Option C — Other providers

Swap `lib/provider.ts` to use any other [AI SDK provider](https://ai-sdk.dev/providers): Anthropic, Gemini, Groq, OpenRouter, Mistral, etc. They all implement the same `LanguageModel` interface; the rest of the demo doesn't change.

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

- **`app/api/chat/route.ts`** — registers `assess` and `decide` as client-side tools (no `execute` function). The agent's tool calls pause at `state: "input-available"` so the React side can render UI.
- **`app/page.tsx`** — `useChat()` exposes `messages` and `addToolResult`. For each `tool-assess` / `tool-decide` part with state `input-available`, it renders the matching component and wires `onSubmit` to `addToolResult`.
- **`lib/provider.ts`** — provider selection logic (Ollama default, OpenAI fallback, configurable via env).
- **`hitl-ui.config.ts`** — points the CLI at this app's `components/`, `tools/`, `instructions/` paths.

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

Pattern stays the same regardless of which agent runtime you swap in (CopilotKit, Mastra, LangGraph.js, OpenAI Agents SDK, etc.) — only the wiring changes.
