import { z } from 'zod';
export const RESUME_BUCKET = 'resume-originals';
export const MAX_RESUME_BYTES = 3 * 1024 * 1024;
export const paragraphFormatSchema = z
  .object({
    align: z.enum(['left', 'center', 'right', 'both']).optional(),
    left: z.number().min(-72).max(360).optional(),
    right: z.number().min(-72).max(360).optional(),
    before: z.number().min(0).max(144).optional(),
    after: z.number().min(0).max(144).optional(),
    line: z.number().min(0.8).max(3).optional(),
    rightTab: z.number().min(0).max(800).optional(),
  })
  .strict();
export type ParagraphFormat = z.infer<typeof paragraphFormatSchema>;
export const fileEditSchema = z
  .object({
    key: z.string().regex(/^(?:word\/(?:document|header\d+|footer\d+)\.xml#\d+|\d+:\d+)$/),
    text: z.string().max(5000),
    fontSize: z.number().min(6).max(72).optional(),
    baseline: z.number().min(-36).max(36).optional(),
    paragraph: paragraphFormatSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.key.startsWith('word/') ||
      (value.fontSize === undefined &&
        value.baseline === undefined &&
        value.paragraph === undefined),
    '段落和文字格式仅适用于 Word 文件。'
  );
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
export type FileBlock = {
  key: string;
  text: string;
  label: string;
  page?: number;
  group?: string;
  row?: string;
  before?: string;
  word?: {
    paragraph: ParagraphFormat;
    hasTabs: boolean;
    width: number;
    fontSize: number;
    baseline: number;
  };
};
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
