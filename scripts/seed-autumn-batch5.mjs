/**
 * 第五批秋招岗位：新能源 / AI / 电商平台
 * Run: node scripts/seed-autumn-batch5.mjs
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

const jobs = [
  {
    company: '宁德时代',
    title: '宁德时代 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '宁德',
    industry: '新能源',
    cohort: '2027 届',
    responsibilities:
      '开放研发、工艺工程、职能、质量管理等岗位，覆盖动力电池、储能、零碳科技等业务。动力电池使用量连续 9 年全球第一，储能电池出货量连续 5 年全球第一。',
    requirements:
      '2027 届应届毕业生（毕业时间 2026 年 7 月—2027 年 12 月），化学、材料、机械、电气、计算机、AI、数据科学等理工科专业为主。',
    source_url: 'https://talent.catl.com/#/',
    apply_url: 'https://talent.catl.com/#/',
    aliases: ['宁德时代', 'CATL', '宁德新能源'],
  },
  {
    company: '商汤科技',
    title: '商汤科技 2027 校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '人工智能',
    cohort: '2027 届',
    responsibilities:
      '开放模型研究（Agent Harness 研究员、大模型 Agent 算法、多模态基模型、强化学习系统）、AI Infra（推理 Infra 开发、模型推理平台）、全栈开发（AI 开发、Agent 全栈）、AI 产品（AI 产品经理）、FDE 工程师等岗位。重磅推出「无限原力」顶尖人才计划，岗位需求同比增 35%。全年开放投递，同一时间最多投 3 个岗位。',
    requirements:
      '2027 届应届毕业生（毕业时间 2026 年 9 月—2027 年 12 月），本科、硕士、博士。',
    source_url: 'https://hr.sensetime.com/',
    apply_url: 'https://hr.sensetime.com/',
    aliases: ['商汤科技', 'SenseTime', '商汤'],
  },
  {
    company: '淘天集团',
    title: '淘天集团 2027 届应届生招聘（秋招）',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '电商',
    cohort: '2027 届',
    responsibilities:
      '开放技术类、产品类、运营类、设计类、数据类 3 大职类、50+ 职位方向，技术类占比超 9 成，岗位全面拥抱 AI。淘宝、天猫、天猫超市、天猫国际、闲鱼、1688、淘宝直播、阿里妈妈等业务。',
    requirements:
      '毕业时间在 2026 年 11 月 1 日—2027 年 10 月 31 日期间的同学。',
    source_url: 'https://talent.taotian.com/',
    apply_url: 'https://talent.taotian.com/',
    aliases: ['淘天集团', '淘天', 'Taobao and Tmall Group'],
  },
  {
    company: '小红书',
    title: '小红书 2027 校园招聘（含大商业培训生）',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放技术方向（搜索、推荐、广告、基座大模型、AI Agent、AI Infra、AI Coding、多模态等）与非技术方向（产品、商业、设计、运营、HR、战略、职能、数据）。另设「大商业培训生」计划，方向含商业化运营、广告销售、品牌合作与内容营销、商业产品与策略分析、数据分析与商业洞察。',
    requirements:
      '2027 届全球本硕博应届生（毕业时间 2026 年 9 月—2027 年 8 月）。',
    source_url: 'https://job.xiaohongshu.com/',
    apply_url: 'https://job.xiaohongshu.com/',
    aliases: ['小红书', 'Xiaohongshu', '行吟信息科技'],
  },
];

let inserted = 0;
let updated = 0;
let failed = 0;

for (const job of jobs) {
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
    const { error } = await db.from('job_catalog').update(payload).eq('id', existing[0].id);
    if (error) { failed += 1; console.error(`更新失败 [${job.company}]: ${error.message}`); }
    else { updated += 1; }
    continue;
  }

  const { error } = await db.from('job_catalog').insert(payload);
  if (error) { failed += 1; console.error(`插入失败 [${job.company}]: ${error.message}`); }
  else { inserted += 1; }
}

console.log(`\n第五批完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${jobs.length} 条。`);
