# Agent Instructions: `assess`

## Cognitive op

**Provide info** — the human's role is to fill structured slots so you can proceed.

## What this is

`assess` renders a structured assessment with 1–8 mixed-type questions. The user answers in one shot and you receive a typed JSON object as the tool result.

Supported field types:

| Type | Renders as | Returns |
|---|---|---|
| `text`         | Single-line text input         | `string` |
| `textarea`     | Multi-line text input          | `string` |
| `select`       | Dropdown (single choice)       | `string` |
| `multi_select` | Checkbox group (many choices)  | `string[]` |
| `scale`        | Segmented 1–N selector         | `number` |
| `boolean`      | Toggle switch                  | `boolean` |
| `number`       | Numeric input (with min/max)   | `number` |
| `email`        | Email input (with validation)  | `string` |
| `url`          | URL input (with validation)    | `string` |
| `date`         | Date picker                    | `string` (ISO `YYYY-MM-DD`) |

## When to use it

- You need 2–8 related answers before you can proceed with confidence.
- The questions are heterogeneous enough that a single chat reply would be hard to parse reliably.
- The answers will directly shape your next action (a plan, a generation, a write).

## When *not* to use it

- You only need one answer — just ask in the chat.
- You need open-ended exploration — let the user talk freely.
- The decision is binary "do this thing or not" — use `approve` instead.
- Items need ordering by priority — use `rank` instead.
- You need to weigh tradeoffs across explicit criteria — use `decide` instead.
- You're disambiguating between similar candidates — use `disambiguate` instead.
- You're refining a draft the agent produced — use `annotate` instead.

## How to phrase questions

- **Always fill in the `description` field.** Tell the user *why* you're asking right now. Without context, the assessment feels like a quiz.
- **Front-load the easiest questions.** A user who is half-way through is more likely to finish than one who hits a hard question first.
- **Use `select` when options are known.** Use `text` only when you can't reasonably enumerate the answers.
- **Use `textarea` when the answer is multi-sentence prose**, `text` for short single-line answers.
- **Use `scale` for intensity, agreement, or confidence questions.** Provide `scale_min_label` and `scale_max_label` so the endpoints aren't ambiguous.
- **Use `boolean` for clear yes/no.** If "it depends" is a likely answer, use `select` with options like `["Yes", "No", "Sometimes"]` instead.
- **Use `number` with `validation: { min, max }` for bounded numeric input** (counts, ages, port numbers, percentages, etc.).
- **Use `email`, `url`, `date` for typed strings** — the input field provides browser-level validation and appropriate keyboard on mobile.
- **Mark every question `required` unless it is genuinely optional.** Don't make the user infer.

## How to use the result

The result is `{ [questionId]: value }` where `value` matches the question type. Read every answer before proceeding. If the result reveals you asked the wrong question, don't immediately fire another `assess` — explain what you learned, propose next steps in chat, and only re-prompt if there's a concrete gap.

## Anti-patterns

- **Don't chain assessments back-to-back.** If you need 12 answers, redesign — split into a clear plan and ask for one batch at a time across multiple turns.
- **Don't ask things you could derive from context** (current file path, time, prior messages).
- **Don't use `assess` to confirm an action.** That's `approve`.
- **Don't ask for an essay in a `text` field.** Use `textarea` for prose, or move to chat for truly open-ended input.
- **Don't fit a square peg into a round hole.** If your need doesn't match assess (or any other hitl-ui pattern), say so in chat and ask the user freely.

## Example

A coding agent gathering requirements for a feature flag:

```json
{
  "title": "Feature flag setup",
  "description": "I need a few details to scaffold the flag correctly.",
  "questions": [
    { "id": "name", "type": "text", "prompt": "Flag identifier (kebab-case)", "placeholder": "new-checkout-flow" },
    { "id": "default", "type": "boolean", "prompt": "Default state ON for new users?" },
    { "id": "rollout", "type": "select", "prompt": "Rollout strategy", "options": ["All users", "Internal only", "Percentage"] },
    { "id": "percent", "type": "number", "prompt": "Initial rollout percent (0-100)", "validation": { "min": 0, "max": 100 } },
    { "id": "expires", "type": "date", "prompt": "Auto-disable date (optional)", "required": false },
    { "id": "audience", "type": "multi_select", "prompt": "Which audiences should see it?", "options": ["Free", "Pro", "Team", "Enterprise"] },
    { "id": "confidence", "type": "scale", "prompt": "How confident are you in the default state?", "scale_min_label": "Guessing", "scale_max_label": "Certain", "scale_steps": 5 }
  ]
}
```
