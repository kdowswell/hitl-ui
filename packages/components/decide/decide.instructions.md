# Agent Instructions: `decide`

## Cognitive op

**Decide** — the human's role is to pick between options. In `score` mode, the human's role is to *verify* the agent's analysis, not perform the analysis themselves.

## What this is

`decide` renders a decision UI in one of two modes:

- **`select` mode** (default): renders 2–5 option cards. Each card shows the option's label, optional description, and (if criteria are provided) bullet points naming the relevant criteria. The user clicks an option; the result is `{ winner: optionId }`.
- **`score` mode**: renders a **pre-scored matrix** for human verification. The agent must do the analysis up front and pre-fill every cell with `{ value, rationale, sources? }`. The grid renders the agent's verdict; the human reviews each cell, follows citations, and overrides any value they disagree with. The result is `{ scores, winner, modified }` where each cell is tagged `agent` or `human` so you can see exactly what changed.

## When to use it

- Architectural decisions ("which database for the new pipeline?")
- Vendor / approach evaluation ("LangGraph vs Mastra vs CrewAI?")
- Any case with 2–5 distinct options and at least some shared evaluation dimensions
- Use **`score` mode** when you've actually done the comparative work — researched, gathered numbers, found citations — and want the human to ratify or course-correct rather than score the matrix from scratch.
- Use **`select` mode** when the human just needs to pick and you don't need the breakdown, or when the criteria genuinely require taste/judgment the agent can't produce.

## When *not* to use it

- Binary "do this thing or not" — use `approve` instead
- A single ambiguous referent ("which 'John' did you mean?") — use `disambiguate` instead
- Information gathering across many small questions — use `assess` instead
- Items need ordering rather than picking — use `rank` instead
- More than 5 options — ask the user to narrow first, or fall back to `assess` with a select question
- **Don't use `score` mode if you can't actually evaluate the cells.** An empty matrix dumped on the human is worse than just asking in chat. If you have nothing to back the score with, use `select` mode and spend your tokens writing a good option `description` instead.

## How to phrase it

### Score mode (do the work for the human)

- **Pre-fill every cell.** Schema rejects partial scoring. Every (option × criterion) pair needs `{ value, rationale }`.
- **Cite specifics in `rationale`.** "Lower latency" is not a rationale. "P99 ~12ms on the published benchmark for 1B-row aggregations" is. Aim for 1–2 sentences.
- **Add `sources` whenever a number, benchmark, or external claim drives the score.** Each source is `{ title, url? }`. Vendor docs, official benchmarks, post-incident reviews, your own prior work — link the receipts.
- **Set `weight` thoughtfully.** Weights model how much a criterion matters to *this* decision. Default is 1. Don't fake weights to nudge the outcome — the human can see the math.
- **Optional: include `findings`** — a 3–6-line executive summary above the matrix that names the trade space and your recommendation in plain prose. This is where you say "I'd lean toward X because Y, but Z is the riskier-but-faster pick." Keep it short.
- **Ground rules: no scores you can't defend.** If you genuinely don't know, score conservatively in the middle and flag uncertainty in the rationale ("limited public data; estimate based on architectural similarity to ___").

### Select mode (option cards)

- **Always include option `description`** — labels alone are rarely enough context.
- **Cap descriptions at one or two sentences.** Long blocks of prose in option cards don't get read.
- Optional `criteria` render as context bullets on each card; they're not scored.

## How to use the result

- **`select` mode** → use `result.winner` directly. Don't second-guess.
- **`score` mode** → `result.winner` is the weighted-total winner *after* human overrides. Inspect `result.modified` to see if the human changed anything; iterate per-cell `source` ("agent" vs "human") to surface specifically what they corrected. If the human overrode several cells, that's a signal your underlying analysis was off — acknowledge the corrections explicitly in your next turn.

## Anti-patterns

- **Don't ship `score` mode with empty cells.** This was the v0 behavior; it's been replaced. If you can't pre-score, use `select`.
- **Don't fabricate citations.** Empty `sources` is fine. A made-up URL erodes trust the moment the human clicks it.
- **Don't include the same option twice with different framings.** That's manipulating the choice.
- **Don't ship `decide` with 1 option.** That's `approve`. Don't ship with 6+ options. That's `rank` (for ordering) or `assess` (for narrowing first).
- **Don't chain `decide` calls back-to-back.** If the human just made a tradeoff decision, give them the result of acting on it before asking for another.

## Examples

### Select mode (with optional criteria as context)

