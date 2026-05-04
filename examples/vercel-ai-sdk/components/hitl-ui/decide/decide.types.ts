// Copied from hitl-ui — feel free to edit.
import { z } from "zod";

export const decideSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().optional(),
});
export type DecideSource = z.infer<typeof decideSourceSchema>;

export const decideCellSchema = z.object({
  value: z.number(),
  rationale: z.string().min(1),
  sources: z.array(decideSourceSchema).max(5).optional(),
});
export type DecideCell = z.infer<typeof decideCellSchema>;

export const decideOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  // Score mode: agent's pre-evaluation, keyed by criterion id.
  scores: z.record(z.string().min(1), decideCellSchema).optional(),
});
export type DecideOption = z.infer<typeof decideOptionSchema>;

export const decideCriterionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().positive().default(1).optional(),
});
export type DecideCriterion = z.infer<typeof decideCriterionSchema>;

export const decideModeSchema = z.enum(["select", "score"]);
export type DecideMode = z.infer<typeof decideModeSchema>;

export const decideParamsSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    /**
     * Optional executive-summary findings the agent emits alongside the matrix
     * (score mode). Plain prose, ~3-6 lines; rendered with line breaks
     * preserved above the grid.
     */
    findings: z.string().optional(),
    options: z.array(decideOptionSchema).min(2).max(5),
    criteria: z.array(decideCriterionSchema).max(6).optional(),
    mode: decideModeSchema.default("select").optional(),
    scale_steps: z.number().int().min(2).max(11).default(5).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== "score") return;

    if (!data.criteria || data.criteria.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "score mode requires at least one criterion",
        path: ["criteria"],
      });
      return;
    }

    const max = data.scale_steps ?? 5;
    for (const option of data.options) {
      const scores = option.scores ?? {};
      for (const c of data.criteria) {
        const cell = scores[c.id];
        if (!cell) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `score mode requires option "${option.id}" to pre-score criterion "${c.id}"`,
            path: ["options"],
          });
          continue;
        }
        if (!Number.isFinite(cell.value) || cell.value < 1 || cell.value > max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `score for option "${option.id}" / criterion "${c.id}" must be between 1 and ${max}`,
            path: ["options"],
          });
        }
      }
    }
  });
export type DecideParams = z.infer<typeof decideParamsSchema>;

export type DecideResultSelect = { winner: string };

export type DecideResultScoreCell = {
  value: number;
  /** "agent" if untouched from the pre-fill, "human" if the user overrode it. */
  source: "agent" | "human";
};
export type DecideResultScore = {
  scores: Record<string, Record<string, DecideResultScoreCell>>;
  winner: string;
  /** True if the human overrode at least one cell. */
  modified: boolean;
};
export type DecideResult = DecideResultSelect | DecideResultScore;
