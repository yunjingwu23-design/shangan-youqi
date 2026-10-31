import { z } from 'zod';
export const jobTypes = {
  daily_internship: '日常实习',
  conversion_internship: '转正实习',
  autumn_recruitment: '秋招',
  spring_recruitment: '春招',
};
export type JobType = keyof typeof jobTypes;
export const jobTypeSchema = z.enum([
  'daily_internship',
  'conversion_internship',
  'autumn_recruitment',
  'spring_recruitment',
]);
const externalUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }, '请填写不含账号密码的 HTTPS 来源链接');
export const catalogJobSchema = z
  .object({
    company: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(120),
    type: jobTypeSchema,
    city: z.string().trim().min(1).max(60),
    industry: z.string().trim().max(60),
    cohort: z.string().trim().max(60),
    responsibilities: z.string().trim().min(1).max(12000),
    requirements: z.string().trim().min(1).max(6000),
    source_url: externalUrl,
    apply_url: externalUrl,
    contacts: z
      .array(z.object({ email: z.email().max(254), label: z.string().max(60) }).strict())
      .max(5),
    mail_subject: z.string().max(200),
    aliases: z.array(z.string().trim().min(1).max(60)).max(30),
    retention_evidence: z.string().trim().max(2000),
    state: z.enum(['draft', 'published', 'closed']),
  })
  .strict()
  .refine((job) => job.state === 'draft' || Boolean(job.source_url), '发布前必须提供招聘来源')
  .refine(
    (job) =>
      job.state === 'draft' ||
      job.type !== 'conversion_internship' ||
      Boolean(job.retention_evidence),
    '转正实习必须有来源中的留用说明原文'
  );
export type CatalogJob = z.infer<typeof catalogJobSchema> & {
  id: string;
  verified_at: string | null;
  published_at: string | null;
  updated_at: string;
  preview?: boolean;
  application_instructions?: string;
  deadline_at?: string | null;
};
export const exampleJobs: CatalogJob[] = [
  {
    id: 'sample-postfund',
    company: '中邮基金',
    title: '运营助理实习生（样品）',
    type: 'daily_internship',
    city: '北京',
    industry: '金融',
    cohort: '在校生',
    responsibilities: '协助平台日常运营、数据整理、行业研究及营销物料制作。',
    requirements: '经济金融相关专业，熟练使用办公软件。具体要求需以招聘方正式信息为准。',
    aliases: ['中邮', 'postfund'],
    retention_evidence: '',
  },
  {
    id: 'sample-cicc',
    company: '中金公司',
    title: '投资银行实习（样品）',
    type: 'conversion_internship',
    city: '上海',
    industry: '金融',
    cohort: '在校生',
    responsibilities: '协助项目研究与材料整理。此内容来自交互样品，不代表正在招聘。',
    requirements: '示例岗位，仅用于体验搜索与详情页面。',
    aliases: ['中金', 'CICC', '中国国际金融股份有限公司'],
    retention_evidence: '',
  },
  {
    id: 'sample-finance',
    company: '某科技公司',
    title: '财务 BP 校招生（样品）',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities: '支持业务预算和财务分析。',
    requirements: '财务、会计及相关专业。此条不对应真实招聘。',
    aliases: ['财务分析', '账务', 'finance business partner'],
    retention_evidence: '',
  },
  {
    id: 'sample-consulting',
    company: '某咨询机构',
    title: '咨询顾问（样品）',
    type: 'spring_recruitment',
    city: '北京',
    industry: '咨询',
    cohort: '2027 届',
    responsibilities: '协助行业研究与报告撰写。',
    requirements: '具备分析与沟通能力。此条不对应真实招聘。',
    aliases: ['顾问', 'consulting'],
    retention_evidence: '',
  },
].map((job) => ({
  ...job,
  source_url: '',
  apply_url: '',
  contacts: [],
  mail_subject: '',
  state: 'draft' as const,
  verified_at: null,
  published_at: null,
  updated_at: '',
  preview: true,
})) as CatalogJob[];
export function filterJobs(
  jobs: CatalogJob[],
  query: {
    q?: string;
    mode?: string;
    type?: string;
    city?: string;
    industry?: string;
    cohort?: string;
  }
) {
  const q = (query.q || '').trim().toLocaleLowerCase().normalize('NFKC');
  return jobs.filter(
    (job) =>
      (!query.type || job.type === query.type) &&
      (!query.city || job.city === query.city) &&
      (!query.industry || job.industry === query.industry) &&
      (!query.cohort || job.cohort === query.cohort) &&
      (!q ||
        [job.company, job.title, job.city, ...(query.mode === 'exact' ? [] : job.aliases)].some(
          (text) => text.toLocaleLowerCase().normalize('NFKC').includes(q)
        ))
  );
}
