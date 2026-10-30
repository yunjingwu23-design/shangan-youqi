import { z } from 'zod';
export const emailSchema = z.string().trim().toLowerCase().email('请输入有效的邮箱地址').max(254);
export const otpRequestSchema = z.object({ email: emailSchema }).strict();
export const otpVerifySchema = z
  .object({ email: emailSchema, token: z.string().regex(/^\d{6}$/, '请输入 6 位验证码') })
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
export const statusSchema = z.enum(['planned', 'applied', 'interview', 'offer', 'closed']);
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
  .partial()
  .extend({ id: z.string().uuid() })
  .strict();
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
export const statusLabels = {
  planned: '想投递',
  applied: '已投递',
  interview: '面试中',
  offer: 'Offer',
  closed: '已结束',
};
