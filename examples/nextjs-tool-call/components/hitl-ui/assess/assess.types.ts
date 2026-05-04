// Copied from hitl-ui — feel free to edit.
import { z } from "zod";

export const assessQuestionTypeSchema = z.enum([
  "text",
  "textarea",
  "select",
  "multi_select",
  "scale",
  "boolean",
  "number",
  "email",
  "url",
  "date",
]);
export type AssessQuestionType = z.infer<typeof assessQuestionTypeSchema>;

export const assessValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});
export type AssessValidation = z.infer<typeof assessValidationSchema>;

export const assessQuestionSchema = z.object({
  id: z.string().min(1),
  type: assessQuestionTypeSchema,
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  scale_min_label: z.string().optional(),
  scale_max_label: z.string().optional(),
  scale_steps: z.number().int().min(2).max(11).default(5).optional(),
  required: z.boolean().default(true).optional(),
  placeholder: z.string().optional(),
  validation: assessValidationSchema.optional(),
});
export type AssessQuestion = z.infer<typeof assessQuestionSchema>;

export const assessParamsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(assessQuestionSchema).min(1).max(8),
});
export type AssessParams = z.infer<typeof assessParamsSchema>;

export type AssessAnswerValue = string | string[] | number | boolean | undefined;
export type AssessResult = Record<string, AssessAnswerValue>;
