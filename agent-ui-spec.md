# agent-ui

Portable, agent-invoked UI components for human-in-the-loop workflows. shadcn-style install. Ship the component, the tool definition, and the agent instructions together.

## What This Is

When an agent needs structured input from a human mid-workflow, developers either build bespoke UI every time or fall back to "please type your answer." Neither scales.

agent-ui is a component library where each piece is a **triad**:

1. **UI Component** — React, Tailwind, fully owned after install
2. **Tool Definition** — JSON schema the agent uses to invoke the component
3. **Agent Instruction** — Markdown that teaches the agent *when* and *how* to use it

The instruction file is the differentiator. Developers can find form components anywhere. What they can't find is opinionated, tested guidance on how agents should interact with humans during structured workflows.

---

## Project Architecture

### Tech Stack

- **React 18+** with TypeScript
- **Tailwind CSS** for styling (utility classes only, no compiler dependency)
- **Radix UI primitives** for accessible base components (consistent with shadcn ecosystem)
- **Zod** for runtime validation of tool call parameters
- **Commander** for the CLI

### Install Model

shadcn-style: no monolithic dependency. The CLI copies source files into the developer's project. They own the code after install.

```bash
npx agent-ui@latest init       # scaffolds config, installs base deps
npx agent-ui@latest add assess # adds the assessment component triad
npx agent-ui@latest add decide # adds the decision matrix component
npx agent-ui@latest add rank   # adds the priority ranking component
npx agent-ui@latest add approve # adds the review gate component
npx agent-ui@latest add collect # adds the dynamic form component
```

### Output Structure

After `npx agent-ui@latest add assess`, the developer gets:

```
components/
  agent-ui/
    assess/
      assess.tsx                # React component
      assess.tool.json          # Tool definition (JSON schema)
      assess.instructions.md    # Agent usage guide
      assess.types.ts           # Shared TypeScript types
      index.ts                  # Barrel export
```

### Config File

`agent-ui.config.ts` created during `init`:

```typescript
import { defineConfig } from 'agent-ui';

export default defineConfig({
  // Where components are installed
  componentsDir: 'components/agent-ui',

  // Where tool definitions are copied for agent consumption
  toolsDir: 'tools/agent-ui',

  // Where instruction files are copied
  instructionsDir: 'instructions/agent-ui',

  // Tailwind CSS path for style injection
  tailwindConfig: 'tailwind.config.ts',

  // Framework adapter: 'tool-call' | 'message-embed'
  renderMode: 'tool-call',
});
```

---

## Repo Structure

```
agent-ui/
├── README.md
├── CLAUDE.md                    # Instructions for Claude Code when working on this repo
├── LICENSE                      # MIT
├── package.json
├── tsconfig.json
├── turbo.json                   # Monorepo orchestration
│
├── packages/
│   ├── cli/                     # The npx installer CLI
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── commands/
│   │   │   │   ├── init.ts      # Scaffold config and deps
│   │   │   │   ├── add.ts       # Install a component triad
│   │   │   │   └── list.ts      # Show available components
│   │   │   ├── utils/
│   │   │   │   ├── config.ts    # Read/write agent-ui.config.ts
│   │   │   │   ├── registry.ts  # Component registry and metadata
│   │   │   │   └── install.ts   # File copy and transform logic
│   │   │   └── templates/
│   │   │       └── config.ts    # Default config template
│   │   └── package.json
│   │
│   └── components/              # Source component triads
│       ├── assess/
│       │   ├── assess.tsx
│       │   ├── assess.tool.json
│       │   ├── assess.instructions.md
│       │   ├── assess.types.ts
│       │   ├── index.ts
│       │   └── meta.json        # CLI metadata (name, description, deps)
│       ├── decide/
│       ├── rank/
│       ├── approve/
│       └── collect/
│
├── apps/
│   └── docs/                    # Documentation site (optional, later)
│       └── ...
│
├── examples/
│   ├── nextjs-tool-call/        # Example: Next.js app with tool-call rendering
│   └── vercel-ai-sdk/           # Example: Vercel AI SDK integration
│
└── .github/
    └── workflows/
        ├── ci.yml               # Lint, type-check, test
        └── release.yml          # Publish to npm
```

---

## Component Specifications

### 1. `assess` — Structured Assessment

