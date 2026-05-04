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
          "Cognitive op: **decide**. Two modes: `select` (option cards, one pick) and `score` (pre-scored matrix the agent fills in for the human to verify). In score mode the agent does the analysis up front — every cell carries a value, rationale, and optional citations.",
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
 * ScoreMatrix — full pre-scored matrix with weighted criteria, agent
 * findings, per-cell rationale, and citations. Click a cell to inspect.
 * ------------------------------------------------------------------------- */
export const ScoreMatrix: Story = {
  args: {
    title: "Database for the events pipeline",
    description: "Three candidates scored against your stated requirements.",
    findings:
      "All three handle 1B events/month. ClickHouse wins on raw query speed but adds operational burden your team hasn't run before. PostgreSQL is the safe-default; DynamoDB is cheapest at steady-state but locks you into AWS and limits ad-hoc queries.\n\nMy lean: PostgreSQL unless analytics-style queries dominate.",
    mode: "score",
    scale_steps: 5,
    options: [
      {
        id: "pg",
        label: "PostgreSQL",
        description: "Self-hosted on RDS or via Neon/Supabase.",
        scores: {
          cost: {
            value: 4,
            rationale:
              "RDS db.r6g.xlarge runs ~$340/mo at the size you'd need; Neon's autoscale tier comes in lower for spiky workloads.",
            sources: [
              {
                title: "AWS RDS pricing — Postgres",
                url: "https://aws.amazon.com/rds/postgresql/pricing/",
              },
            ],
          },
          speed: {
            value: 3,
            rationale:
              "Strong on point queries; analytics aggregations on 1B rows require careful indexing or a materialized-view layer.",
            sources: [
              {
                title: "Postgres BRIN index docs",
                url: "https://www.postgresql.org/docs/current/brin.html",
              },
            ],
          },
          ops: {
            value: 4,
            rationale:
              "Your team has prior Postgres experience and on-call runbooks. Managed offerings remove most pager risk.",
          },
          team_fit: {
            value: 5,
            rationale: "Already in the stack; SQL skill is universal on the team.",
          },
        },
      },
      {
        id: "ch",
        label: "ClickHouse",
        description: "Columnar OLAP — ClickHouse Cloud or self-hosted.",
        scores: {
          cost: {
            value: 3,
            rationale:
              "ClickHouse Cloud starts ~$300/mo at the volume in question; self-hosted is cheaper but adds ops cost.",
            sources: [{ title: "ClickHouse Cloud pricing", url: "https://clickhouse.com/pricing" }],
          },
          speed: {
            value: 5,
            rationale:
              "Order-of-magnitude faster than Postgres on aggregation queries over event-style data per published benchmarks.",
            sources: [
              {
                title: "ClickHouse vs Postgres benchmark",
                url: "https://benchmark.clickhouse.com/",
              },
            ],
          },
          ops: {
            value: 2,
            rationale:
              "New to your team; merge-tree tuning and replica topology have a learning curve. Cloud removes some of this.",
          },
          team_fit: {
            value: 2,
            rationale:
              "No prior production experience on the team; SQL dialect differs from Postgres in non-obvious ways.",
          },
        },
      },
      {
        id: "ddb",
        label: "DynamoDB",
        description: "Managed key-value / document store.",
        scores: {
          cost: {
            value: 5,
            rationale:
              "On-demand pricing tracks usage closely; cheapest at steady write rates if you stay within a sensible access pattern.",
            sources: [
              { title: "DynamoDB pricing", url: "https://aws.amazon.com/dynamodb/pricing/" },
            ],
          },
          speed: {
            value: 3,
            rationale:
              "Single-digit-ms reads for keyed lookups; aggregation queries require streaming to a separate analytics store.",
          },
          ops: {
            value: 5,
            rationale: "Fully managed, no patching/backups to run.",
          },
          team_fit: {
            value: 3,
            rationale: "AWS shop; team has used Dynamo for other features but not at this scale.",
          },
        },
      },
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
