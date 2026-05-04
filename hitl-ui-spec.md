# hitl-ui

> Human-in-the-loop UI components for AI agents.

> **Note:** This is the authoritative spec for the project as of v0.1. The original draft lives in `agent-ui-spec.md` (different name, broader 5-component framing); kept for historical context but do not treat it as current.

## What This Is

When an LLM agent needs structured input from a human mid-workflow, developers either build bespoke UI every time or fall back to "please type your answer." Neither scales. **hitl-ui** ships each component as a **triad**:

1. A React component (you own the source after install)
2. A JSON tool definition the agent invokes
3. An opinionated agent-instruction file that teaches your model *when* and *how* to use it

The instructions are the differentiator. Form components are easy to find. Opinionated, tested guidance for agent-driven UX is not.

---

## Pattern Catalog (v0.1)

The catalog is organized by **the cognitive operation the human is performing**, not by UI element type. This framing comes from HITL research literature ([Magentic-UI, MS Research 2025](https://www.microsoft.com/en-us/research/wp-content/uploads/2025/07/magentic-ui-report.pdf); [HITL systematic review, MDPI 2026](https://www.mdpi.com/1099-4300/28/4/377)) and from preference-elicitation research ([Active Learning for Preference Elicitation, arXiv:2309.00356](https://arxiv.org/abs/2309.00356)).

| Component | Cognitive op | Status | Description |
|---|---|---|---|
| `assess`        | Provide info | **Shipped** | Multi-question structured form. Heterogeneous field types. |
| `decide`        | Decide       | **Shipped** | Pick + weigh options across criteria. |
| `rank`          | Order        | Planned   | Drag-and-drop priority sequencing. |
| `approve`       | Gate         | Planned   | Yes/no on a proposed action with optional rationale. |
| `annotate`      | Annotate     | Planned   | Edit / mark up content the agent produced. |
| `disambiguate`  | Disambiguate | Planned   | Single-pick when the agent has identified ambiguous referents. |
| `calibrate`     | Calibrate    | Planned   | Pairwise comparisons or example ratings to anchor the agent. |

**Why these seven and not more / fewer:** Patterns force the agent to pick a complete UX, not compose UI from primitives at runtime. Primitive catalogs (Adaptive Cards, A2UI, Slack Block Kit) already exist and own that layer; hitl-ui's value-add is the opinionation that primitives by design cannot carry. Seven patterns cover the recurring cognitive operations identified in HITL literature with minimal overlap. If the agent's need doesn't fit one cleanly, the instruction prose for every pattern explicitly says **"prefer chat over forcing a fit."**

**Why no `collect`:** The original spec had a `collect` "dynamic form fallback" that overlapped almost completely with `assess` — same multi-field structure, slightly broader field types, no per-question cap. Merged into `assess` with the broader field set; the escape-hatch role moved to "use chat instead of forcing a pattern."

---

## Architecture

### Tech Stack

- **React 19+** with TypeScript strict mode
- **Tailwind CSS v4** for styling (utility classes only; no compiler dependency at component level)
- **Radix UI primitives** for accessible base components
- **Zod** for runtime validation of tool-call parameters

### Theming via CSS-variable cascade

Each component declares scoped CSS variables (`--hitl-bg`, `--hitl-primary`, `--hitl-border`, etc.) via an inline `<style>` block on its root, with three-level fallbacks:

```css
--hitl-bg: var(--card, oklch(1 0 0));        /* shadcn token → literal default */
--hitl-fg: var(--card-foreground, var(--foreground, oklch(0.18 0.005 285)));
```

This means: **zero setup required**. Host apps with shadcn-style tokens (`--card`, `--primary`, `--border`, `--ring`, `--radius`) inherit automatically. Apps without get a clean light/dark default theme via `prefers-color-scheme`. Override any single token at any DOM scope to retheme.

**Portal caveat:** Radix primitives that render through a portal (`Select.Content`, `Popover.Content`, `Dialog.Content`, `Tooltip.Content`) escape the form's CSS-variable scope. Every portaled element must re-apply `data-hitl-component="<name>"` so the inline `<style>` rule re-attaches. Documented in `CLAUDE.md`.

### Install Model (shadcn-style)

The CLI copies source files into the developer's project. They own the code after install.

```bash
npx @kdowswell/hitl-ui@latest init       # scaffolds hitl-ui.config.ts
npx @kdowswell/hitl-ui@latest add assess # adds the assess triad
npx @kdowswell/hitl-ui@latest list       # shows available components
```

After `add assess`, the developer gets:

```
components/hitl-ui/assess/assess.tsx        # React component
components/hitl-ui/assess/assess.types.ts   # Shared TypeScript types
components/hitl-ui/assess/index.ts          # Barrel export
tools/hitl-ui/assess.tool.json              # Tool definition (JSON schema)
instructions/hitl-ui/assess.instructions.md # Agent usage guide
```

### Distribution Model

`packages/components/<name>/` is the source of truth. A build-time script at `packages/cli/scripts/build-registry.ts` walks it and emits `packages/cli/dist/registry/<name>.json` — manifests with file contents inlined as strings (shadcn shape). The CLI ships these manifests bundled inside the npm package. The `--registry <url>` flag is reserved for future hosted-registry migration.

### Config File

`hitl-ui.config.ts` (created by `init`):

```typescript
import type { HitlUiConfig } from "@kdowswell/hitl-ui";

const config: HitlUiConfig = {
  componentsDir: "components/hitl-ui",
  toolsDir: "tools/hitl-ui",
  instructionsDir: "instructions/hitl-ui",
  renderMode: "tool-call", // or "message-embed" (planned)
};

export default config;
```

Type-only import — the package doesn't have to be installed at runtime for `add` to work. Users who want the runtime `defineConfig` helper can import it normally.

---

## Component Specifications

### 1. `assess` — Provide structured information

**Cognitive op:** Provide info

**Purpose:** Present 1–8 related questions of mixed types and collect typed answers in one shot.

**Tool Definition Schema:**

```json
{
  "name": "assess",
  "description": "Present a structured assessment to the user. Use when you need 1-8 related answers before proceeding.",
  "parameters": {
    "type": "object",
    "required": ["title", "questions"],
    "properties": {
      "title":       { "type": "string" },
      "description": { "type": "string" },
      "questions": {
        "type": "array",
        "minItems": 1,
        "maxItems": 8,
        "items": {
          "type": "object",
          "required": ["id", "type", "prompt"],
          "properties": {
            "id":              { "type": "string" },
            "type":            { "enum": ["text", "textarea", "select", "multi_select", "scale", "boolean", "number", "email", "url", "date"] },
            "prompt":          { "type": "string" },
            "options":         { "type": "array", "items": { "type": "string" } },
            "scale_min_label": { "type": "string" },
            "scale_max_label": { "type": "string" },
            "scale_steps":     { "type": "number", "default": 5 },
            "required":        { "type": "boolean", "default": true },
            "placeholder":     { "type": "string" },
            "validation": {
              "type": "object",
              "properties": {
                "min":     { "type": "number" },
                "max":     { "type": "number" },
                "pattern": { "type": "string" },
                "message": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

**Result shape:** `{ [questionId]: string | string[] | number | boolean }` — type per question follows the field type.

**Agent instruction highlights:** Use for 2–8 related answers. Don't chain assessments. Use `select` when options are known, `text` / `textarea` when they aren't. Always fill in `description` to tell the user *why* you're asking. Front-load the easiest questions. Mark required `true` unless genuinely optional.

---

### 2. `decide` — Pick + weigh options *(Shipped)*

**Cognitive op:** Decide

**Purpose:** Present 2–5 options across 1–6 evaluation criteria. Human picks an option, optionally with per-criterion scoring.

**Tool Definition Schema (sketch):**

```json
{
  "name": "decide",
  "description": "Present a decision matrix with options and evaluation criteria. Use when the human needs to weigh tradeoffs between 2-5 options across multiple dimensions.",
  "parameters": {
    "type": "object",
    "required": ["title", "options"],
    "properties": {
      "title":       { "type": "string" },
      "description": { "type": "string" },
      "options":     { "type": "array", "minItems": 2, "maxItems": 5, "items": { "type": "object", "required": ["id", "label"], "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string" } } } },
      "criteria":    { "type": "array", "minItems": 0, "maxItems": 6, "items": { "type": "object", "required": ["id", "label"], "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "weight": { "type": "number", "default": 1 } } } },
      "mode":        { "enum": ["score", "select"], "default": "select" }
    }
  }
}
```

**Result shape:** Either a winning option id (`select` mode) or a full scored matrix (`score` mode).

**Agent instruction highlights:** Use for architectural decisions, vendor selection, approach evaluation. Pre-fill criteria the agent CAN evaluate; leave human-judgment criteria for the human. Don't use for binary "do X or not" — use `approve`. Always include option descriptions for context.

---

### 3. `rank` — Order items by priority *(Planned)*

**Cognitive op:** Order

**Purpose:** Drag-and-drop ordering of 2–12 items. Agent provides a list and optionally a suggested initial order; human arranges by priority.

**Tool Definition Schema (sketch):**

```json
{
  "name": "rank",
  "description": "Ask the user to rank items in priority order via drag-and-drop. Use when relative priority matters more than absolute scores.",
  "parameters": {
    "type": "object",
    "required": ["title", "items"],
    "properties": {
      "title":         { "type": "string" },
      "description":   { "type": "string" },
      "items":         { "type": "array", "minItems": 2, "maxItems": 12, "items": { "type": "object", "required": ["id", "label"], "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string" } } } },
      "initial_order": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

**Result shape:** Ordered array of item ids.

**Agent instruction highlights:** Use when relative priority matters more than absolute scores. Cap at 12 items — beyond that, ask the human to group first. Always provide `initial_order` when you have a suggested ranking so the human adjusts rather than starting from scratch. Don't use when items are independent — use `assess` with scale questions.

---

### 4. `approve` — Gate an action *(Planned)*

**Cognitive op:** Gate

**Purpose:** Show what the agent is about to do (plan, diff, or summary) and get explicit yes/no with optional rationale. **Narrowed from the original spec — content review / annotation is now `annotate`'s job, not `approve`'s.**

**Tool Definition Schema (sketch):**

```json
{
  "name": "approve",
  "description": "Present a plan, diff, or summary of an action for human approval. Use before executing destructive, expensive, or irreversible operations.",
  "parameters": {
    "type": "object",
    "required": ["title", "content"],
    "properties": {
      "title":       { "type": "string" },
      "description": { "type": "string" },
      "content":     { "type": "object", "required": ["type", "body"], "properties": { "type": { "enum": ["plan", "diff", "summary"] }, "body": { "type": "string" }, "language": { "type": "string" } } },
      "actions":     { "type": "array", "default": [{ "id": "approve", "label": "Approve", "style": "primary" }, { "id": "reject", "label": "Reject", "style": "destructive" }] },
      "allow_comment": { "type": "boolean", "default": true }
    }
  }
}
```

**Result shape:** `{ action: string, comment?: string }`

**Agent instruction highlights:** Use before deployments, destructive operations, paid API calls, irreversible writes. Show enough context that the human can decide without follow-ups. `diff` for code changes, `plan` for multi-step actions, `summary` for high-level overviews. **Don't use for content review** — that's `annotate`. **Don't use for information gathering** — that's `assess`.

---

### 5. `annotate` — Edit or mark up agent output *(Planned, NEW)*

**Cognitive op:** Annotate

**Purpose:** Show content the agent produced (text, list, structured doc) and let the human edit, highlight, comment, or accept regions. Fills the gap between "approve as-is" (`approve`) and "regenerate from scratch" (no pattern).

**Tool Definition Schema (sketch):**

```json
{
  "name": "annotate",
  "description": "Show generated content and let the human edit, highlight, or comment on regions before accepting. Use when the human's value-add is refinement, not gating.",
  "parameters": {
    "type": "object",
    "required": ["title", "content"],
    "properties": {
      "title":       { "type": "string" },
      "description": { "type": "string" },
      "content":     { "type": "object", "required": ["type", "body"], "properties": { "type": { "enum": ["text", "markdown", "list", "code"] }, "body": { "type": "string" }, "language": { "type": "string" } } },
      "mode":        { "enum": ["edit", "highlight", "comment"], "default": "edit" }
    }
  }
}
```

**Result shape (depends on mode):**
- `edit` → `{ body: string }` (the edited content)
- `highlight` → `{ ranges: Array<{ start: number, end: number, label?: string }> }`
- `comment` → `{ comments: Array<{ anchor: string, comment: string }> }`

**Agent instruction highlights:** Use after generating drafts (writing, code, plans, summaries) when the human's role is refinement, not just approval. Don't use for net-new info — that's `assess`. Don't use as a substitute for `approve` on destructive actions.

---

### 6. `disambiguate` — Single-pick from ambiguous referents *(Planned, NEW)*

**Cognitive op:** Disambiguate

**Purpose:** When the agent has identified an ambiguous referent ("which 'John' did you mean?", "which version of the file?"), present rich-context options for a single pick. Lighter than `decide` — no criteria, no scoring, just "which one."

**Tool Definition Schema (sketch):**

```json
{
  "name": "disambiguate",
  "description": "Ask the user to pick one option from a small set of similar candidates. Use when the agent has identified an ambiguous referent and needs clarification before proceeding.",
  "parameters": {
    "type": "object",
    "required": ["title", "options"],
    "properties": {
      "title":       { "type": "string" },
      "description": { "type": "string" },
      "candidates":  { "type": "array", "minItems": 2, "maxItems": 8, "items": { "type": "object", "required": ["id", "label"], "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string" }, "metadata": { "type": "object" } } } },
      "allow_none":  { "type": "boolean", "default": false }
    }
  }
}
```

**Result shape:** `{ id: string | null }` — chosen candidate id, or `null` if `allow_none` is true and the user picks "none of these."

**Agent instruction highlights:** Use when you've narrowed down to a small set of candidates and need ONE pick. Don't use for open-ended choices — those are `decide`. Don't use for binary yes/no — use chat. Always include enough metadata in candidates that the user can tell them apart (e.g., file paths + last-modified, user emails, version numbers).

---

### 7. `calibrate` — Anchor the agent's judgment *(Planned, NEW)*

**Cognitive op:** Calibrate

**Purpose:** Let the human give example ratings or pairwise comparisons that anchor the agent's future judgments (writing tone, code style, design preference, ranking criteria). Borrowed from preference-elicitation research — pairwise queries provide more information per interaction than rating queries.

**Tool Definition Schema (sketch):**

```json
{
  "name": "calibrate",
  "description": "Present sample items for the human to rate or compare, so the agent can anchor its future judgments. Use sparingly — at the start of a session or when the agent realizes it's been guessing.",
  "parameters": {
    "type": "object",
    "required": ["title", "samples", "mode"],
    "properties": {
      "title":       { "type": "string" },
      "description": { "type": "string" },
      "mode":        { "enum": ["pairwise", "rate"], "default": "pairwise" },
      "samples":     { "type": "array", "minItems": 1, "maxItems": 8, "items": { "type": "object", "required": ["id", "content"], "properties": { "id": { "type": "string" }, "content": { "type": "string" }, "type": { "enum": ["text", "code", "image_url"], "default": "text" } } } },
      "scale_steps": { "type": "number", "default": 5 }
    }
  }
}
```

**Result shape (depends on mode):**
- `pairwise` → `{ comparisons: Array<{ a: string, b: string, preferred: "a" | "b" | "tie" }> }`
- `rate` → `{ ratings: Record<string, number> }`

**Agent instruction highlights:** Use at session start when you need to anchor a stylistic judgment, or mid-session when you realize you've been guessing the user's preference. Pairwise mode produces more reliable signal per question; use `rate` mode when you need absolute scores. Don't use for one-off choices — that's `decide`. Don't overuse — calibration is expensive attention.

---

## Rendering Architecture

### Model A: Tool-Call Rendering (Default)

The chat framework intercepts the agent's tool call and renders the matching hitl-ui component. The user's response is returned as the tool result.

```
Agent → tool_call("assess", { ... })
        → Chat framework
          → Renders <Assess />
            → User submits
              → tool_result({ ... })
                → Agent
```

Adapter examples planned for: Vercel AI SDK, CopilotKit (`useCopilotAction({ renderAndWaitForResponse })`), OpenAI Assistants, Anthropic SDK with custom tool handlers.

### Model B: Message-Embedded Rendering *(Planned)*

For chat frameworks without a tool-call render hook, the agent emits a fenced code block with a special language tag:

````
```hitl-ui:assess
{
  "title": "Architecture Assessment",
  "questions": [...]
}
```
````

A renderer in the chat UI detects and swaps in the component. More portable, less principled. Documented as an alternative for teams on simpler stacks.

---

## Repo Structure

```
agent-ui/                          # repo dir kept for git-history continuity
├── README.md
├── CLAUDE.md
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
├── tsconfig.base.json
├── hitl-ui-spec.md                # this file (authoritative)
├── agent-ui-spec.md               # original 5-component draft (historical)
│
├── packages/
│   ├── cli/                       # Published as @kdowswell/hitl-ui
│   │   ├── src/
│   │   │   ├── index.ts           # commander wiring
│   │   │   ├── runtime.ts         # exports defineConfig
│   │   │   ├── commands/{init,add,list}.ts
│   │   │   ├── utils/{config,registry,install,peers,paths}.ts
│   │   │   └── templates/hitl-ui.config.ts.tmpl
│   │   ├── scripts/build-registry.ts
│   │   └── tests/
│   │
│   └── components/                # @kdowswell/hitl-ui-components (private)
│       ├── assess/                # Shipped
│       ├── decide/                # Planned
│       ├── rank/                  # Planned
│       ├── approve/               # Planned
│       ├── annotate/              # Planned (NEW)
│       ├── disambiguate/          # Planned (NEW)
│       └── calibrate/             # Planned (NEW)
│
└── examples/
    └── nextjs-tool-call/          # Next 16 + React 19 + Tailwind v4 demo
```

---

## Development Phases

### Phase 1 — Foundation *(Done)*

- ✅ Monorepo with Turborepo + pnpm + Biome + Changesets
- ✅ CLI scaffold (`init`, `add`, `list`)
- ✅ Bundled JSON registry pipeline
- ✅ Component triad shape locked in
- ✅ CSS-variable token cascade theming pattern
- ✅ Ship `assess` as the first complete triad
- ✅ Next.js 16 + React 19 + Tailwind v4 example app

### Phase 2 — Catalog completion

- [ ] Extend `assess` to cover all merged field types (textarea, number, email, url, date, validation)
- [x] Ship `decide`
- [ ] Ship `rank`
- [ ] Ship `approve` (narrowed scope)
- [ ] Ship `annotate`
- [ ] Ship `disambiguate`
- [ ] Ship `calibrate`
- [ ] Adapter packages: Vercel AI SDK, CopilotKit
- [ ] First public release on npm

### Phase 3 — Ecosystem

- [ ] Hosted registry (`registry.hitl-ui.dev`) — drop-in via the existing `--registry` flag
- [ ] Message-embedded rendering mode (Model B)
- [ ] Docs site with live component playground
- [ ] Vue / Svelte / Solid framework adapters (demand-gated)
- [ ] A2UI catalog mode — register the React components as A2UI catalog entries

### Phase 4 — Agent intelligence

- [ ] Composable instruction files (combine multiple component instructions)
- [ ] Usage analytics (track which components agents pick most)
- [ ] A/B testing for instruction phrasings
- [ ] CLI-side token-detection / theme injection (the deferred v0.1 idea)

---

## Positioning

**hitl-ui is complementary to, not competitive with:**
- **Generative UI protocols** (Adaptive Cards, Slack Block Kit, Google A2UI) — they ship primitive catalogs; hitl-ui ships opinionated patterns built on top of them. Future convergence: hitl-ui components can be registered as A2UI catalog entries.
- **Agent runtimes** (CopilotKit, Vercel AI SDK, LangGraph, OpenAI Assistants) — they ship the agent ↔ React ↔ user wiring; hitl-ui ships the components that fill the render slot. Adapter packages (Phase 2) make integration ~5 lines.
- **Headless behavior libraries** (react-hook-form, Radix) — already used internally (Radix). hitl-ui sits one layer up: opinionated, scenario-specific composition of those primitives.

**hitl-ui's differentiator:** the instruction prose. Every component ships with battle-tested guidance about *when* to invoke it, *how* to phrase the user's prompt, and *what* anti-patterns to avoid. That guidance is what every developer would otherwise spend a quarter discovering by trial-and-error in production. The components are table stakes; the instructions are the IP.
