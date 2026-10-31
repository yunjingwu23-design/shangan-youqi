import { z } from 'zod';
export const RESUME_BUCKET = 'resume-originals';
export const MAX_RESUME_BYTES = 3 * 1024 * 1024;
export const fileEditSchema = z
  .object({
    key: z.string().regex(/^(?:word\/(?:document|header\d+|footer\d+)\.xml#\d+|\d+:\d+)$/),
    text: z.string().max(5000),
  })
  .strict();
export const originalResumeSchema = z
  .object({
    format: z.literal('shangan-original-resume-v1'),
    fileType: z.enum(['pdf', 'docx']),
    fileName: z.string().min(1).max(160),
    fileSize: z.number().int().min(1).max(MAX_RESUME_BYTES),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    edits: z.array(fileEditSchema).max(300),
  })
  .strict()
  .refine(
    (value) => JSON.stringify(value).length <= 20000,
    '修改内容超出保存上限，请分成多个版本保存。'
  );
export type OriginalResume = z.infer<typeof originalResumeSchema>;
export type FileEdit = z.infer<typeof fileEditSchema>;
export type FileBlock = { key: string; text: string; label: string; page?: number };
export function readOriginal(content: string): OriginalResume | null {
  try {
    const parsed = originalResumeSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function resumeObject(userId: string, id: string, type: 'pdf' | 'docx') {
  return `${userId}/${id}.${type}`;
}