**Purpose:** Present multiple related questions with mixed input types. Use when the agent needs structured answers that will directly shape its next action.

**Tool Definition Schema:**

```json
{
  "name": "assess",
  "description": "Present a structured assessment to the user with multiple questions of varying types. Use when you need answers to 2-8 related questions before proceeding.",
  "parameters": {
    "type": "object",
    "required": ["title", "questions"],
    "properties": {
      "title": {
        "type": "string",
        "description": "Short title for the assessment"
      },
      "description": {
        "type": "string",
        "description": "Context for why these questions matter right now"
      },
      "questions": {
        "type": "array",
        "minItems": 1,
        "maxItems": 8,
        "items": {
          "type": "object",
          "required": ["id", "type", "prompt"],
          "properties": {
            "id": { "type": "string" },
            "type": { "enum": ["text", "select", "multi_select", "scale", "boolean"] },
            "prompt": { "type": "string" },
            "options": { "type": "array", "items": { "type": "string" } },
            "scale_min_label": { "type": "string" },
            "scale_max_label": { "type": "string" },
            "scale_steps": { "type": "number", "default": 5 },
            "required": { "type": "boolean", "default": true },
            "placeholder": { "type": "string" }
          }
        }
      }
    }
  }
}
```

**Agent Instruction Highlights:**
- Use when you need 2-8 related answers
- Don't chain multiple assessments back to back
- Use `select` when options are known, `text` when they aren't
- Always explain *why* you're asking via the description field
- Front-load the easiest questions
- Don't ask questions you could answer from context

**UI Behavior:**
- Renders as a card with title, description, and stacked question fields
- Submit button disabled until all required fields are answered
- Returns structured JSON as the tool result
- Supports keyboard navigation (tab between fields, enter to submit)
- Dark mode aware via Tailwind

---

### 2. `decide` — Decision Matrix

**Purpose:** Present options with evaluation dimensions. The human scores or selects. Great for architectural decisions where the agent needs human judgment on non-technical factors.

**Tool Definition Schema:**

```json
{
  "name": "decide",
  "description": "Present a decision matrix with options and evaluation criteria. Use when the human needs to weigh tradeoffs between 2-5 options across multiple dimensions.",
  "parameters": {
    "type": "object",
    "required": ["title", "options", "criteria"],
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "options": {
        "type": "array",
        "minItems": 2,
        "maxItems": 5,
        "items": {
          "type": "object",
          "required": ["id", "label"],
          "properties": {
            "id": { "type": "string" },
            "label": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      },
      "criteria": {
        "type": "array",
        "minItems": 1,
        "maxItems": 6,
        "items": {
          "type": "object",
          "required": ["id", "label"],
          "properties": {
            "id": { "type": "string" },
            "label": { "type": "string" },
            "weight": { "type": "number", "default": 1 }
          }
        }
      },
      "mode": {
        "enum": ["score", "select"],
        "default": "score",
        "description": "'score' shows a matrix grid for scoring each option per criterion. 'select' asks the user to pick a winner."
      }
    }
  }
}
```

**Agent Instruction Highlights:**
- Use for architectural decisions, vendor selection, approach evaluation
- Pre-fill criteria the agent CAN evaluate; leave human-judgment criteria for the human
- In `score` mode, the agent can suggest initial scores and ask the human to adjust
- Don't use for yes/no decisions — use `approve` instead
- Always include option descriptions so the human has context

**UI Behavior:**
- `score` mode: renders as a grid/table, each cell is a 1-5 score input
- `select` mode: renders as option cards the user clicks to choose
- Shows weighted totals in score mode
- Returns the full scored matrix or selected option as tool result

---

### 3. `rank` — Priority Ranking

**Purpose:** Drag-and-drop ordering of items. The agent provides a list and the human arranges it by priority.

**Tool Definition Schema:**

```json
{
  "name": "rank",
  "description": "Ask the user to rank items in priority order via drag-and-drop. Use for backlog prioritization, feature sequencing, or requirement ordering.",
  "parameters": {
    "type": "object",
    "required": ["title", "items"],
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "items": {
        "type": "array",
        "minItems": 2,
        "maxItems": 12,
        "items": {
          "type": "object",
          "required": ["id", "label"],
          "properties": {
            "id": { "type": "string" },
            "label": { "type": "string" },
            "description": { "type": "string" },
            "metadata": { "type": "object" }
          }
        }
      },
      "initial_order": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Optional suggested order by item ID. If omitted, items appear in the order provided."
      }
    }
  }
}
```

