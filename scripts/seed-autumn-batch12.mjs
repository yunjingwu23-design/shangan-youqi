/**
 * 第十二批秋招岗位：家电 / 物流 / AI 大模型
 * Run: node scripts/seed-autumn-batch12.mjs
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
    company: '顺丰集团',
    title: '顺丰集团 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '物流',
    cohort: '2027 届',
    responsibilities:
      '开放十大人才航向：管培生、职能、研发、经营管理等岗位，工作地点全国多地。',
    requirements:
      '2027 届应届生，专业不限，物流、计算机、管理等相关专业优先。',
    source_url: 'https://campus.sf-express.com',
    apply_url: 'https://campus.sf-express.com',
    aliases: ['顺丰集团', 'SF Express'],
  },
  {
    company: '京东物流',
    title: '京东物流 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '物流 / 供应链',
    cohort: '2027 届',
    responsibilities:
      '开放技术、运营、供应链、仓储、职能等岗位，工作地点北京及全国。',
    requirements:
      '2027 届应届生，专业不限，物流、计算机、管理等相关专业优先。',
    source_url: 'https://campus.jd.com',
    apply_url: 'https://campus.jd.com',
    aliases: ['京东物流', 'JD Logistics'],
  },
  {
    company: '海信集团',
    title: '海信集团 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '青岛',
    industry: '家电 / 消费电子',
    cohort: '2027 届',
    responsibilities:
      '开放研发技术、供应链及制造、职能、营销等序列岗位，涵盖计算机、软件、数学、电子、机械、制冷、经济、营销、小语种等专业，工作地点青岛、顺德、武汉、上海、深圳等及海外外派。',
    requirements:
      '2027 届全球高校应届毕业生（2026 年 12 月—2027 年 8 月毕业）。',
    source_url: 'https://jobs.hisense.com',
    apply_url: 'https://jobs.hisense.com',
    aliases: ['海信集团', 'Hisense'],
  },
  {
    company: '创维集团',
    title: '创维集团 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '家电 / 消费电子',
    cohort: '2027 届',
    responsibilities:
      '开放技术研发、营销、智能制造、供应链、管理类岗位，工作地点深圳及珠三角、长三角等基地。',
    requirements:
      '2027 届海内外毕业生（2026 年 9 月—2027 年 8 月毕业）。',
    source_url: 'https://skyworth.hotjob.cn',
    apply_url: 'https://skyworth.hotjob.cn',
    aliases: ['创维集团', 'Skyworth'],
  },
  {
    company: '长虹控股集团',
    title: '长虹控股集团 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '绵阳',
    industry: '家电 / 消费电子',
    cohort: '2027 届',
    responsibilities:
      '开放产品工程师（结构/电控/制冷）、智能制造管培生、财务管培生、销售工程师等岗位，工作地点绵阳、合肥等。',
    requirements:
      '2027 届应届生，机械、电子、制冷、自动化、财务、营销等相关专业。',
    source_url: 'https://www.changhong.com',
    apply_url: 'https://www.changhong.com',
    aliases: ['长虹控股集团', 'Changhong'],
  },
  {
    company: '京东方',
    title: '京东方（BOE）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '半导体显示',
    cohort: '2027 届',
    responsibilities:
      '开放研发、工艺、设备、产品、市场、职能等岗位，聚焦显示与物联网，工作地点北京、合肥、成都、武汉、重庆、绵阳等。',
    requirements:
      '2027 届应届生，材料、物理、化学、电子、机械、自动化等相关专业。',
    source_url: 'https://campus.boe.com',
    apply_url: 'https://campus.boe.com',
    aliases: ['京东方', 'BOE'],
  },
  {
    company: '歌尔股份',
    title: '歌尔股份 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '潍坊',
    industry: '声学 / 消费电子',
    cohort: '2027 届',
    responsibilities:
      '开放声学、光学、电子、结构、软件、算法、制造等岗位，工作地点潍坊、青岛、深圳、北京、上海等。',
    requirements:
      '2027 届应届生，声学、电子、机械、软件、光学等相关专业。',
    source_url: 'https://www.goertek.com',
    apply_url: 'https://www.goertek.com',
    aliases: ['歌尔股份', 'Goertek'],
  },
  {
    company: '昆仑万维',
    title: '昆仑万维 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: 'AI 大模型 / 互联网',
    cohort: '2027 届',
    responsibilities:
      '开放 CEO 管理培训生、大模型算法、AI Infra、强化学习、神经网络、模型训练等岗位，聚焦 SkyReels、Mureka、Matrix-Game、Skywork 等 AI 平台。',
    requirements:
      '2027 届优秀高校毕业生，计算机、人工智能、软件工程、数据科学等专业，顶会论文/开源项目/竞赛获奖优先。',
    source_url: 'https://www.kunlun.com',
    apply_url: 'https://www.kunlun.com',
    aliases: ['昆仑万维', 'Kunlun'],
  },
  {
    company: 'DeepSeek',
    title: 'DeepSeek（深度求索）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: 'AI 大模型',
    cohort: '2027 届',
    responsibilities:
      '面向大模型研发与 AI Infra 方向开放研究、工程、算法等岗位，聚焦通用人工智能，工作地点杭州、北京等。',
    requirements:
      '2027 届应届生，人工智能、计算机、数学、物理等专业，硕士及以上学历优先。',
    source_url: 'https://www.deepseek.com',
    apply_url: 'https://www.deepseek.com',
    aliases: ['DeepSeek', '深度求索'],
  },
  {
    company: '阶跃星辰',
    title: '阶跃星辰 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: 'AI 大模型',
    cohort: '2027 届',
    responsibilities:
      '开放大模型算法、多模态、AI Infra、强化学习等研究工程岗位，工作地点上海、北京等。',
    requirements:
      '2027 届应届生，人工智能、计算机、数学等相关专业，硕士及以上学历优先。',
    source_url: 'https://www.stepfun.com',
    apply_url: 'https://www.stepfun.com',
    aliases: ['阶跃星辰', 'StepFun'],
  },
  {
    company: '百川智能',
    title: '百川智能 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: 'AI 大模型',
    cohort: '2027 届',
    responsibilities:
      '开放大模型算法、医疗 AI、AI Infra、产品等岗位，工作地点北京、上海等。',
    requirements:
      '2027 届应届生，人工智能、计算机、数学、医学等相关专业，硕士及以上学历优先。',
    source_url: 'https://www.baichuan-ai.com',
    apply_url: 'https://www.baichuan-ai.com',
    aliases: ['百川智能', 'Baichuan AI'],
  },
];

let inserted = 0;
let skipped = 0;
for (const job of jobs) {
  const { data: existing, error: qerr } = await db
    .from('job_catalog')
    .select('id')
    .eq('company', job.company)
    .eq('title', job.title)
    .eq('type', 'autumn_recruitment')
    .maybeSingle();
  if (qerr) {
    console.error('查询失败', job.company, qerr.message);
    continue;
  }
  if (existing) {
    skipped++;
    console.log('跳过（已存在）:', job.company);
    continue;
  }
  const { error } = await db.from('job_catalog').insert({
    ...job,
    state: 'published',
    verified_at: now,
    published_at: now,
  });
  if (error) {
    console.error('插入失败', job.company, error.message);
  } else {
    inserted++;
    console.log('已插入:', job.company);
  }
}
console.log(`\n完成：新增 ${inserted} 条，跳过 ${skipped} 条`);
