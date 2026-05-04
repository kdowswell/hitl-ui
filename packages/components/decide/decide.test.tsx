import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Decide } from "./decide";
import { decideParamsSchema } from "./decide.types";

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

  it("accepts score mode with criteria", () => {
    const result = decideParamsSchema.safeParse({
      title: "T",
      mode: "score",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      criteria: [{ id: "c1", label: "Cost" }],
    });
    expect(result.success).toBe(true);
  });
});

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
    // Each option card should list both criteria.
    const aCard = screen.getByRole("radio", { name: /A/ });
    expect(within(aCard).getByText(/Cost/)).toBeInTheDocument();
    expect(within(aCard).getByText(/Speed/)).toBeInTheDocument();
  });
});

describe("Decide component — score mode", () => {
  const baseProps = {
    title: "Score them",
    mode: "score" as const,
    onSubmit: vi.fn(),
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    criteria: [
      { id: "cost", label: "Cost", weight: 2 },
      { id: "speed", label: "Speed", weight: 1 },
    ],
    scale_steps: 5,
  };

  it("renders a matrix with one input per (option × criterion) cell", () => {
    render(<Decide {...baseProps} />);
    // 2 options × 2 criteria = 4 score inputs
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
  });

  it("disables submit until every cell is scored", async () => {
    const onSubmit = vi.fn();
    render(<Decide {...baseProps} onSubmit={onSubmit} />);
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    const inputs = screen.getAllByRole("spinbutton");
    for (const input of inputs) {
      fireEvent.change(input, { target: { value: "3" } });
    }
    expect(submit).toBeEnabled();
  });

  it("computes winner via weighted total and submits the full matrix", () => {
    const onSubmit = vi.fn();
    render(<Decide {...baseProps} onSubmit={onSubmit} />);

    // A: cost=5×2 + speed=1×1 = 11
    // B: cost=2×2 + speed=5×1 = 9
    // Winner: A
    const cells = screen.getAllByRole("spinbutton");
    fireEvent.change(cells[0]!, { target: { value: "5" } }); // A cost
    fireEvent.change(cells[1]!, { target: { value: "1" } }); // A speed
    fireEvent.change(cells[2]!, { target: { value: "2" } }); // B cost
    fireEvent.change(cells[3]!, { target: { value: "5" } }); // B speed

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({
      scores: { a: { cost: 5, speed: 1 }, b: { cost: 2, speed: 5 } },
      winner: "a",
    });
  });

  it("clamps cell values to the [1, scale_steps] range", () => {
    const onSubmit = vi.fn();
    render(<Decide {...baseProps} onSubmit={onSubmit} />);
    const cell = screen.getAllByRole("spinbutton")[0]!;
    fireEvent.change(cell, { target: { value: "99" } });
    expect((cell as HTMLInputElement).value).toBe("5");
  });
});
