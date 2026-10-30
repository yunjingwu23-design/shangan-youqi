import { z } from 'zod';

export const AUDIO_BUCKET = 'interview-audio';
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 120 * 60;
export const CONSENT_VERSION = '2026-10-31';
export const uploadSchema = z
  .object({
    jobId: z.uuid(),
    title: z.string().trim().min(1).max(120),
    round: z.string().trim().min(1).max(60),
    fileName: z
      .string()
      .min(1)
      .max(200)
      .refine((v) => !/[\\/\x00-\x1f]/.test(v), '文件名无效'),
    fileSize: z.number().int().min(1).max(MAX_AUDIO_BYTES, '录音最大为 50 MiB'),
    mimeType: z.enum([
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/x-m4a',
      'audio/wav',
      'audio/x-wav',
      'audio/webm',
      'video/webm',
      'video/mp4',
      'audio/ogg',
      'application/ogg',
    ]),
    recordingConsent: z.literal(true, '请确认录音来源合法且已获得必要授权'),
    contextConsent: z.boolean(),
    jd: z.string().max(10000).default(''),
    resume: z.string().max(15000).default(''),
  })
  .strict()
  .refine((v) => v.contextConsent || (!v.jd && !v.resume), '使用 JD 或简历前请单独确认授权');
export const segmentSchema = z
  .object({
    id: z.uuid(),
    speaker: z.string().trim().min(1).max(40),
    start: z.number().min(0).max(MAX_AUDIO_SECONDS),
    end: z.number().min(0).max(MAX_AUDIO_SECONDS),
    text: z.string().trim().min(1).max(20000),
  })
  .strict()
  .refine((v) => v.end >= v.start, '段落结束时间不能早于开始时间');
export const segmentsSchema = z
  .array(segmentSchema)
  .min(1)
  .max(500)
  .refine((v) => new Set(v.map((s) => s.id)).size === v.length, '段落 ID 不能重复')
  .refine((v) => v.reduce((n, s) => n + s.text.length, 0) <= 120000, '逐字稿总长度超出分析上限');
export const transcriptSchema = z
  .object({ version: z.number().int().min(1), segments: segmentsSchema })
  .strict();
export const evidenceSchema = z
  .object({ segment_id: z.string(), quote: z.string().min(1).max(1000) })
  .strict();
export const reportSchema = z
  .object({
    summary: z.string().max(3000),
    observations: z
      .array(
        z
          .object({
            category: z.enum(['表达结构', '岗位匹配', '项目证据', '沟通澄清']),
            finding: z.string().max(2000),
            evidence: z.array(evidenceSchema).min(1).max(5),
            suggestion: z.string().max(2000),
            uncertainty: z.string().max(1000),
          })
          .strict()
      )
      .max(20),
    action_plan: z
      .array(
        z
          .object({
            action: z.string().max(1000),
            reason: z.string().max(1000),
            priority: z.enum(['high', 'medium', 'low']),
            evidence_segment_ids: z.array(z.string()).max(10),
          })
          .strict()
      )
      .max(12),
    unknowns: z.array(z.string().max(1000)).max(20),
  })
  .strict();
export type Segment = z.infer<typeof segmentSchema>;
export type InterviewReport = z.infer<typeof reportSchema>;
export function validateEvidence(report: InterviewReport, segments: Segment[]) {
  const byId = new Map(segments.map((s) => [s.id, s.text]));
  for (const observation of report.observations)
    for (const evidence of observation.evidence) {
      if (!byId.get(evidence.segment_id)?.includes(evidence.quote))
        throw new Error('REPORT_EVIDENCE_INVALID');
    }
  for (const action of report.action_plan)
    for (const id of action.evidence_segment_ids) {
      if (!byId.has(id)) throw new Error('REPORT_EVIDENCE_INVALID');
    }
  return report;
}