**Agent Instruction Highlights:**
- Use when relative priority matters more than absolute scores
- Keep to 12 items max — beyond that, ask the human to group first
- Provide an `initial_order` when you have a suggested ranking so the human can adjust rather than start from scratch
- Include item descriptions when the labels alone are ambiguous
- Don't use when items are independent — use `assess` with scale questions instead

**UI Behavior:**
- Drag-and-drop list with touch and keyboard support
- Numbered positions update in real time
- Optional "reset to suggested order" button when initial_order is provided
- Returns ordered array of item IDs as tool result

---

### 4. `approve` — Review Gate

**Purpose:** Show what the agent is about to do and get explicit approval. The human-in-the-loop checkpoint.

**Tool Definition Schema:**

```json
{
  "name": "approve",
  "description": "Present a plan, diff, or action for human review. Use before executing destructive, expensive, or irreversible operations.",
  "parameters": {
    "type": "object",
    "required": ["title", "content"],
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "content": {
        "type": "object",
        "required": ["type", "body"],
        "properties": {
          "type": {
            "enum": ["plan", "diff", "summary", "custom"],
            "description": "Determines how the body is rendered"
          },
          "body": { "type": "string" },
          "language": {
            "type": "string",
            "description": "For syntax highlighting in diff/custom modes"
          }
        }
      },
      "actions": {
        "type": "array",
        "default": [
          { "id": "approve", "label": "Approve", "style": "primary" },
          { "id": "reject", "label": "Reject", "style": "destructive" }
        ],
        "items": {
          "type": "object",
          "required": ["id", "label"],
          "properties": {
            "id": { "type": "string" },
            "label": { "type": "string" },
            "style": { "enum": ["primary", "secondary", "destructive"] }
          }
        }
      },
      "allow_comment": {
        "type": "boolean",
        "default": true,
        "description": "Show a text field for the human to add context to their decision"
      }
    }
  }
}
```

**Agent Instruction Highlights:**
- Use before deployments, destructive operations, external API calls with side effects
- Always use before actions that cost money
- Show enough context that the human can make an informed decision without asking follow-ups
- Use `diff` type for code changes, `plan` type for multi-step actions, `summary` type for high-level overviews
- If the human rejects, read their comment carefully before proposing an alternative
- Don't use for information gathering — use `assess` or `collect` instead

**UI Behavior:**
- Content area renders markdown, diffs (with syntax highlighting), or plain text
- Action buttons at bottom with optional comment textarea
- Diff mode shows line-by-line additions/removals with color coding
- Plan mode renders a numbered step list with checkboxes
- Returns `{ action: string, comment?: string }` as tool result

---

### 5. `collect` — Dynamic Form

**Purpose:** A flexible, agent-defined form for edge cases that don't fit the other components. The agent specifies fields, types, and validation at invocation time.

**Tool Definition Schema:**

```json
{
  "name": "collect",
  "description": "Render a dynamic form with agent-specified fields. Use as a flexible fallback when other components don't fit. Prefer specific components (assess, decide, rank, approve) when they match the use case.",
  "parameters": {
    "type": "object",
    "required": ["title", "fields"],
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "fields": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "type", "label"],
          "properties": {
            "id": { "type": "string" },
            "type": {
              "enum": ["text", "textarea", "number", "email", "url", "select", "multi_select", "date", "toggle"]
            },
            "label": { "type": "string" },
            "placeholder": { "type": "string" },
            "required": { "type": "boolean", "default": true },
            "options": { "type": "array", "items": { "type": "string" } },
            "validation": {
              "type": "object",
              "properties": {
                "min": { "type": "number" },
                "max": { "type": "number" },
                "pattern": { "type": "string" },
                "message": { "type": "string" }
              }
            },
            "default_value": {}
          }
        }
      },
      "submit_label": {
        "type": "string",
        "default": "Submit"
      }
    }
  }
}
```

