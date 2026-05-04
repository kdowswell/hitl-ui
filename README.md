# hitl-ui

> Human-in-the-loop UI components for AI agents.

When an LLM agent needs structured input from a human mid-workflow, developers either build bespoke UI every time or fall back to "please type your answer." Neither scales. **hitl-ui** ships each component as a **triad**:

1. A React component (you own the source after install)
2. A JSON tool definition the agent invokes
3. An opinionated agent-instruction file that teaches your model *when* and *how* to use it

The instructions are the differentiator. Form components are easy to find. Opinionated, tested guidance for agent-driven UX is not.

## Quick start

```bash
# In your existing Next.js / React app
npx @kdowswell/hitl-ui@latest init
npx @kdowswell/hitl-ui@latest add assess
```

This drops the `assess` triad into your project:

```
components/hitl-ui/assess/assess.tsx
tools/hitl-ui/assess.tool.json
instructions/hitl-ui/assess.instructions.md
```

Wire `<Assess />` into your chat framework's tool-call renderer and the JSON tool definition into your agent. Done.

## Theming

Components use a CSS-variable token cascade. If your app already declares the standard shadcn-style tokens (`--card`, `--foreground`, `--primary`, `--border`, `--ring`, `--radius`, etc.), components inherit them automatically. If not, sensible defaults render in both light and dark mode (via `prefers-color-scheme`). Override any single token at any scope to retheme without touching component source.

## Available components

The catalog is organized by the **cognitive operation** the human is performing — this framing comes from HITL research literature ([Magentic-UI, MS Research 2025](https://www.microsoft.com/en-us/research/wp-content/uploads/2025/07/magentic-ui-report.pdf); [HITL systematic review, MDPI 2026](https://www.mdpi.com/1099-4300/28/4/377)).

| Component       | Cognitive op  | Status   | Description |
|---|---|---|---|
| `assess`        | Provide info  | Shipped  | Multi-question structured form, heterogeneous field types |
| `decide`        | Decide        | Planned  | Pick + weigh options across criteria |
| `rank`          | Order         | Planned  | Drag-and-drop priority sequencing |
| `approve`       | Gate          | Planned  | Yes/no on a proposed action with optional rationale |
| `annotate`      | Annotate      | Planned  | Edit / mark up content the agent produced |
| `disambiguate`  | Disambiguate  | Planned  | Single-pick from ambiguous referents (lighter than `decide`) |
| `calibrate`     | Calibrate     | Planned  | Pairwise comparisons or example ratings to anchor the agent |

## Repo layout

This is a Turborepo monorepo:

- `packages/cli` — the published `@kdowswell/hitl-ui` package (Commander-based CLI + `defineConfig` runtime).
- `packages/components` — source of truth for component triads. Not published.
- `examples/nextjs-tool-call` — Next.js 16 + React 19 + Tailwind v4 demo app.

See [`hitl-ui-spec.md`](./hitl-ui-spec.md) for the authoritative architecture spec, including per-component schemas, rendering models, and the positioning vs A2UI / Adaptive Cards / CopilotKit. The original draft (5 components, "agent-ui" name) lives at [`agent-ui-spec.md`](./agent-ui-spec.md) for historical context. See [`CLAUDE.md`](./CLAUDE.md) for contributor guidance.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT © 2026 Kurt Dowswell
