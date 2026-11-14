/**
 * Seed autumn-recruitment (秋招) job postings into public.job_catalog.
 * Run: node scripts/seed-autumn-jobs.mjs
 *
 * Rows come from publicly available recruitment announcements (official career
 * sites + university career-portal re-posts). Only factual JD metadata is
 * stored; apply_url points to the company's official hiring channel.
 *
 * Writes via service_role so rows are published directly (state='published'
 * with verified_at/published_at set).
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('缺少 SUPABASE 配置。');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const now = new Date().toISOString();

const autumnJobs = [
  {
    company: '腾讯',
    title: '腾讯 2027 校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '面向 2027 届毕业生开放技术类、产品类、设计类、市场类、职能类五大类岗位，含 AI 全栈工程师、Agent 开发工程师、AI 应用工程师、AI 算法工程、AI 产品经理等全新 AI 岗位。',
    requirements:
      '毕业时间在 2026 年 1 月至 2027 年 12 月之间。具体学历、专业要求以各岗位 JD 为准，设计类需提交作品集。',
    source_url: 'https://join.qq.com/',
    apply_url: 'https://join.qq.com/',
    aliases: ['腾讯', 'Tencent', '腾讯校招'],
  },
  {
    company: '腾讯音乐',
    title: '腾讯音乐 2027 校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities: '开放技术、产品、设计、内容、市场、专业等方向岗位。',
    requirements: '2027 届毕业生。',
    source_url: 'https://join.tencentmusic.com/campus/',
    apply_url: 'https://join.tencentmusic.com/campus/',
    aliases: ['腾讯音乐', 'TME'],
  },
  {
    company: '拼多多',
    title: '拼多多 2027 校园招聘正式批（秋招）',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '电商',
    cohort: '2027 届',
    responsibilities:
      '正式批 3000+ offer、7 大职类全面开放，含运营管培生（招商运营、社群团长运营、卖场运营）、产品管培生、市场管培生、商家运营、HR 管培生等。杭州有电商运营、商家运营岗位。',
    requirements:
      '2027 届应届毕业生（毕业时间 2026 年 9 月—2027 年 8 月），本科及以上。同一批次仅 1 次投递机会。',
    source_url: 'https://careers.pddglobalhr.net/campus',
    apply_url: 'https://careers.pddglobalhr.net/campus',
    aliases: ['拼多多', 'PDD', '拼多多集团'],
  },
  {
    company: '快手',
    title: '快手 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放算法类、工程类、产品类、运营类、游戏类、设计类、市场类、销售类、职能类、战略分析类、项目管理类十一大类别，200+ 岗位。',
    requirements:
      '2026 年 11 月—2027 年 10 月期间毕业的 2027 届本/硕/博应届生，最高学历后无全职工作经历。一次限投一个岗位。',
    source_url: 'https://campus.kuaishou.cn/',
    apply_url: 'https://campus.kuaishou.cn/',
    aliases: ['快手', 'Kuaishou'],
  },
  {
    company: '影石 Insta360',
    title: '影石 Insta360 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '智能硬件',
    cohort: '2027 届',
    responsibilities:
      '开放技术类（算法、嵌入式、移动开发等）、产品类（产品经理、产品运营）、业务类（国内/跨境电商、市场、销售、数据分析）、综合类（管培生、财务、税务、人力、法务）等 6 大类、百余个职位。',
    requirements:
      '2027 届毕业生（毕业时间 2026 年 9 月—2027 年 8 月）。算法岗需硕士起，有 CCF-B 及以上一作论文加分。',
    source_url: 'https://www.insta360.com/cn/jobs',
    apply_url: 'https://www.insta360.com/cn/jobs',
    aliases: ['影石', 'Insta360', '影石Insta360'],
  },
  {
    company: '字节跳动',
    title: '字节跳动 2027 校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放研发、产品、运营、设计、市场、职能/支持、销售、游戏策划八大类岗位，重点向技术与产品倾斜，加大 AI 人才储备。',
    requirements: '2026 年 9 月至 2027 年 8 月期间毕业的 2027 届应届毕业生。',
    source_url: 'https://jobs.bytedance.com/campus',
    apply_url: 'https://jobs.bytedance.com/campus',
    aliases: ['字节跳动', 'ByteDance', '字节'],
  },
  {
    company: '美团',
    title: '美团 2027 届校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放技术、产品、商业分析、运营、零售、销售等 10 大类、100 余种岗位，新增 AI 全栈工程师、AI 产品 Builder、AI 产品经理、智能商业分析师等岗位。',
    requirements: '2026 年 11 月至 2027 年 10 月毕业的 2027 届海内外应届生。',
    source_url: 'https://campus.meituan.com/',
    apply_url: 'https://campus.meituan.com/',
    aliases: ['美团', 'Meituan'],
  },
  {
    company: '百度',
    title: '百度 2027 届校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放技术、产品、政企、销售、综合五大方向 74 个细分职位，覆盖大模型、智能体、多模态、AI Infra、自动驾驶等赛道，AI 相关岗位占比超 90%。',
    requirements: '2027 届毕业生（毕业时间 2026 年 9 月—2027 年 8 月）。',
    source_url: 'https://talent.baidu.com/',
    apply_url: 'https://talent.baidu.com/',
    aliases: ['百度', 'Baidu'],
  },
  {
    company: '网易',
    title: '网易 2027 校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放技术、人工智能、市场、产品、运营、企业服务、职能支持 7 大类岗位。产品与运营岗不限专业。',
    requirements: '2026 年 9 月—2027 年 8 月毕业。',
    source_url: 'https://campus.163.com/',
    apply_url: 'https://campus.163.com/',
    aliases: ['网易', 'NetEase'],
  },
  {
    company: '阿里巴巴',
    title: '阿里巴巴集团 2027 届校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放技术类、产品类、运营类、设计类、市场类岗位，AI 岗位占比高。每个业务集团仅 1 次机会，最多选 2 个意向。',
    requirements: '2027 届毕业生。',
    source_url: 'https://campus-talent.alibaba.com/',
    apply_url: 'https://campus-talent.alibaba.com/',
    aliases: ['阿里巴巴', 'Alibaba', '阿里'],
  },
  {
    company: '小红书',
    title: '小红书 2027 校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities: '开放技术、产品、运营、设计、市场、职能等方向岗位。',
    requirements: '2027 届毕业生。',
    source_url: 'https://job.xiaohongshu.com/',
    apply_url: 'https://job.xiaohongshu.com/',
    aliases: ['小红书', 'Xiaohongshu'],
  },
  {
    company: '京东',
    title: '京东 2027 校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '电商',
    cohort: '2027 届',
    responsibilities: '开放技术、产品、运营、采销、供应链、市场、职能等方向岗位。',
    requirements: '2027 届毕业生。',
    source_url: 'https://campus.jd.com/',
    apply_url: 'https://campus.jd.com/',
    aliases: ['京东', 'JD.com'],
  },
];

let inserted = 0;
let updated = 0;
let failed = 0;

for (const job of autumnJobs) {
  const { data: existing } = await db
    .from('job_catalog')
    .select('id')
    .eq('company', job.company)
    .eq('title', job.title)
    .limit(1);

  const payload = {
    company: job.company,
    title: job.title,
    type: job.type,
    city: job.city,
    industry: job.industry,
    cohort: job.cohort,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    source_url: job.source_url,
    apply_url: job.apply_url,
    contacts: [],
    mail_subject: '',
    aliases: job.aliases,
    retention_evidence: '',
    state: 'published',
    verified_at: now,
    published_at: now,
    updated_at: now,
  };

  if (existing && existing.length > 0) {
    const { error } = await db
      .from('job_catalog')
      .update(payload)
      .eq('id', existing[0].id);
    if (error) {
      failed += 1;
      console.error(`更新失败 [${job.company}] ${job.title}: ${error.message}`);
    } else {
      updated += 1;
    }
    continue;
  }

  const { error } = await db.from('job_catalog').insert(payload);
  if (error) {
    failed += 1;
    console.error(`插入失败 [${job.company}] ${job.title}: ${error.message}`);
  } else {
    inserted += 1;
  }
}

console.log(`\n完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${autumnJobs.length} 条。`);
