// Copied from hitl-ui — feel free to edit.
"use client";

import clsx from "clsx";
import { type FormEvent, useCallback, useId, useMemo, useState } from "react";
import type {
  DecideCell,
  DecideCriterion,
  DecideOption,
  DecideParams,
  DecideResult,
  DecideResultScore,
  DecideResultScoreCell,
  DecideSource,
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
  --hitl-muted-bg:     var(--muted, oklch(0.96 0.004 285));
  --hitl-border:       var(--border, oklch(0.93 0.004 285));
  --hitl-input-border: var(--input, var(--border, oklch(0.85 0.004 285)));
  --hitl-input-bg:     var(--background, oklch(1 0 0));
  --hitl-primary:      var(--primary, oklch(0.21 0.006 285));
  --hitl-primary-fg:   var(--primary-foreground, oklch(0.985 0 0));
  --hitl-accent:       var(--accent, oklch(0.96 0.004 285));
  --hitl-accent-fg:    var(--accent-foreground, oklch(0.21 0.006 285));
  --hitl-ring:         var(--ring, oklch(0.55 0.05 250));
  --hitl-radius:       var(--radius, 1rem);
}
@media (prefers-color-scheme: dark) {
  [data-hitl-component="decide"] {
    --hitl-bg:           var(--card, oklch(0.18 0.005 285));
    --hitl-fg:           var(--card-foreground, var(--foreground, oklch(0.985 0 0)));
    --hitl-muted-fg:     var(--muted-foreground, oklch(0.65 0.008 285));
    --hitl-muted-bg:     var(--muted, oklch(0.22 0.005 285));
    --hitl-border:       var(--border, oklch(0.27 0.005 285));
    --hitl-input-border: var(--input, var(--border, oklch(0.32 0.005 285)));
    --hitl-input-bg:     var(--background, oklch(0.14 0.005 285));
    --hitl-primary:      var(--primary, oklch(0.985 0 0));
    --hitl-primary-fg:   var(--primary-foreground, oklch(0.21 0.006 285));
    --hitl-accent:       var(--accent, oklch(0.27 0.005 285));
    --hitl-accent-fg:    var(--accent-foreground, oklch(0.985 0 0));
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
  submitLabel?: string;
}

function DecideShell({
  title,
  description,
  isComplete,
  onSubmit,
  onCancel,
  className,
  children,
  submitLabel = "Submit",
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
            {submitLabel}
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
 * Score mode — pre-scored matrix with a details panel for inspection
 * and per-cell override.
 *
 * Data shape:
 *   - The agent pre-fills every cell with { value, rationale, sources? }.
 *   - The human reviews. They can click any cell to read the rationale,
 *     follow citations, and override the value via a 1..N stepper.
 *   - The result payload reports each cell as { value, source: "agent" | "human" }
 *     so downstream reasoning can tell what was changed.
 * ======================================================================= */

type ScoreDecideProps = Omit<DecideProps, "mode">;
type ScoreState = Record<string, Record<string, DecideResultScoreCell>>;

function ScoreDecide({
  title,
  description,
  findings,
  options,
  criteria,
  scale_steps = 5,
  onSubmit,
  onCancel,
  className,
}: ScoreDecideProps) {
  // Schema enforces criteria + pre-fills when mode === "score"; fall back
  // to empty array for type narrowing.
  const cols = criteria ?? [];

  const [scores, setScores] = useState<ScoreState>(() =>
    Object.fromEntries(
      options.map((o) => [
        o.id,
        Object.fromEntries(
          cols.map((c) => {
            const cell = o.scores?.[c.id];
            const value = cell ? clamp(cell.value, 1, scale_steps) : 1;
            return [c.id, { value, source: "agent" as const }];
          }),
        ),
      ]),
    ),
  );

  const [selected, setSelected] = useState<{ optionId: string; criterionId: string } | null>(() => {
    const firstOption = options[0];
    const firstCriterion = cols[0];
    return firstOption && firstCriterion
      ? { optionId: firstOption.id, criterionId: firstCriterion.id }
      : null;
  });

  const setCell = useCallback((optionId: string, criterionId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [optionId]: {
        ...prev[optionId],
        [criterionId]: { value, source: "human" },
      },
    }));
  }, []);

  const resetCell = useCallback(
    (optionId: string, criterionId: string) => {
      const original = options.find((o) => o.id === optionId)?.scores?.[criterionId];
      if (!original) return;
      setScores((prev) => ({
        ...prev,
        [optionId]: {
          ...prev[optionId],
          [criterionId]: {
            value: clamp(original.value, 1, scale_steps),
            source: "agent",
          },
        },
      }));
    },
    [options, scale_steps],
  );

  const totals = useMemo(() => {
    return Object.fromEntries(
      options.map((o) => {
        let total = 0;
        for (const c of cols) {
          const cell = scores[o.id]?.[c.id];
          if (cell) total += cell.value * (c.weight ?? 1);
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

  const modified = useMemo(() => {
    for (const optionScores of Object.values(scores)) {
      for (const cell of Object.values(optionScores)) {
        if (cell.source === "human") return true;
      }
    }
    return false;
  }, [scores]);

  const handleSubmit = () => {
    if (!winnerId) return;
    const result: DecideResultScore = {
      scores,
      winner: winnerId,
      modified,
    };
    onSubmit(result);
  };

  const selectedOption = selected ? options.find((o) => o.id === selected.optionId) : null;
  const selectedCriterion = selected ? cols.find((c) => c.id === selected.criterionId) : null;
  const selectedCell = selected ? scores[selected.optionId]?.[selected.criterionId] : null;
  const selectedAgentCell: DecideCell | undefined =
    selected && selectedOption ? selectedOption.scores?.[selected.criterionId] : undefined;

  return (
    <DecideShell
      title={title}
      description={description}
      isComplete={winnerId !== null}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      className={className}
      submitLabel={modified ? "Confirm with overrides" : "Confirm scoring"}
    >
      {findings ? (
        <section className="mb-4 rounded-md border border-(--hitl-border) bg-(--hitl-muted-bg) p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-(--hitl-muted-fg)">
            <SparkleIcon />
            <span>Agent findings</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-(--hitl-fg)">{findings}</p>
        </section>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--hitl-border) text-left text-(--hitl-muted-fg)">
              <th scope="col" className="px-3 py-2 font-medium">
                Option
              </th>
              {cols.map((c) => (
                <th key={c.id} scope="col" className="px-2 py-2 text-center font-medium">
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
              const isWinner = winnerId === o.id;
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
                  {cols.map((c) => {
                    const cell = scores[o.id]?.[c.id];
                    const isSelected =
                      selected?.optionId === o.id && selected?.criterionId === c.id;
                    return (
                      <td key={c.id} className="px-1.5 py-2 text-center">
                        <ScoreBadge
                          value={cell?.value ?? 0}
                          max={scale_steps}
                          source={cell?.source ?? "agent"}
                          selected={isSelected}
                          onClick={() => setSelected({ optionId: o.id, criterionId: c.id })}
                          ariaLabel={`${o.label} on ${c.label}: ${cell?.value} of ${scale_steps}${
                            cell?.source === "human" ? ", overridden" : ""
                          }`}
                        />
                      </td>
                    );
                  })}
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

      {selectedOption && selectedCriterion && selectedCell ? (
        <CellDetailsPanel
          option={selectedOption}
          criterion={selectedCriterion}
          cell={selectedCell}
          agentCell={selectedAgentCell}
          max={scale_steps}
          onOverride={(v) => setCell(selectedOption.id, selectedCriterion.id, v)}
          onReset={() => resetCell(selectedOption.id, selectedCriterion.id)}
        />
      ) : (
        <p className="mt-3 text-xs text-(--hitl-muted-fg)">
          Click any score to see the agent's reasoning and citations.
        </p>
      )}
    </DecideShell>
  );
}

/* ---------------------------------------------------------------------------
 * ScoreBadge — single matrix cell. Renders the value as a pill, with a
 * subtle indicator when the human has overridden it. Acts as a button
 * (clickable cell) so the details panel can attach to a current selection.
 * ------------------------------------------------------------------------- */
function ScoreBadge({
  value,
  max,
  source,
  selected,
  onClick,
  ariaLabel,
}: {
  value: number;
  max: number;
  source: "agent" | "human";
  selected: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={clsx(
        "relative inline-flex h-8 w-12 items-center justify-center rounded-md border font-mono text-sm transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)",
        selected
          ? "border-(--hitl-primary) bg-(--hitl-primary)/[.08] text-(--hitl-fg) shadow-sm"
          : "border-(--hitl-input-border) bg-(--hitl-input-bg) text-(--hitl-fg) hover:border-(--hitl-primary)/60",
      )}
    >
      <span>{value}</span>
      <span className="text-(--hitl-muted-fg)">/{max}</span>
      {source === "human" ? (
        <span
          aria-hidden="true"
          className="absolute right-1 top-0.5 size-1.5 rounded-full bg-(--hitl-ring)"
          title="Overridden by you"
        />
      ) : null}
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * CellDetailsPanel — inspector that opens beneath the matrix for whichever
 * cell is currently selected. Shows rationale, sources, and an inline 1..N
 * stepper for overriding the agent's pre-fill.
 * ------------------------------------------------------------------------- */
function CellDetailsPanel({
  option,
  criterion,
  cell,
  agentCell,
  max,
  onOverride,
  onReset,
}: {
  option: DecideOption;
  criterion: DecideCriterion;
  cell: DecideResultScoreCell;
  agentCell: DecideCell | undefined;
  max: number;
  onOverride: (value: number) => void;
  onReset: () => void;
}) {
  const isOverridden = cell.source === "human";

  return (
    <section
      aria-live="polite"
      className="mt-4 rounded-md border border-(--hitl-border) bg-(--hitl-muted-bg) p-4"
    >
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-(--hitl-fg)">{option.label}</span>
          <span className="text-(--hitl-muted-fg)">·</span>
          <span className="text-(--hitl-fg)">{criterion.label}</span>
          {criterion.weight && criterion.weight !== 1 ? (
            <span className="font-mono text-xs text-(--hitl-muted-fg)">w·{criterion.weight}</span>
          ) : null}
        </div>
        {isOverridden ? (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-(--hitl-muted-fg) underline-offset-2 transition-colors hover:text-(--hitl-fg) hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)"
          >
            Reset to agent's score{agentCell ? ` (${agentCell.value})` : ""}
          </button>
        ) : null}
      </header>

      {agentCell?.rationale ? (
        <p className="mb-3 text-sm leading-relaxed text-(--hitl-fg)">{agentCell.rationale}</p>
      ) : (
        <p className="mb-3 text-sm italic text-(--hitl-muted-fg)">
          The agent didn't include a rationale for this cell.
        </p>
      )}

      {agentCell?.sources && agentCell.sources.length > 0 ? (
        <SourceList sources={agentCell.sources} />
      ) : null}

      <ScoreStepper value={cell.value} max={max} onChange={onOverride} />
    </section>
  );
}

function SourceList({ sources }: { sources: DecideSource[] }) {
  return (
    <ul className="mb-3 space-y-1">
      {sources.map((s, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: source list is render-only & static
          key={i}
          className="flex items-start gap-1.5 text-xs text-(--hitl-muted-fg)"
        >
          <LinkIcon />
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-(--hitl-muted-fg) underline underline-offset-2 transition-colors hover:text-(--hitl-fg) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)"
            >
              {s.title}
            </a>
          ) : (
            <span className="break-words">{s.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ScoreStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const steps = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-(--hitl-muted-fg)">Override</span>
      <div role="radiogroup" aria-label="Override score" className="inline-flex gap-1">
        {steps.map((step) => {
          const active = value === step;
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(step)}
              className={clsx(
                "h-7 min-w-[1.75rem] rounded-md border px-2 font-mono text-xs transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--hitl-ring)",
                active
                  ? "border-(--hitl-primary) bg-(--hitl-primary) text-(--hitl-primary-fg)"
                  : "border-(--hitl-input-border) bg-(--hitl-input-bg) text-(--hitl-fg) hover:border-(--hitl-primary)/60",
              )}
            >
              {step}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
 * Icons + utils
 * ======================================================================= */

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

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path d="M6.5 9.5l3-3M7 4.5l1-1a3 3 0 014.5 4.5l-1 1M9 11.5l-1 1a3 3 0 01-4.5-4.5l1-1" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M8 1l1.2 3.6L13 6 9.2 7.2 8 11 6.8 7.2 3 6l3.8-1.4L8 1zM12 11l.7 1.8L14.5 13l-1.8.7L12 15l-.7-1.3L9.5 13l1.8-.2L12 11z" />
    </svg>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
