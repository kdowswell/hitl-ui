// Copied from hitl-ui — feel free to edit.
"use client";

import clsx from "clsx";
import { type FormEvent, useCallback, useId, useMemo, useState } from "react";
import type {
  DecideCriterion,
  DecideOption,
  DecideParams,
  DecideResult,
  DecideResultScore,
} from "./decide.types";

/* ---------------------------------------------------------------------------
 * Theme tokens — same cascade pattern as assess. See assess.tsx for the full
 * rationale. Components share token names so a single host-app theme covers
 * the whole hitl-ui catalog.
 * ------------------------------------------------------------------------- */
const HITL_BASE_STYLES = `
[data-hitl-component="decide"] {
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
  [data-hitl-component="decide"] {
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

export interface DecideProps extends DecideParams {
  onSubmit: (result: DecideResult) => void;
  onCancel?: () => void;
  className?: string;
}

export function Decide(props: DecideProps) {
  const { mode = "select", ...rest } = props;
  return mode === "score" ? <ScoreDecide {...rest} /> : <SelectDecide {...rest} />;
}

/* =========================================================================
 * Shell — wraps either mode. Provides the form, header, footer, and tokens.
 * ======================================================================= */

interface ShellProps {
  title: string;
  description?: string;
  isComplete: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  className?: string;
  children: React.ReactNode;
}

function DecideShell({
  title,
  description,
  isComplete,
  onSubmit,
  onCancel,
  className,
  children,
}: ShellProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isComplete) onSubmit();
  };

  return (
    <>
      <style>{HITL_BASE_STYLES}</style>
      <form
        data-hitl-component="decide"
        onSubmit={handleSubmit}
        className={clsx(
          "w-full max-w-2xl rounded-(--hitl-radius) border border-(--hitl-border) bg-(--hitl-bg) p-6 text-(--hitl-fg) shadow-sm",
          className,
        )}
      >
        <header className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-(--hitl-fg)">{title}</h2>
          {description ? <p className="text-sm text-(--hitl-muted-fg)">{description}</p> : null}
        </header>

        {children}

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

/* =========================================================================
 * Select mode — option cards.
 * ======================================================================= */

type SelectDecideProps = Omit<DecideProps, "mode">;

function SelectDecide({
  title,
  description,
  options,
  criteria,
  onSubmit,
  onCancel,
  className,
}: SelectDecideProps) {
  const [winner, setWinner] = useState<string | null>(null);
  const baseId = useId();
  const isComplete = winner !== null;

  return (
    <DecideShell
      title={title}
      description={description}
      isComplete={isComplete}
      onSubmit={() => winner && onSubmit({ winner })}
      onCancel={onCancel}
      className={className}
    >
      <div role="radiogroup" className="flex flex-col gap-2">
        {options.map((option) => {
          const id = `${baseId}-${option.id}`;
          const selected = winner === option.id;
          return (
            <OptionCard
              key={option.id}
              id={id}
              option={option}
              criteria={criteria}
              selected={selected}
              onSelect={() => setWinner(option.id)}
            />
          );
        })}
      </div>
    </DecideShell>
  );
}

function OptionCard({
  id,
  option,
  criteria,
  selected,
  onSelect,
}: {
  id: string;
  option: DecideOption;
  criteria?: DecideCriterion[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      id={id}
      onClick={onSelect}
      className={clsx(
        "w-full rounded-md border bg-(--hitl-input-bg) p-4 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)",
        selected
          ? "border-2 border-(--hitl-primary)"
          : "border border-(--hitl-input-border) hover:border-(--hitl-primary)",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-(--hitl-fg)">{option.label}</div>
          {option.description ? (
            <p className="mt-1 text-sm text-(--hitl-muted-fg)">{option.description}</p>
          ) : null}
          {criteria && criteria.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--hitl-muted-fg)">
              {criteria.map((c) => (
                <li key={c.id}>• {c.label}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {selected ? (
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--hitl-primary) text-(--hitl-primary-fg)"
          >
            <CheckIcon />
          </span>
        ) : null}
      </div>
    </button>
  );
}

/* =========================================================================
 * Score mode — matrix table.
 * ======================================================================= */

type ScoreDecideProps = Omit<DecideProps, "mode">;
type ScoreState = Record<string, Record<string, number | undefined>>;

function ScoreDecide({
  title,
  description,
  options,
  criteria,
  scale_steps = 5,
  onSubmit,
  onCancel,
  className,
}: ScoreDecideProps) {
  // Schema enforces criteria when mode === "score"; fall back to empty array
  // for type narrowing.
  const cols = criteria ?? [];

  const [scores, setScores] = useState<ScoreState>(() =>
    Object.fromEntries(options.map((o) => [o.id, {}])),
  );

  const setCell = useCallback((optionId: string, criterionId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [optionId]: { ...prev[optionId], [criterionId]: value },
    }));
  }, []);

  const totals = useMemo(() => {
    return Object.fromEntries(
      options.map((o) => {
        let total = 0;
        for (const c of cols) {
          const v = scores[o.id]?.[c.id];
          if (typeof v === "number") total += v * (c.weight ?? 1);
        }
        return [o.id, total];
      }),
    );
  }, [scores, options, cols]);

  const winnerId = useMemo(() => {
    let best: string | null = null;
    let bestTotal = Number.NEGATIVE_INFINITY;
    for (const o of options) {
      const t = totals[o.id] ?? 0;
      if (t > bestTotal) {
        best = o.id;
        bestTotal = t;
      }
    }
    return best;
  }, [totals, options]);

  const isComplete = useMemo(
    () => options.every((o) => cols.every((c) => typeof scores[o.id]?.[c.id] === "number")),
    [scores, options, cols],
  );

  return (
    <DecideShell
      title={title}
      description={description}
      isComplete={isComplete}
      onSubmit={() => {
        if (!winnerId) return;
        const cleaned: Record<string, Record<string, number>> = {};
        for (const [oid, row] of Object.entries(scores)) {
          const cleanRow: Record<string, number> = {};
          for (const [cid, v] of Object.entries(row)) {
            if (typeof v === "number") cleanRow[cid] = v;
          }
          cleaned[oid] = cleanRow;
        }
        const result: DecideResultScore = { scores: cleaned, winner: winnerId };
        onSubmit(result);
      }}
      onCancel={onCancel}
      className={className}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--hitl-border) text-left text-(--hitl-muted-fg)">
              <th scope="col" className="px-3 py-2 font-medium">
                Option
              </th>
              {cols.map((c) => (
                <th key={c.id} scope="col" className="px-3 py-2 text-center font-medium">
                  <div className="text-(--hitl-fg)">{c.label}</div>
                  {c.weight && c.weight !== 1 ? (
                    <div className="text-xs font-normal text-(--hitl-muted-fg)">w·{c.weight}</div>
                  ) : null}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((o) => {
              const isWinner = isComplete && winnerId === o.id;
              return (
                <tr
                  key={o.id}
                  className={clsx(
                    "border-b border-(--hitl-border) transition-colors",
                    isWinner ? "bg-(--hitl-primary)/[.06]" : null,
                  )}
                >
                  <th scope="row" className="px-3 py-2 text-left font-medium text-(--hitl-fg)">
                    <div>{o.label}</div>
                    {o.description ? (
                      <div className="text-xs font-normal text-(--hitl-muted-fg)">
                        {o.description}
                      </div>
                    ) : null}
                  </th>
                  {cols.map((c) => (
                    <td key={c.id} className="px-2 py-2 text-center">
                      <ScoreCell
                        max={scale_steps}
                        value={scores[o.id]?.[c.id]}
                        onChange={(v) => setCell(o.id, c.id, v)}
                        ariaLabel={`Score ${o.label} on ${c.label}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono text-(--hitl-fg)">
                    {totals[o.id]}
                    {isWinner ? (
                      <span
                        className="ml-2 inline-flex h-4 items-center rounded bg-(--hitl-primary) px-1.5 text-[10px] font-semibold text-(--hitl-primary-fg)"
                        aria-label="suggested winner"
                      >
                        WIN
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-(--hitl-muted-fg)">
        Score each cell from 1 to {scale_steps}. Total = sum(score × weight). Winner highlights the
        highest total.
      </p>
    </DecideShell>
  );
}

function ScoreCell({
  max,
  value,
  onChange,
  ariaLabel,
}: {
  max: number;
  value: number | undefined;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      min={1}
      max={max}
      step={1}
      value={value ?? ""}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "") return;
        const n = Number(next);
        if (Number.isNaN(n)) return;
        onChange(Math.max(1, Math.min(max, n)));
      }}
      aria-label={ariaLabel}
      className="w-14 rounded-md border border-(--hitl-input-border) bg-(--hitl-input-bg) px-2 py-1 text-center text-sm text-(--hitl-fg) focus:outline-none focus:ring-2 focus:ring-(--hitl-ring)"
    />
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
