import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Decide } from "./decide";
import { decideParamsSchema } from "./decide.types";

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const cell = (value: number, rationale = "because reasons") => ({ value, rationale });

const validScoreOptions = [
  {
    id: "a",
    label: "A",
    scores: {
      cost: cell(5),
      speed: cell(1),
    },
  },
  {
    id: "b",
    label: "B",
    scores: {
      cost: cell(2),
      speed: cell(5),
    },
  },
];

const validScoreCriteria = [
  { id: "cost", label: "Cost", weight: 2 },
  { id: "speed", label: "Speed", weight: 1 },
];

/* ---------------------------------------------------------------------------
 * Schema
 * ------------------------------------------------------------------------- */

describe("decide Zod schema", () => {
  it("accepts a valid select-mode payload", () => {
    const result = decideParamsSchema.safeParse({
      title: "Pick one",
      mode: "select",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 options", () => {
    const result = decideParamsSchema.safeParse({
      title: "T",
      options: [{ id: "a", label: "A" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 options", () => {
    const result = decideParamsSchema.safeParse({
      title: "T",
      options: Array.from({ length: 6 }, (_, i) => ({ id: `o${i}`, label: `O${i}` })),
    });
    expect(result.success).toBe(false);
  });

  it("rejects score mode without criteria", () => {
    const result = decideParamsSchema.safeParse({
      title: "T",
      mode: "score",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects score mode without per-cell pre-fills", () => {
    const result = decideParamsSchema.safeParse({
      title: "T",
      mode: "score",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      criteria: [{ id: "c1", label: "Cost" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects pre-scores outside [1, scale_steps]", () => {
    const result = decideParamsSchema.safeParse({
      title: "T",
      mode: "score",
      scale_steps: 5,
      options: [
        { id: "a", label: "A", scores: { c1: cell(99) } },
        { id: "b", label: "B", scores: { c1: cell(2) } },
      ],
      criteria: [{ id: "c1", label: "Cost" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fully pre-scored payload", () => {
    const result = decideParamsSchema.safeParse({
      title: "T",
      mode: "score",
      options: validScoreOptions,
      criteria: validScoreCriteria,
    });
    expect(result.success).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
 * Select mode component
 * ------------------------------------------------------------------------- */

describe("Decide component — select mode", () => {
  const baseProps = {
    title: "Pick one",
    onSubmit: vi.fn(),
  };

  it("renders option cards with descriptions", () => {
    render(
      <Decide
        {...baseProps}
        mode="select"
        options={[
          { id: "pg", label: "PostgreSQL", description: "Battle-tested." },
          { id: "ch", label: "ClickHouse", description: "Columnar." },
        ]}
      />,
    );
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("Battle-tested.")).toBeInTheDocument();
    expect(screen.getByText("ClickHouse")).toBeInTheDocument();
    expect(screen.getByText("Columnar.")).toBeInTheDocument();
  });

  it("disables submit until an option is selected", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Decide
        {...baseProps}
        onSubmit={onSubmit}
        options={[
          { id: "a", label: "Apple" },
          { id: "b", label: "Banana" },
        ]}
      />,
    );
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /Apple/ }));
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ winner: "a" });
  });

  it("renders criteria as bullets when provided in select mode", () => {
    render(
      <Decide
        {...baseProps}
        options={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ]}
        criteria={[
          { id: "c1", label: "Cost" },
          { id: "c2", label: "Speed" },
        ]}
      />,
    );
    const aCard = screen.getByRole("radio", { name: /A/ });
    expect(within(aCard).getByText(/Cost/)).toBeInTheDocument();
    expect(within(aCard).getByText(/Speed/)).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------------------------
 * Score mode component
 * ------------------------------------------------------------------------- */

describe("Decide component — score mode", () => {
  const baseProps = {
    title: "Score them",
    mode: "score" as const,
    onSubmit: vi.fn(),
    options: validScoreOptions,
    criteria: validScoreCriteria,
    scale_steps: 5,
  };

  it("renders the agent's pre-fill in every cell", () => {
    render(<Decide {...baseProps} />);
    // 2 options × 2 criteria = 4 cells, each rendered as a button labeled "{x}/{max}"
    const aRow = screen.getByRole("row", { name: /A/ });
    expect(within(aRow).getByRole("button", { name: /A on Cost: 5 of 5/ })).toBeInTheDocument();
    expect(within(aRow).getByRole("button", { name: /A on Speed: 1 of 5/ })).toBeInTheDocument();
  });

  it("computes weighted totals from the pre-fill and highlights the winner", () => {
    render(<Decide {...baseProps} />);
    // A: 5×2 + 1×1 = 11, B: 2×2 + 5×1 = 9 → A wins
    const aRow = screen.getByRole("row", { name: /A/ });
    expect(within(aRow).getByText("11")).toBeInTheDocument();
    expect(within(aRow).getByLabelText("suggested winner")).toBeInTheDocument();
  });

  it("renders the agent's findings when provided", () => {
    render(<Decide {...baseProps} findings="A wins on cost. B wins on speed." />);
    expect(screen.getByText(/A wins on cost\. B wins on speed\./)).toBeInTheDocument();
  });

  it("submits the matrix tagged with sources and modified=false on first submit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Decide {...baseProps} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Confirm scoring" }));
    expect(onSubmit).toHaveBeenCalledWith({
      winner: "a",
      modified: false,
      scores: {
        a: { cost: { value: 5, source: "agent" }, speed: { value: 1, source: "agent" } },
        b: { cost: { value: 2, source: "agent" }, speed: { value: 5, source: "agent" } },
      },
    });
  });

  it("lets the human override a cell and reflects it in submit + winner", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Decide {...baseProps} onSubmit={onSubmit} />);

    // Open the A · Cost cell, then click "1" to drop A's cost score.
    await user.click(screen.getByRole("button", { name: /A on Cost: 5 of 5/ }));
    const stepper = screen.getByRole("radiogroup", { name: "Override score" });
    await user.click(within(stepper).getByRole("radio", { name: "1" }));

    // Now A: 1×2 + 1×1 = 3, B: 2×2 + 5×1 = 9 → B wins
    await user.click(screen.getByRole("button", { name: "Confirm with overrides" }));
    expect(onSubmit).toHaveBeenCalledWith({
      winner: "b",
      modified: true,
      scores: {
        a: { cost: { value: 1, source: "human" }, speed: { value: 1, source: "agent" } },
        b: { cost: { value: 2, source: "agent" }, speed: { value: 5, source: "agent" } },
      },
    });
  });

  it("surfaces rationale + citation when a cell is selected", async () => {
    const user = userEvent.setup();
    render(
      <Decide
        {...baseProps}
        options={[
          {
            id: "a",
            label: "A",
            scores: {
              cost: {
                value: 4,
                rationale: "Benchmark says A is cheap at scale.",
                sources: [{ title: "A docs", url: "https://example.com/a" }],
              },
              speed: cell(3),
            },
          },
          { id: "b", label: "B", scores: { cost: cell(2), speed: cell(5) } },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /A on Cost: 4 of 5/ }));
    expect(screen.getByText("Benchmark says A is cheap at scale.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A docs" })).toHaveAttribute(
      "href",
      "https://example.com/a",
    );
  });
});