**Agent Instruction Highlights:**
- This is the escape hatch — prefer `assess`, `decide`, `rank`, or `approve` when they fit
- Use for onboarding flows, config collection, user profile setup
- Keep forms under 10 fields
- Group related fields logically
- Always provide placeholders for text inputs
- Use validation to prevent round-trips (catch bad input before submission)

**UI Behavior:**
- Renders a vertical form with appropriate input types per field
- Client-side validation with inline error messages
- Submit disabled until all required fields pass validation
- Returns key-value object as tool result

---

## Rendering Architecture

### Model A: Tool-Call Rendering (Default)

The chat framework intercepts the agent's tool call and renders the matching agent-ui component. The user's response is returned as the tool result.

```
Agent → tool_call("assess", { ... }) → Chat Framework → Renders <Assess /> → User submits → tool_result({ ... }) → Agent
```

**Integration point:** The developer registers agent-ui components with their chat framework's tool-call renderer.

```typescript
import { Assess } from '@/components/agent-ui/assess';
import { toolCallRenderer } from '@/lib/chat';

toolCallRenderer.register('assess', Assess);
```

### Model B: Message-Embedded Rendering (Alternative)

The agent emits a fenced code block with a special language tag in its message stream. A renderer in the chat UI detects and swaps in the component.

````
```agent-ui:assess
{
  "title": "Architecture Assessment",
  "questions": [...]
}
```
````

**Tradeoff:** More portable (works with any streaming setup) but less principled. Document as an alternative for teams on simpler stacks.

---

## CLAUDE.md for This Repo

Include a `CLAUDE.md` at root with the following guidance for any agent (Claude Code, Copilot, Cursor) working on this codebase:

```markdown
# CLAUDE.md

## Project Overview
agent-ui is a shadcn-style component library for agent-invoked UI widgets.
Each component is a triad: React component + tool definition + agent instructions.

## Key Principles
- Components are copied into the user's project, not imported from a package
- Every component must ship with a .tool.json and .instructions.md
- UI must work in dark mode, be keyboard navigable, and be accessible
- Tool definitions must validate with Zod at runtime
- Agent instructions are first-class — they are the product, not an afterthought

## Architecture Decisions
- Monorepo with Turborepo (packages/cli, packages/components)
- React 18+, TypeScript strict mode, Tailwind CSS
- Radix UI primitives for accessibility
- Commander for CLI
- Vitest for testing
- Changesets for versioning

## When Adding a New Component
1. Create a new directory under packages/components/{name}/
2. Implement the React component with TypeScript and Tailwind
3. Write the tool definition as a JSON schema in {name}.tool.json
4. Write the agent instruction file in {name}.instructions.md
5. Add meta.json with name, description, and peer dependencies
6. Add the component to the registry in packages/cli/src/utils/registry.ts
7. Write tests for the component AND the tool definition validation
8. Add an example usage to examples/

## Code Style
- Functional components only, no classes
- Props interfaces named {Name}Props
- Use Radix primitives over custom implementations
- Tailwind utility classes only — no custom CSS files
- All components must accept className prop for consumer overrides

## Testing
- Component rendering: Vitest + Testing Library
- Tool definition validation: Zod schema tests
- CLI: Integration tests that verify file output
```

---

## Development Phases

### Phase 1: Foundation
- [ ] Initialize monorepo with Turborepo
- [ ] Build CLI scaffold (init, add, list commands)
- [ ] Implement config file reading/writing
- [ ] Build component registry system
- [ ] Create file copy and transform pipeline
- [ ] Ship `assess` as the first complete triad
- [ ] Write README with install instructions and demo GIF

### Phase 2: Core Components
- [ ] Ship `decide`, `rank`, `approve`, `collect`
- [ ] Add Zod validation layer for all tool definitions
- [ ] Build the tool-call rendering integration helper
- [ ] Create Next.js example app
- [ ] Create Vercel AI SDK example

### Phase 3: Ecosystem
- [ ] Add message-embedded rendering mode (Model B)
- [ ] Build docs site
- [ ] Add component preview/playground
- [ ] Community component contribution guide
- [ ] Framework adapters (Vue, Svelte — if demand exists)

### Phase 4: Agent Intelligence
- [ ] Composable instruction files (combine multiple component instructions)
- [ ] Usage analytics component (track which components agents invoke most)
- [ ] A/B testing support (test different instruction phrasings)
- [ ] Integration with agent-architect skill framework