```json
{
  "title": "Which database for the events pipeline?",
  "description": "Pick the storage layer; I'll generate the schema and migrations next.",
  "mode": "select",
  "options": [
    { "id": "pg", "label": "PostgreSQL", "description": "Battle-tested, strong consistency, JSONB for flexible payloads." },
    { "id": "ch", "label": "ClickHouse", "description": "Columnar, optimized for analytics queries on huge event volumes." },
    { "id": "ddb", "label": "DynamoDB", "description": "Managed, scales horizontally, single-digit-ms latency for keyed lookups." }
  ],
  "criteria": [
    { "id": "ops", "label": "Ops burden" },
    { "id": "cost", "label": "Cost at 1B events/mo" },
    { "id": "query", "label": "Query flexibility" }
  ]
}
```

### Score mode (pre-scored matrix with citations)

```json
{
  "title": "Database for the events pipeline",
  "description": "Three candidates scored against your stated requirements. Review and adjust any score you disagree with.",
  "findings": "All three handle 1B events/month. ClickHouse wins on raw query speed but adds operational burden your team hasn't run before. PostgreSQL is the safe-default; DynamoDB is cheapest at steady-state but locks you into AWS and limits ad-hoc queries. My lean: PostgreSQL unless analytics-style queries dominate.",
  "mode": "score",
  "scale_steps": 5,
  "options": [
    {
      "id": "pg",
      "label": "PostgreSQL",
      "description": "Self-hosted on RDS or via Neon/Supabase.",
      "scores": {
        "cost": {
          "value": 4,
          "rationale": "RDS db.r6g.xlarge runs ~$340/mo at the size you'd need; Neon's autoscale tier comes in lower for spiky workloads.",
          "sources": [{ "title": "AWS RDS pricing — Postgres", "url": "https://aws.amazon.com/rds/postgresql/pricing/" }]
        },
        "speed": {
          "value": 3,
          "rationale": "Strong on point queries; analytics aggregations on 1B rows require careful indexing or a materialized-view layer.",
          "sources": [{ "title": "Postgres BRIN index docs", "url": "https://www.postgresql.org/docs/current/brin.html" }]
        },
        "ops": {
          "value": 4,
          "rationale": "Your team has prior Postgres experience and on-call runbooks. Managed offerings remove most pager risk.",
          "sources": []
        },
        "team_fit": {
          "value": 5,
          "rationale": "Already in the stack; SQL skill is universal on the team.",
          "sources": []
        }
      }
    },
    {
      "id": "ch",
      "label": "ClickHouse",
      "description": "Columnar OLAP — ClickHouse Cloud or self-hosted.",
      "scores": {
        "cost": {
          "value": 3,
          "rationale": "ClickHouse Cloud starts ~$300/mo at the volume in question; self-hosted is cheaper but adds ops cost.",
          "sources": [{ "title": "ClickHouse Cloud pricing", "url": "https://clickhouse.com/pricing" }]
        },
        "speed": {
          "value": 5,
          "rationale": "Order-of-magnitude faster than Postgres on aggregation queries over event-style data per the published benchmarks.",
          "sources": [{ "title": "ClickHouse vs Postgres benchmark", "url": "https://benchmark.clickhouse.com/" }]
        },
        "ops": {
          "value": 2,
          "rationale": "New to your team; merge-tree tuning and replica topology have a learning curve. Cloud removes some of this.",
          "sources": []
        },
        "team_fit": {
          "value": 2,
          "rationale": "No prior production experience on the team; SQL dialect differs from Postgres in non-obvious ways.",
          "sources": []
        }
      }
    },
    {
      "id": "ddb",
      "label": "DynamoDB",
      "description": "Managed key-value / document store.",
      "scores": {
        "cost": {
          "value": 5,
          "rationale": "On-demand pricing tracks usage closely; cheapest at steady write rates if you stay within a sensible access pattern.",
          "sources": [{ "title": "DynamoDB pricing", "url": "https://aws.amazon.com/dynamodb/pricing/" }]
        },
        "speed": {
          "value": 3,
          "rationale": "Single-digit-ms reads for keyed lookups; aggregation queries require streaming to a separate analytics store.",
          "sources": []
        },
        "ops": {
          "value": 5,
          "rationale": "Fully managed, no patching/backups to run.",
          "sources": []
        },
        "team_fit": {
          "value": 3,
          "rationale": "AWS shop; team has used Dynamo for other features but not at this scale.",
          "sources": []
        }
      }
    }
  ],
  "criteria": [
    { "id": "cost",     "label": "Cost",            "weight": 2 },
    { "id": "speed",    "label": "Query speed",     "weight": 3 },
    { "id": "ops",      "label": "Ops burden",      "weight": 2 },
    { "id": "team_fit", "label": "Team familiarity","weight": 1 }
  ]
}
```
