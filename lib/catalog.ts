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
// 岗位大类关键词规则（命中多个则全部收录；无命中兜底「综合」）
const categoryRules: { cat: string; keywords: string[] }[] = [
  { cat: '管培生', keywords: ['管培生', '培训生', '校招生', '菁英计划', '起航', '虹途生', '工培生', '培养生', 'GMT', '管理培训生', '储备岗', '储干'] },
  { cat: '技术研发', keywords: ['算法', '开发', '工程师', '软件', '大数据', '人工智能', '大模型', '机器学习', '前端', '后端', '全栈', '测试', '运维', 'SRE', '信息安全', '数据开发', '程序', 'Java', 'Python', 'C++', 'Android', 'iOS', '架构', '算力', '推理', '框架', '视觉', '智能', '芯片', '半导体'] },
  { cat: '金融投研', keywords: ['投行', '研究员', '交易', '资管', '财富管理', '结算', '量化', '风控', '投研', '投融资', '基金', '证券', '分析师', '固收', '权益', '债券', '信贷', '保险', '财会'] },
  { cat: '供应链物流', keywords: ['供应链', '物流', '仓储', '采购', '生产', '制造', '工艺', '质量', '设备', '电气', '机械', '材料', '能动', '智能制造', '履约', '计划', '品控', '电力', '能源', '煤炭', '核电', '水电', '风电', '光伏', '储能', '氢能', '铁路', '运输', '机务', '车辆', '工务', '电务', '供电', '港口', '化工', '矿山', '冶炼'] },
  { cat: '电商', keywords: ['电商', '跨境电商', '买手', '商品企划', '商品管理', '商品运营', '品类', '平台运营', '直播', '店铺'] },
  { cat: '产品', keywords: ['产品经理', '产品设计', '产品运营', '用户研究', '交互', '策略产品'] },
  { cat: '运营', keywords: ['运营', '内容', '新媒体', '商家运营', '用户运营', '社区', '达人', 'KOL', '种草', '编辑', '采编', '发行', '版权', '酒店', '旅行', '免税', '旅游', '景区', '客服'] },
  { cat: '市场', keywords: ['市场', '品牌', '营销', '推广', '公关', '广告', '策划', '创意'] },
  { cat: '销售', keywords: ['销售', '商务', '客户', '渠道', '门店', '零售', '业务', '售前', '大客户', '经销', '网点'] },
  { cat: '职能', keywords: ['财务', '人力', '法务', '行政', '合规', '审计', '会计', '税务', '招聘', 'HR', '文秘', '党建', '党办', '公共事务'] },
  { cat: '设计', keywords: ['设计', '美术', '视觉', 'UI', 'UX', '珠宝设计', '服装设计', '平面', '工业设计', '造型'] },
];
export const jobCategoryOrder = [
  '技术研发', '产品', '运营', '市场', '销售', '管培生', '职能', '金融投研', '供应链物流', '电商', '设计', '综合',
];
export function jobCategories(job: CatalogJob): string[] {
  const text = job.responsibilities || '';
  const hits: string[] = [];
  for (const rule of categoryRules) {
    if (rule.keywords.some((k) => text.includes(k))) hits.push(rule.cat);
  }
  const uniq = [...new Set(hits)];
  return uniq.length ? uniq : ['综合'];
}
export function allJobCategories(jobs: CatalogJob[]): string[] {
  const seen = new Set<string>();
  for (const job of jobs) for (const c of jobCategories(job)) seen.add(c);
  return jobCategoryOrder.filter((c) => seen.has(c));
}
export function filterJobs(
  jobs: CatalogJob[],
  query: {
    q?: string;
    mode?: string;
    type?: string;
    city?: string;
    industry?: string;
    cohort?: string;
    category?: string;
  }
) {
  const q = (query.q || '').trim().toLocaleLowerCase().normalize('NFKC');
  return jobs.filter(
    (job) =>
      (!query.type || job.type === query.type) &&
      (!query.city || job.city === query.city) &&
      (!query.industry || job.industry === query.industry) &&
      (!query.cohort || job.cohort === query.cohort) &&
      (!query.category || jobCategories(job).includes(query.category)) &&
      (!q ||
        [job.company, job.title, job.city, ...(query.mode === 'exact' ? [] : job.aliases)].some(
          (text) => text.toLocaleLowerCase().normalize('NFKC').includes(q)
        ))
  );
}
