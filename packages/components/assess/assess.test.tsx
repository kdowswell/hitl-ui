import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Assess } from "./assess";
import { assessParamsSchema } from "./assess.types";

describe("assess Zod schema", () => {
  it("accepts a valid 3-question assessment", () => {
    const result = assessParamsSchema.safeParse({
      title: "T",
      questions: [
        { id: "a", type: "text", prompt: "p" },
        { id: "b", type: "boolean", prompt: "p" },
        { id: "c", type: "scale", prompt: "p", scale_steps: 5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty questions array", () => {
    const result = assessParamsSchema.safeParse({ title: "T", questions: [] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 8 questions", () => {
    const result = assessParamsSchema.safeParse({
      title: "T",
      questions: Array.from({ length: 9 }, (_, i) => ({
        id: `q${i}`,
        type: "text" as const,
        prompt: "p",
      })),
    });
    expect(result.success).toBe(false);
  });
});

describe("Assess component", () => {
  const baseProps = {
    title: "Test Assessment",
    description: "Some context.",
    onSubmit: vi.fn(),
  };

  it("renders title and description", () => {
    render(<Assess {...baseProps} questions={[{ id: "a", type: "text", prompt: "Question A" }]} />);
    expect(screen.getByText("Test Assessment")).toBeInTheDocument();
    expect(screen.getByText("Some context.")).toBeInTheDocument();
    expect(screen.getByText("Question A")).toBeInTheDocument();
  });

  it("disables submit until required text field is non-empty", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[{ id: "name", type: "text", prompt: "Name" }]}
      />,
    );

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Kurt");
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ name: "Kurt" });
  });

  it("treats boolean questions as always-answered with default false", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[{ id: "ok", type: "boolean", prompt: "Ready?" }]}
      />,
    );
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ ok: false });
  });

  it("requires multi_select to have at least one selection when required", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[{ id: "tags", type: "multi_select", prompt: "Pick", options: ["a", "b", "c"] }]}
      />,
    );
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "a" }));
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ tags: ["a"] });
  });

  it("scale field returns a number", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[{ id: "score", type: "scale", prompt: "Score", scale_steps: 5 }]}
      />,
    );
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "4" }));
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ score: 4 });
  });

  it("treats optional questions as answered even when blank", () => {
    render(
      <Assess
        {...baseProps}
        questions={[{ id: "note", type: "text", prompt: "Optional", required: false }]}
      />,
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  it("does not submit when required field is empty (form submit guard)", () => {
    const onSubmit = vi.fn();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[{ id: "x", type: "text", prompt: "Required" }]}
      />,
    );
    const form = screen.getByRole("button", { name: "Submit" }).closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("textarea returns a string and renders as a multi-line control", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[{ id: "notes", type: "textarea", prompt: "Notes" }]}
      />,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
    await user.type(textarea, "multi-line content");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({ notes: "multi-line content" });
  });

  it("number field returns a numeric value, not a string", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[
          {
            id: "percent",
            type: "number",
            prompt: "Percent",
            validation: { min: 0, max: 100 },
          },
        ]}
      />,
    );
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");

    await user.type(input, "42");
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ percent: 42 });
    expect(typeof (onSubmit.mock.calls[0]?.[0] as Record<string, unknown>).percent).toBe("number");
  });

  it("email and url fields render with their HTML5 types", () => {
    render(
      <Assess
        {...baseProps}
        questions={[
          { id: "e", type: "email", prompt: "Email" },
          { id: "u", type: "url", prompt: "URL" },
        ]}
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveAttribute("type", "email");
    expect(inputs[1]).toHaveAttribute("type", "url");
  });

  it("date field returns an ISO date string", async () => {
    const onSubmit = vi.fn();
    render(
      <Assess
        {...baseProps}
        onSubmit={onSubmit}
        questions={[{ id: "d", type: "date", prompt: "Date" }]}
      />,
    );
    const input = document.querySelector('input[type="date"]') as HTMLInputElement | null;
    if (!input) throw new Error("date input not found");
    fireEvent.change(input, { target: { value: "2026-05-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({ d: "2026-05-03" });
  });
});
