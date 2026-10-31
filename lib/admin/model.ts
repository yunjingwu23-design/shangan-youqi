import { z } from 'zod';
import { jobTypeSchema, type CatalogJob } from '@/lib/catalog';
export const adminRoles = {
  super_admin: '超级管理员',
  editor: '内容编辑',
  reviewer: '审核员',
} as const;
export const adminRoleSchema = z.enum(['super_admin', 'editor', 'reviewer']);
export type AdminRole = z.infer<typeof adminRoleSchema>;
export const adminActionLabels: Record<string, string> = {
  bootstrap: '初始化超级管理员',
  invite_created: '创建管理员邀请',
  invite_accepted: '领取管理员邀请',
  invite_revoked: '撤销管理员邀请',
  membership_changed: '变更管理员权限',
  jd_file_registered: '上传 JD 原件',
  draft_created: '新建草稿',
  draft_saved: '保存草稿',
  submit: '提交审核',
  withdraw: '撤回审核',
  approve: '审核通过',
  reject: '驳回修改',
  publish: '发布岗位',
  close: '下架岗位',
  expire: '处理过期',
  revise: '开始修订',
};
export const jobStates = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已批准',
  rejected: '已驳回',
  published: '已发布',
  closed: '已下架',
  expired: '已过期',
} as const;
export type JobState = keyof typeof jobStates;
export function adminStateLabel(value: string | null) {
  if (!value) return '—';
  const [role, status] = value.split(':');
  if (role in adminRoles)
    return (
      adminRoles[role as AdminRole] +
      (status === 'active' ? ' · 启用' : status === 'disabled' ? ' · 停用' : '')
    );
  return jobStates[value as JobState] || value;
}
export const jobStateSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'published',
  'closed',
  'expired',
]);
const https = z
  .string()
  .max(2000)
  .refine((text) => {
    if (!text) return true;
    try {
      const url = new URL(text);
      return url.protocol === 'https:' && !url.username && !url.password && !/\s/.test(text);
    } catch {
      return false;
    }
  }, '请输入不含账号密码的 HTTPS 链接。');
const date = z.iso.datetime({ offset: true }).nullable().default(null);
export const adminDraftSchema = z
  .object({
    company: z.string().trim().min(1, '请填写公司。').max(100),
    title: z.string().trim().min(1, '请填写岗位名称。').max(120),
    type: jobTypeSchema,
    city: z.string().trim().max(60).default(''),
    industry: z.string().trim().max(60).default(''),
    cohort: z.string().trim().max(60).default(''),
    responsibilities: z.string().max(12000).default(''),
    requirements: z.string().max(6000).default(''),
    source_url: https.default(''),
    apply_url: https.default(''),
    contacts: z
      .array(z.object({ email: z.email().max(254), label: z.string().max(60) }).strict())
      .max(5)
      .default([]),
    mail_subject: z.string().max(200).default(''),
    aliases: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    retention_evidence: z.string().max(2000).default(''),
    application_instructions: z.string().max(6000).default(''),
    raw_jd: z.string().max(50000).default(''),
    deadline_at: date,
    source_published_at: date,
    source_file_id: z.uuid().nullable().default(null),
  })
  .strict();
export type AdminDraft = z.infer<typeof adminDraftSchema>;
export const adminSaveSchema = z
  .object({
    id: z.uuid().optional(),
    expectedVersion: z.number().int().positive().optional(),
    job: adminDraftSchema,
  })
  .strict()
  .refine((value) => !value.id || value.expectedVersion !== undefined, '请读取岗位版本后再保存。');
export const transitionSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    action: z.enum([
      'submit',
      'withdraw',
      'approve',
      'reject',
      'publish',
      'close',
      'expire',
      'revise',
    ]),
    reason: z.string().max(2000).default(''),
    sourceChecked: z.boolean().default(false),
  })
  .strict();
export type JobAction = z.infer<typeof transitionSchema>['action'];
export type AdminJob = Omit<CatalogJob, 'state'> &
  AdminDraft & {
    state: JobState;
    version: number;
    revision: number;
    created_by: string | null;
    updated_by: string | null;
    approved_by: string | null;
    approved_revision: number | null;
    created_at: string;
    submitted_at: string | null;
    reviewed_at: string | null;
  };
export type JobSource = {
  id: string;
  job_id: string;
  revision: number;
  kind: 'paste' | 'file' | 'legacy';
  original_jd: string;
  corrected_jd: string;
  source_url: string;
  source_published_at: string | null;
  file_id: string | null;
  captured_by: string | null;
  captured_at: string;
};
export type AdminEvent = {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string;
  actor_role: string;
  job_id?: string | null;
  version: number | null;
  from_state: string | null;
  to_state: string | null;
  note: string;
  created_at: string;
  self_review?: boolean;
};
export type Member = {
  user_id: string;
  email: string;
  role: AdminRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export const emptyAdminDraft: AdminDraft = {
  company: '',
  title: '',
  type: 'daily_internship',
  city: '',
  industry: '',
  cohort: '',
  responsibilities: '',
  requirements: '',
  source_url: '',
  apply_url: '',
  contacts: [],
  mail_subject: '',
  aliases: [],
  retention_evidence: '',
  application_instructions: '',
  raw_jd: '',
  deadline_at: null,
  source_published_at: null,
  source_file_id: null,
};
export function editableJob(job: AdminJob, role: AdminRole, userId: string) {
  return (
    (role === 'super_admin' || (role === 'editor' && job.created_by === userId)) &&
    ['draft', 'rejected'].includes(job.state)
  );
}
export function jobActions(job: AdminJob, role: AdminRole, userId: string): JobAction[] {
  const edit = role === 'super_admin' || (role === 'editor' && job.created_by === userId),
    review = role === 'super_admin' || role === 'reviewer';
  if (['draft', 'rejected'].includes(job.state)) return edit ? ['submit'] : [];
  if (job.state === 'pending_review')
    return [
      ...(edit ? ['withdraw' as const] : []),
      ...(review && (role === 'super_admin' || job.created_by !== userId)
        ? ['approve' as const, 'reject' as const]
        : []),
    ];
  if (job.state === 'approved')
    return [
      ...(review ? ['publish' as const, 'close' as const] : []),
      ...(edit ? ['revise' as const] : []),
    ];
  if (job.state === 'published')
    return [...(review ? ['close' as const] : []), ...(edit ? ['revise' as const] : [])];
  return edit ? ['revise'] : [];
}
export function beijingTime(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
    : '—';
}
export function dateInput(value: string | null) {
  return value ? new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 16) : '';
}
export function dateFromInput(value: string) {
  return value ? new Date(value + ':00+08:00').toISOString() : null;
}
