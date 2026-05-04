# hitl-ui

> Human-in-the-loop UI components for AI agents.

shadcn-style installer. Each component ships as a **triad** — a React component, a JSON tool definition the agent invokes, and an opinionated markdown file teaching the agent *when* and *how* to use it.

## Quick start

```bash
# In your existing Next.js / React app
npx hitl-ui@latest init
npx hitl-ui@latest add assess
```

This drops the `assess` triad into your project:

```
components/hitl-ui/assess/assess.tsx
tools/hitl-ui/assess.tool.json
instructions/hitl-ui/assess.instructions.md
```

Wire `<Assess />` into your chat framework's tool-call renderer, register the JSON tool definition with your agent, and read the instruction file to learn when to invoke it.

## Theming

Components use a CSS-variable token cascade. If your app already declares the standard shadcn-style tokens (`--card`, `--foreground`, `--primary`, `--border`, `--ring`, `--radius`, etc.), components inherit them automatically. Otherwise sensible defaults render in both light and dark mode (via `prefers-color-scheme`). To retheme, override any single token at any DOM scope.

## Commands

| Command | Description |
|---|---|
| `hitl-ui init` | Scaffold `hitl-ui.config.ts` with default install paths |
| `hitl-ui add <name>` | Install a component triad into your project |
| `hitl-ui list` | Show all components available in the bundled registry |

Flags: `--force` (overwrite), `--yes` (skip prompts), `--registry <url>` (use a remote registry instead of the bundled one).

## Available components

| Component | Status |
|---|---|
| `assess` — Structured assessment with mixed input types | Shipped |
| `decide`, `rank`, `approve`, `collect` | Planned |

## License

MIT © Kurt Dowswell
