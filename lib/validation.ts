import { z } from 'zod';
import { OTP_PATTERN } from './otp';
import { statusValues } from './application-status';
export { statusLabels } from './application-status';
export const emailSchema = z.string().trim().toLowerCase().email('请输入有效的邮箱地址').max(254);
export const otpRequestSchema = z.object({ email: emailSchema }).strict();
export const otpVerifySchema = z
  .object({
    email: emailSchema,
    token: z.string().regex(OTP_PATTERN, '请输入邮件中的完整验证码（6–10 位数字）'),
  })
  .strict();
export const profileSchema = z
  .object({
    full_name: z.string().trim().max(60),
    desired_role: z.string().trim().max(100),
    city: z.string().trim().max(60),
    bio: z.string().trim().max(1000),
  })
  .strict();
export const kindSchema = z.enum(['application', 'resume', 'favorite', 'interview_review']);
export const statusSchema = z.enum(statusValues);
const safeUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, '请输入 http 或 https 链接');
export const entrySchema = z
  .object({
    kind: kindSchema,
    title: z.string().trim().min(1, '请填写标题').max(120),
    company: z.string().trim().max(100).default(''),
    status: statusSchema.default('planned'),
    content: z.string().max(20000).default(''),
    url: safeUrl.default(''),
  })
  .strict();
export const entryPatchSchema = entrySchema
  .omit({ kind: true })
  // Zod 4 applies nested defaults even inside partial objects. A PATCH must only
  // write submitted fields; changing a stage must not clear notes/company/URL.
  .extend({
    company: entrySchema.shape.company.removeDefault(),
    status: statusSchema,
    content: entrySchema.shape.content.removeDefault(),
    url: safeUrl,
  })
  .partial()
  .extend({ id: z.string().uuid() })
  .strict();
export const scheduleKindSchema = z.enum([
  'deadline',
  'online_test',
  'interview',
  'review',
  'follow_up',
  'other',
]);
const scheduleFields = {
  title: z.string().trim().min(1, '请填写日程标题').max(120, '标题不超过 120 字'),
  kind: scheduleKindSchema,
  company: z.string().trim().max(100, '公司名称不超过 100 字'),
  role: z.string().trim().max(100, '岗位名称不超过 100 字'),
  job_entry_id: z.string().uuid('关联岗位无效').nullable(),
  starts_at: z
    .string()
    .max(40)
    .refine((value) => !Number.isNaN(Date.parse(value)), '请选择有效的日期与时间'),
  duration_minutes: z.number().int().min(5).max(1440).nullable(),
  remind_days: z.number().int().min(0).max(30),
  note: z.string().max(2000, '备注不超过 2000 字'),
  state: z.enum(['open', 'done']),
};
export const scheduleEventSchema = z
  .object({
    ...scheduleFields,
    kind: scheduleFields.kind.default('deadline'),
    company: scheduleFields.company.default(''),
    role: scheduleFields.role.default(''),
    job_entry_id: scheduleFields.job_entry_id.default(null),
    duration_minutes: scheduleFields.duration_minutes.default(null),
    remind_days: scheduleFields.remind_days.default(1),
    note: scheduleFields.note.default(''),
    state: scheduleFields.state.default('open'),
  })
  .strict();
// PATCH only writes what was submitted: keep every field optional without defaults.
export const schedulePatchSchema = z.object(scheduleFields).partial().strict();
export type ScheduleEventInput = z.infer<typeof scheduleEventSchema>;
export type Profile = z.infer<typeof profileSchema> & { user_id: string; updated_at: string };
export type Entry = z.infer<typeof entrySchema> & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};
export const kindLabels = {
  application: '投递记录',
  resume: '简历草稿',
  favorite: '我的收藏',
  interview_review: '面试复盘',
};
