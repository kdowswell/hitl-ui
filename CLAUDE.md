# CLAUDE.md

Guidance for AI agents (Claude Code, Copilot, Cursor) working in this repo.

## Project Overview

hitl-ui is a shadcn-style component library for human-in-the-loop UI in AI agent workflows. Each component is a triad: React component + JSON tool definition + markdown agent instructions. The instructions are the product differentiator, not an afterthought.

The catalog is organized by **cognitive operation** (provide info / decide / order / gate / annotate / disambiguate / calibrate), not by UI element type — see `hitl-ui-spec.md` for the rationale and per-component schemas.

The project was originally named "agent-ui" before the scope was narrowed and the bare/scoped npm names were unavailable. The repo directory and `agent-ui-spec.md` retain that name for historical context, but every shipped artifact uses `hitl-ui` / `@kdowswell/hitl-ui`. The authoritative spec is `hitl-ui-spec.md`.

## Key Principles

- Components are copied into the user's project via the CLI. They are not imported from a published package.
- Every component must ship with a `.tool.json` and `.instructions.md` alongside the `.tsx`.
- UI must work in dark mode, be keyboard-navigable, and meet basic a11y (focus rings, semantic markup, ARIA where Radix doesn't cover).
- Tool definitions must validate at runtime via Zod schemas mirroring the JSON Schema in `.tool.json`.
- Agent instructions are first-class — review them as carefully as code.

## Theming Architecture

Components use a **CSS-variable token cascade with literal fallbacks**:

- Each component declares its own scoped variables (e.g. `--hitl-bg`, `--hitl-primary`) via an inline `<style>` block on its root.
- Each scoped variable falls back to a shadcn-convention token (`--card`, `--primary`, `--border`, `--ring`, `--radius`, etc.) and finally to a literal `oklch(...)` default.
- The default fallbacks include a `prefers-color-scheme: dark` media query for clean dark-mode rendering.

This means: zero setup required. If the host app declares shadcn tokens, components inherit them. If it doesn't, the defaults render. To retheme, override any single token at any DOM scope.

### Portals must re-declare the data attribute

Any Radix primitive that renders into a portal (`Select.Content`, `Popover.Content`, `Tooltip.Content`, `Dialog.Content`, `DropdownMenu.Content`, etc.) is mounted at `<body>`, **outside** the `[data-hitl-component="<name>"]` element where the CSS variables are scoped. Without intervention, portaled content renders with transparent backgrounds because the `--hitl-*` vars don't cascade across the portal boundary.

Fix: set `data-hitl-component="<name>"` on every portaled element so the same `<style>` rule applies. The inline `<style>` block lives in the document, not the React tree, so the rule matches portal content as long as the data attribute is present.

## Architecture

- pnpm workspaces + Turborepo (`packages/cli`, `packages/components`, `examples/*`).
- React 19, TypeScript strict, Tailwind v4, Radix UI primitives.
- Commander for CLI, `@clack/prompts` for interactive UX, `jiti` for loading user TS configs.
- Vitest for tests. Biome for lint/format.
- Changesets for versioning. Only `@kdowswell/hitl-ui` is published in v0.

## Distribution Model

`packages/components/<name>/` is the source of truth. A build-time script at `packages/cli/scripts/build-registry.ts` walks it and emits `packages/cli/dist/registry/<name>.json` — manifests with file contents inlined as strings (shadcn shape). The CLI ships these manifests bundled inside the npm package. A future hosted registry is a drop-in via the `--registry <url>` flag.

## When Adding a New Component

1. Create `packages/components/<name>/`.
2. Implement `<name>.tsx` (functional, TypeScript, `"use client"` if it uses state/effects, follow the inline-style token-cascade pattern from `assess.tsx` — including the `data-hitl-component="<name>"` attribute on the root and on every portaled element).
3. Write `<name>.types.ts` with Zod schemas + inferred types.
4. Write `<name>.tool.json` (verbatim JSON Schema for the tool definition; matches the schema documented in `hitl-ui-spec.md`).
5. Write `<name>.instructions.md` (agent guidance prose; follow the structure of `assess.instructions.md` — cognitive op, when to use, when not to use, anti-patterns, example).
6. Add `meta.json` declaring peers and the file layout (which files map to `components` / `tools` / `instructions` install targets).
7. Add `index.ts` barrel export.
8. Write `<name>.test.tsx` with Vitest + Testing Library — minimum: schema validation tests + at least one happy-path interaction test per mode.
9. **Write `<name>.stories.tsx` with Storybook** — at minimum a `Minimal` variant and an `AllVariants` variant; pattern from `assess/assess.stories.tsx`. Stories double as visual-regression baselines and live documentation.
10. Run `pnpm build` — confirm `packages/cli/dist/registry/<name>.json` is generated correctly.
11. Add example usage to `examples/nextjs-tool-call/app/page.tsx` (or its own demo page) so the install pipeline is exercised end-to-end on every prebuild.

## Storybook

Component playground lives in `packages/components/.storybook/`. Run `pnpm storybook` from the root to launch on http://localhost:6006.

- **Framework:** `@storybook/react-vite` (Storybook 10.3+). Vite config shared via `packages/components/vite.config.ts` (`@vitejs/plugin-react` + `@tailwindcss/vite`).
- **Theme switching:** `withThemeByClassName` decorator (`@storybook/addon-themes`) toggles a class on `<html>`. Each theme class re-declares the shadcn-style tokens in `.storybook/globals.css` — `Default` / `shadcn light` / `shadcn dark` / `Brand orange` / `Brand teal`. Use the toolbar to verify a component renders correctly under all themes before merging.
- **Adding a theme:** edit `.storybook/globals.css` (add an `html.<class>` block) and `.storybook/preview.ts` (add the entry to the `withThemeByClassName` themes map).
- **Static export:** `pnpm build-storybook` outputs `storybook-static/` for hosting (Vercel / Netlify / GitHub Pages).

## Code Style

- Functional components only. No classes.
- Props interfaces named `<Name>Props`.
- Use Radix primitives over hand-rolled equivalents (Select, Checkbox, Switch, Slot, etc.).
- Tailwind utility classes only. No CSS files in components except the inline `<style>` block carrying token defaults.
- All components must accept `className?: string` for consumer overrides; merge with `clsx` or string concatenation.
- Top of every component file: `// Copied from hitl-ui — feel free to edit.` (so the user knows it's owned code).

## Testing

- Component rendering: Vitest + `@testing-library/react`.
- Tool definition validation: Zod schema tests asserting both happy path and error path.
- CLI: integration tests that spawn the built binary in `os.tmpdir()` via `execa` and snapshot the resulting file tree.

## Important: Versions

The example app pins:

- Next.js 16.x
- React 19.x
- Tailwind CSS v4 (CSS-first, no PostCSS dance)

Components target React 19 in their peer-dep declarations. Don't introduce React 18-only APIs.

## Published Package Identity

`@kdowswell/hitl-ui` — published under Kurt's personal npm scope (`@kdowswell`). The bare `agent-ui` package, the `agent-ui` org, and `hitl-ui` org names were all unavailable on npm at v0 publish time, so v0 ships under the personal scope. The package is dual-purpose: it provides the `hitl-ui` binary (`bin`) and a tiny runtime export (`exports`) so users can write `import type { HitlUiConfig } from '@kdowswell/hitl-ui'` in their `hitl-ui.config.ts`. Consumers invoke it as `npx @kdowswell/hitl-ui@latest …`. Migration to a dedicated org scope is a future option (republish + deprecate pointer).
