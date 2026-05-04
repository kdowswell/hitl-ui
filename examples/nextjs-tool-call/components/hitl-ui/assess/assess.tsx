// Copied from hitl-ui — feel free to edit.
"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import clsx from "clsx";
import { type FormEvent, useCallback, useId, useMemo, useState } from "react";
import type { AssessAnswerValue, AssessParams, AssessQuestion, AssessResult } from "./assess.types";

/* ---------------------------------------------------------------------------
 * Theme tokens
 *
 * Each variable falls back to a shadcn-convention token if the host app
 * declares one (`--card`, `--foreground`, `--primary`, etc.), and finally
 * to a literal default. The result: this component renders cleanly with
 * zero setup, AND inherits the host app's design tokens automatically when
 * they exist. To retheme without editing this file, declare any of the
 * shadcn tokens at any DOM scope above the component (e.g. on `:root`).
 * ------------------------------------------------------------------------- */
const HITL_BASE_STYLES = `
[data-hitl-component="assess"] {
  --hitl-bg:           var(--card, oklch(1 0 0));
  --hitl-fg:           var(--card-foreground, var(--foreground, oklch(0.18 0.005 285)));
  --hitl-muted-fg:     var(--muted-foreground, oklch(0.55 0.008 285));
  --hitl-border:       var(--border, oklch(0.93 0.004 285));
  --hitl-input-border: var(--input, var(--border, oklch(0.85 0.004 285)));
  --hitl-input-bg:     var(--background, oklch(1 0 0));
  --hitl-primary:      var(--primary, oklch(0.21 0.006 285));
  --hitl-primary-fg:   var(--primary-foreground, oklch(0.985 0 0));
  --hitl-ring:         var(--ring, oklch(0.55 0.05 250));
  --hitl-radius:       var(--radius, 1rem);
}
@media (prefers-color-scheme: dark) {
  [data-hitl-component="assess"] {
    --hitl-bg:           var(--card, oklch(0.18 0.005 285));
    --hitl-fg:           var(--card-foreground, var(--foreground, oklch(0.985 0 0)));
    --hitl-muted-fg:     var(--muted-foreground, oklch(0.65 0.008 285));
    --hitl-border:       var(--border, oklch(0.27 0.005 285));
    --hitl-input-border: var(--input, var(--border, oklch(0.32 0.005 285)));
    --hitl-input-bg:     var(--background, oklch(0.14 0.005 285));
    --hitl-primary:      var(--primary, oklch(0.985 0 0));
    --hitl-primary-fg:   var(--primary-foreground, oklch(0.21 0.006 285));
    --hitl-ring:         var(--ring, oklch(0.65 0.04 250));
  }
}
`;

export interface AssessProps extends AssessParams {
  onSubmit: (result: AssessResult) => void;
  onCancel?: () => void;
  className?: string;
}

export function Assess(props: AssessProps) {
  const { title, description, questions, onSubmit, onCancel, className } = props;
  const [answers, setAnswers] = useState<AssessResult>(() => initialAnswers(questions));

  const isComplete = useMemo(
    () => questions.every((q) => isAnswered(q, answers[q.id])),
    [answers, questions],
  );

  const setAnswer = useCallback((id: string, value: AssessAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isComplete) return;
    onSubmit(answers);
  };

  return (
    <>
      <style>{HITL_BASE_STYLES}</style>
      <form
        data-hitl-component="assess"
        onSubmit={handleSubmit}
        className={clsx(
          "w-full max-w-xl rounded-(--hitl-radius) border border-(--hitl-border) bg-(--hitl-bg) p-6 text-(--hitl-fg) shadow-sm",
          className,
        )}
      >
        <header className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-(--hitl-fg)">{title}</h2>
          {description ? <p className="text-sm text-(--hitl-muted-fg)">{description}</p> : null}
        </header>

        <div className="flex flex-col gap-5">
          {questions.map((question) => (
            <Question
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(value) => setAnswer(question.id, value)}
            />
          ))}
        </div>

        <footer className="mt-6 flex items-center justify-end gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-sm text-(--hitl-muted-fg) transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!isComplete}
            className="rounded-md bg-(--hitl-primary) px-4 py-1.5 text-sm font-medium text-(--hitl-primary-fg) shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        </footer>
      </form>
    </>
  );
}

interface QuestionProps {
  question: AssessQuestion;
  value: AssessAnswerValue;
  onChange: (value: AssessAnswerValue) => void;
}

