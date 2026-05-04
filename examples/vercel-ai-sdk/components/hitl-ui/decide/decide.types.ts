// Copied from hitl-ui — feel free to edit.
import { z } from "zod";

export const decideOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
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
    options: z.array(decideOptionSchema).min(2).max(5),
    criteria: z.array(decideCriterionSchema).max(6).optional(),
    mode: decideModeSchema.default("select").optional(),
    scale_steps: z.number().int().min(2).max(11).default(5).optional(),
  })
  .refine((data) => data.mode !== "score" || (data.criteria && data.criteria.length > 0), {
    message: "score mode requires at least one criterion",
    path: ["criteria"],
  });
export type DecideParams = z.infer<typeof decideParamsSchema>;

export type DecideResultSelect = { winner: string };
export type DecideResultScore = {
  scores: Record<string, Record<string, number>>;
  winner: string;
};
export type DecideResult = DecideResultSelect | DecideResultScore;
