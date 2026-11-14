import { z } from 'zod';
import {
  feedbackKindLabels,
  feedbackKindOptions,
  feedbackStatusLabels,
  feedbackStatusOptions,
  type FeedbackItem,
  type FeedbackKind,
  type FeedbackStatus,
} from '@/lib/feedback-options';

export {
  feedbackKindLabels,
  feedbackKindOptions,
  feedbackStatusLabels,
  feedbackStatusOptions,
  type FeedbackItem,
  type FeedbackKind,
  type FeedbackStatus,
};

export const feedbackInputSchema = z.object({
  kind: z.enum(['bug', 'suggestion', 'content', 'other']).default('suggestion'),
  content: z
    .string()
    .trim()
    .min(4, '请至少写 4 个字，方便我们判断问题。')
    .max(2000, '内容请控制在 2000 字以内。'),
  contact: z.string().trim().max(120, '联系方式请控制在 120 字以内。').optional(),
  pagePath: z.string().trim().max(240).optional(),
});

export const feedbackUpdateSchema = z.object({
  status: z.enum(['new', 'reviewing', 'resolved', 'dismissed']).optional(),
  adminNote: z.string().trim().max(1000, '备注请控制在 1000 字以内。').optional(),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export function toFeedbackItem(row: Record<string, unknown>): FeedbackItem {
  return {
    id: String(row.id),
    kind: row.kind as FeedbackKind,
    content: String(row.content ?? ''),
    contact: (row.contact as string | null) ?? null,
    pagePath: (row.page_path as string | null) ?? null,
    userAgent: (row.user_agent as string | null) ?? null,
    status: row.status as FeedbackStatus,
    adminNote: (row.admin_note as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}
