import { z } from 'zod';
import {
  interviewRounds,
  questionCategories,
  recruitmentTypes,
  roleCategories,
} from './types';

// AI classification result: every field is nullable/optional to force the model
// to return "unknown" rather than fabricate.
export const aiClassificationSchema = z
  .object({
    company: z.string().nullable(),
    job_role: z.string().nullable(),
    role_category: z.string().nullable(),
    recruitment_type: z.string().nullable(),
    cohort: z.string().nullable(),
    rounds: z.array(z.string()),
    questions: z.array(
      z
        .object({
          text: z.string(),
          round: z.string().nullable(),
          category: z.string().nullable(),
        })
        .strict()
    ),
    author_difficulty: z.string().nullable(),
    author_result: z.string().nullable(),
    tags: z.array(z.string()),
    confidence: z.enum(['verified', 'pending', 'inferred']),
  })
  .strict();

export type AiClassification = z.infer<typeof aiClassificationSchema>;

export function labelFor(
  list: Record<string, string>,
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const direct = Object.keys(list).find((k) => k === value || list[k] === value);
  return direct ?? null;
}

// Normalize AI output to DB-safe enums; any unrecognized value falls back to null/undetermined.
export function normalizeClassification(c: AiClassification) {
  const recruitment = labelFor(recruitmentTypes, c.recruitment_type);
  return {
    recruitmentType: (recruitment as keyof typeof recruitmentTypes) ?? 'undetermined',
    rounds: c.rounds
      .map((r) => labelFor(interviewRounds, r))
      .filter((r): r is keyof typeof interviewRounds => Boolean(r)),
    roleCategory:
      (labelFor(roleCategories, c.role_category) as keyof typeof roleCategories) ?? 'other',
    confidence:
      c.confidence === 'verified' ? 'verified' : c.confidence === 'inferred' ? 'inferred' : 'pending',
  };
}

export function aiClassificationJsonSchema() {
  return z.toJSONSchema(aiClassificationSchema);
}

export { interviewRounds, questionCategories, recruitmentTypes, roleCategories };
