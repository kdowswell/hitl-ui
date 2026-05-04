import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Decide } from "./decide";

const meta = {
  title: "Patterns/Decide",
  component: Decide,
  parameters: {
    docs: {
      description: {
        component:
          "Cognitive op: **decide**. Present 2–5 options for the human to pick between, optionally with per-criterion scoring. Two modes: `select` (option cards, one pick) and `score` (matrix grid with weighted totals).",
      },
    },
  },
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof Decide>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Minimal — two-option select, no criteria.
 * ------------------------------------------------------------------------- */
export const Minimal: Story = {
  args: {
    title: "Bun or pnpm?",
    description: "Pick the package manager for the new repo.",
    mode: "select",
    options: [
      { id: "bun", label: "Bun" },
      { id: "pnpm", label: "pnpm" },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * SelectWithDescriptions — realistic option cards with descriptions and
 * criteria displayed as context bullets.
 * ------------------------------------------------------------------------- */
export const SelectWithDescriptions: Story = {
  args: {
    title: "Which database for the events pipeline?",
    description: "Pick the storage layer; I'll generate the schema and migrations next.",
    mode: "select",
    options: [
      {
        id: "pg",
        label: "PostgreSQL",
        description:
          "Battle-tested, strong consistency, JSONB for flexible payloads. Self-hosted or Neon/Supabase.",
      },
      {
        id: "ch",
        label: "ClickHouse",
        description:
          "Columnar, optimized for analytics queries on huge event volumes. Steeper ops curve.",
      },
      {
        id: "ddb",
        label: "DynamoDB",
        description:
          "Managed, scales horizontally, single-digit-ms latency for keyed lookups. Limited query flexibility.",
      },
    ],
    criteria: [
      { id: "ops", label: "Ops burden" },
      { id: "cost", label: "Cost at scale" },
      { id: "query", label: "Query flexibility" },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * ScoreMatrix — full score-mode matrix with weighted criteria. Real-time
 * winner highlight.
 * ------------------------------------------------------------------------- */
export const ScoreMatrix: Story = {
  args: {
    title: "Score each database against the criteria",
    description:
      "Adjust the per-criterion scores. Weighted totals update live; the highest total is highlighted as the suggested winner.",
    mode: "score",
    scale_steps: 5,
    options: [
      { id: "pg", label: "PostgreSQL" },
      { id: "ch", label: "ClickHouse" },
      { id: "ddb", label: "DynamoDB" },
    ],
    criteria: [
      { id: "cost", label: "Cost", weight: 2 },
      { id: "speed", label: "Query speed", weight: 3 },
      { id: "ops", label: "Ops burden", weight: 2 },
      { id: "team_fit", label: "Team familiarity", weight: 1 },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * MaximumOptions — five options, the spec's max. Stress-test layout.
 * ------------------------------------------------------------------------- */
export const MaximumOptions: Story = {
  args: {
    title: "Pick a frontend framework",
    description: "Five candidates; pick one and I'll scaffold a starter.",
    mode: "select",
    options: [
      { id: "next", label: "Next.js", description: "React + server components + App Router." },
      { id: "remix", label: "Remix", description: "React + nested routing + form-first." },
      { id: "svelte", label: "SvelteKit", description: "Smaller bundle, less ceremony." },
      { id: "solid", label: "SolidStart", description: "Fine-grained reactivity, JSX." },
      { id: "vite", label: "Plain Vite + React", description: "No framework opinions." },
    ],
  },
};
