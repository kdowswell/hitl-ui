# Agent Instructions: `decide`

## Cognitive op

**Decide** — the human's role is to pick between options, optionally with explicit per-criterion scoring.

## What this is

`decide` renders a decision UI in one of two modes:

- **`select` mode** (default): renders 2–5 option cards. Each card shows the option's label, optional description, and (if criteria are provided) bullet points naming the relevant criteria. The user clicks an option; the result is `{ winner: optionId }`.
- **`score` mode**: renders a matrix grid with options as rows and 1–6 criteria as columns. Each cell takes a 1–N rating (default 1–5). Weighted totals are shown per option in real time; the highest-total option is highlighted as the suggested winner. The result is `{ scores: { [optionId]: { [criterionId]: number } }, winner: optionId }`.

## When to use it

- Architectural decisions ("which database for the new pipeline?")
- Vendor / approach evaluation ("LangGraph vs Mastra vs CrewAI?")
- Any case with 2–5 distinct options and at least some shared evaluation dimensions
- Use **`score` mode** when you want the human to commit to an explicit weighting and you'll use the per-criterion scores in your next reasoning step
- Use **`select` mode** when the human just needs to pick and you don't need the breakdown

## When *not* to use it

- Binary "do this thing or not" — use `approve` instead
- A single ambiguous referent ("which 'John' did you mean?") — use `disambiguate` instead
- Information gathering across many small questions — use `assess` instead
- Items need ordering rather than picking — use `rank` instead
- More than 5 options — ask the user to narrow first, or fall back to `assess` with a select question

## How to phrase it

- **Always include option `description`** — labels alone are rarely enough context for a real decision.
- **Pre-fill criteria you can evaluate**, leave human-judgment criteria for the human. The human's value-add is the calls that need taste, ethics, or domain context — not benchmarks you could already run.
- **Set `weight`** when criteria really do differ in importance. Default weight is 1 (equal weighting). Don't fake weights to nudge an outcome.
- **Cap descriptions at one or two sentences.** Long blocks of prose in option cards don't get read.

## How to use the result

- **`select` mode** → use `result.winner` directly as the chosen option id. Don't second-guess the choice.
- **`score` mode** → `result.winner` is the weighted-total winner. The full `result.scores` matrix is available if you need to reason about the decision (e.g., "we picked X because of Y, even though Z scored higher on cost"). Don't override the winner without surfacing the scores back to the user.

## Anti-patterns

- **Don't use `score` mode for trivial decisions.** Asking the human to fill in 12 cells just to pick which package manager to use is friction, not value. Use `select` mode unless the per-criterion breakdown matters downstream.
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

### Score mode (full matrix)

```json
{
  "title": "Score each database against our criteria",
  "description": "I've pre-filled scores I can evaluate; please adjust any that look off and add scores for the human-judgment ones.",
  "mode": "score",
  "scale_steps": 5,
  "options": [
    { "id": "pg",  "label": "PostgreSQL" },
    { "id": "ch",  "label": "ClickHouse" },
    { "id": "ddb", "label": "DynamoDB" }
  ],
  "criteria": [
    { "id": "cost",     "label": "Cost",            "weight": 2 },
    { "id": "speed",    "label": "Query speed",     "weight": 3 },
    { "id": "ops",      "label": "Ops burden",      "weight": 2 },
    { "id": "team_fit", "label": "Team familiarity","weight": 1 }
  ]
}
```
