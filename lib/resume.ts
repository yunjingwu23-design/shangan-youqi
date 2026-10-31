import { z } from 'zod';
export const resumeDocumentSchema = z
  .object({
    format: z.literal('shangan-resume-v1'),
    basics: z
      .object({
        name: z.string().max(60),
        headline: z.string().max(100),
        email: z.string().max(254),
        phone: z.string().max(50),
        city: z.string().max(60),
        links: z.string().max(300),
      })
      .strict(),
    sections: z
      .array(
        z
          .object({
            id: z.uuid(),
            title: z.string().trim().min(1).max(60),
            body: z.string().max(5000),
          })
          .strict()
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine((doc) => JSON.stringify(doc).length <= 20000, '简历内容超出保存上限，请精简后重试');
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export const resumeSaveSchema = z
  .object({
    id: z.uuid().optional(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
    title: z.string().trim().min(1).max(120),
    company: z.string().trim().max(100),
    document: resumeDocumentSchema,
  })
  .strict();
export function emptyResume(name = '', email = ''): ResumeDocument {
  return {
    format: 'shangan-resume-v1',
    basics: { name, headline: '', email, phone: '', city: '', links: '' },
    sections: ['教育经历', '工作 / 实习经历', '项目经历', '技能与其他'].map((title) => ({
      id: crypto.randomUUID(),
      title,
      body: '',
    })),
  };
}
export function readResume(
  content: string,
  id: string
): { document: ResumeDocument; legacy: boolean } {
  try {
    const parsed = resumeDocumentSchema.safeParse(JSON.parse(content));
    if (parsed.success) return { document: parsed.data, legacy: false };
  } catch {
    /* Legacy text drafts are preserved until the user explicitly saves. */
  }
  const document = emptyResume();
  document.sections = Array.from(
    { length: Math.max(1, Math.ceil(content.length / 5000)) },
    (_, index) => ({
      id: index === 0 ? id : crypto.randomUUID(),
      title: `原有文字草稿${content.length > 5000 ? ` ${index + 1}` : ''}`,
      body: content.slice(index * 5000, (index + 1) * 5000),
    })
  );
  return { document, legacy: true };
}