function Question({ question, value, onChange }: QuestionProps) {
  const fieldId = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-(--hitl-fg)">
        {question.prompt}
        {question.required === false ? (
          <span className="ml-1 text-xs font-normal text-(--hitl-muted-fg)">(optional)</span>
        ) : null}
      </label>
      {renderInput(question, value, onChange, fieldId)}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-md border border-(--hitl-input-border) bg-(--hitl-input-bg) px-3 py-2 text-sm text-(--hitl-fg) placeholder:text-(--hitl-muted-fg) focus:outline-none focus:ring-2 focus:ring-(--hitl-ring)";

function renderInput(
  question: AssessQuestion,
  value: AssessAnswerValue,
  onChange: (value: AssessAnswerValue) => void,
  fieldId: string,
) {
  switch (question.type) {
    case "text":
    case "email":
    case "url":
    case "date":
      return (
        <input
          id={fieldId}
          type={question.type === "text" ? "text" : question.type}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          pattern={question.validation?.pattern}
          title={question.validation?.message}
          className={INPUT_CLASS}
        />
      );

    case "textarea":
      return (
        <textarea
          id={fieldId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={3}
          className={`${INPUT_CLASS} resize-y`}
        />
      );

    case "number":
      return (
        <input
          id={fieldId}
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next === "" ? undefined : Number(next));
          }}
          placeholder={question.placeholder}
          min={question.validation?.min}
          max={question.validation?.max}
          title={question.validation?.message}
          className={INPUT_CLASS}
        />
      );

    case "select":
      return (
        <SelectField
          id={fieldId}
          options={question.options ?? []}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          placeholder={question.placeholder ?? "Select…"}
        />
      );

    case "multi_select":
      return (
        <MultiSelectField
          options={question.options ?? []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );

    case "scale":
      return (
        <ScaleField
          steps={question.scale_steps ?? 5}
          minLabel={question.scale_min_label}
          maxLabel={question.scale_max_label}
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      );

    case "boolean":
      return (
        <BooleanField
          id={fieldId}
          value={typeof value === "boolean" ? value : false}
          onChange={onChange}
        />
      );
  }
}

function SelectField({
  id,
  options,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        id={id}
        className="inline-flex w-full items-center justify-between rounded-md border border-(--hitl-input-border) bg-(--hitl-input-bg) px-3 py-2 text-sm text-(--hitl-fg) focus:outline-none focus:ring-2 focus:ring-(--hitl-ring) data-placeholder:text-(--hitl-muted-fg)"
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="ml-2 text-(--hitl-muted-fg)">▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        {/*
          Select.Content is rendered into a portal at <body>, outside the
          [data-hitl-component="assess"] scope where our CSS vars are
          declared. We re-apply the same data attribute here so the inline
          <style> rule targets this element too — otherwise the popover
          would render with a transparent background.
        */}
        <Select.Content
          data-hitl-component="assess"
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 overflow-hidden rounded-md border border-(--hitl-border) bg-(--hitl-bg) text-(--hitl-fg) shadow-lg"
        >
          <Select.Viewport className="p-1">
            {options.map((option) => (
              <Select.Item
                key={option}
                value={option}
                className="relative flex cursor-pointer select-none items-center rounded px-3 py-1.5 text-sm text-(--hitl-fg) outline-none transition-opacity data-highlighted:opacity-70"
              >
                <Select.ItemText>{option}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function MultiSelectField({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const baseId = useId();
  const toggle = (option: string, checked: boolean) => {
    onChange(checked ? [...value, option] : value.filter((v) => v !== option));
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => {
        const checked = value.includes(option);
        const checkboxId = `${baseId}-${index}`;
        return (
          <div key={option} className="flex items-center gap-2 text-sm">
            <Checkbox.Root
              id={checkboxId}
              checked={checked}
              onCheckedChange={(state) => toggle(option, state === true)}
              className="flex h-4 w-4 items-center justify-center rounded border border-(--hitl-input-border) bg-(--hitl-input-bg) data-[state=checked]:border-(--hitl-primary) data-[state=checked]:bg-(--hitl-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)"
            >
              <Checkbox.Indicator className="text-(--hitl-primary-fg)">
                <CheckIcon />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <label htmlFor={checkboxId} className="cursor-pointer text-(--hitl-fg)">
              {option}
            </label>
          </div>
        );
      })}
    </div>
  );
}

function ScaleField({
  steps,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  steps: number;
  minLabel?: string;
  maxLabel?: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const items = useMemo(() => Array.from({ length: steps }, (_, i) => i + 1), [steps]);
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        className="flex w-full overflow-hidden rounded-md border border-(--hitl-input-border)"
      >
        {items.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(n)}
              className={clsx(
                "flex-1 border-r border-(--hitl-input-border) py-1.5 text-sm transition-opacity last:border-r-0",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--hitl-ring)",
                selected
                  ? "bg-(--hitl-primary) text-(--hitl-primary-fg)"
                  : "bg-(--hitl-input-bg) text-(--hitl-fg) hover:opacity-70",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {minLabel || maxLabel ? (
        <div className="flex justify-between text-xs text-(--hitl-muted-fg)">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function BooleanField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Switch.Root
      id={id}
      checked={value}
      onCheckedChange={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full bg-(--hitl-input-border) transition-colors data-[state=checked]:bg-(--hitl-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)"
    >
      <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-(--hitl-bg) shadow-sm transition-transform data-[state=checked]:translate-x-5.5" />
    </Switch.Root>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function initialAnswers(questions: AssessQuestion[]): AssessResult {
  const out: AssessResult = {};
  for (const q of questions) {
    if (q.type === "boolean") out[q.id] = false;
    else if (q.type === "multi_select") out[q.id] = [];
    else out[q.id] = undefined;
  }
  return out;
}

function isAnswered(q: AssessQuestion, value: AssessAnswerValue): boolean {
  if (q.required === false) return true;
  switch (q.type) {
    case "text":
    case "textarea":
    case "select":
    case "email":
    case "url":
    case "date":
      return typeof value === "string" && value.trim().length > 0;
    case "multi_select":
      return Array.isArray(value) && value.length > 0;
    case "scale":
    case "number":
      return typeof value === "number" && !Number.isNaN(value);
    case "boolean":
      return typeof value === "boolean";
  }
}
