---
"@kdowswell/hitl-ui": minor
---

Initial release of hitl-ui — a shadcn-style CLI for installing human-in-the-loop UI component triads (React component + JSON tool definition + agent instructions) into AI agent projects. Ships with the `assess` component for multi-question structured input, plus `init` / `add` / `list` commands, a typed `defineConfig` runtime export, and a bundled JSON registry. Components use a CSS-variable token cascade so they inherit the host app's design tokens (shadcn convention) when present and fall back to clean defaults when not.
