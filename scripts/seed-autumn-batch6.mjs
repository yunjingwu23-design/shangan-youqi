/**
 * 第六批秋招岗位：手机 / 金融科技 / AI 原生
 * Run: node scripts/seed-autumn-batch6.mjs
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
    company: 'vivo',
    title: 'vivo 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '东莞',
    industry: '智能硬件',
    cohort: '2027 届',
    responsibilities:
      '开放算法类、软件类、硬件类、通信类、测试类、营销类、市场类、设计类、产品运营类、供应链类 10 大岗位类别、250+ 投递方向。工作地点东莞、深圳、杭州、上海、南京、北京、西安、重庆等。',
    requirements:
      '2027 届全球高校毕业生（毕业时间 2026 年 8 月—2027 年 7 月）。',
    source_url: 'https://hr-campus.vivo.com/',
    apply_url: 'https://hr-campus.vivo.com/',
    aliases: ['vivo', '维沃移动通信'],
  },
  {
    company: '荣耀',
    title: '荣耀 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '智能硬件',
    cohort: '2027 届',
    responsibilities:
      '开放研发、营销、服务、产品与设计、供应链、财经、流程 IT 与质量运营、战略管理 8 大职位类别、100+ 岗位方向。工作地点深圳、北京、南京、西安、上海，部分非研发岗全球派遣。',
    requirements:
      '国内高校中国籍本硕 2026 年 10 月 1 日—2027 年 9 月 30 日毕业；海外高校及国内博士生 2026 年 1 月 1 日—2027 年 9 月 30 日毕业。',
    source_url: 'https://www.honor.com/cn/career/',
    apply_url: 'https://www.honor.com/cn/career/',
    aliases: ['荣耀', 'HONOR', '荣耀终端'],
  },
  {
    company: '蚂蚁集团',
    title: '蚂蚁集团 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '金融科技',
    cohort: '2027 届',
    responsibilities:
      '技术岗占比超 80%，超 80% AI 相关岗位：AI 研究、AI 应用、AI Infra、模型训练、具身智能、AI 产品、AI 安全，另有产品、运营、数据、风险管理等岗位。设「Plan A+」「蚂蚁星」两大顶尖人才专项。工作地点杭州、上海、北京、深圳、广州等。笔试明示可放心用 AI，AI Coding 纳入考核。',
    requirements:
      '2027 届海内外高校毕业生（毕业时间 2026 年 11 月—2027 年 10 月）。',
    source_url: 'https://talent.antgroup.com',
    apply_url: 'https://talent.antgroup.com/campus',
    aliases: ['蚂蚁集团', '蚂蚁', 'Ant Group'],
  },
  {
    company: '网易游戏',
    title: '网易游戏（互娱）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放游戏策划类、游戏程序类、游戏艺术类、技术类、运营类、市场渠道类、用户体验及人工智能类、游戏测试类、设计类、产品类、项目管理类、职能支持类 50+ 岗位。工作地点广州、杭州、上海。每人可投 2 个职位。',
    requirements:
      '2027 届应届毕业生（毕业时间 2026 年 9 月—2027 年 8 月）。',
    source_url: 'https://campus.game.163.com',
    apply_url: 'https://campus.game.163.com',
    aliases: ['网易游戏', '网易互娱', 'NetEase Games'],
  },
  {
    company: '月之暗面',
    title: '月之暗面 Kimi 2027 校园招聘（穿越计划）',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '人工智能',
    cohort: '2027 届',
    responsibilities:
      '开放大模型算法、训练与推理基础设施、AI 系统工程、产品等岗位。「穿越计划」面向 2027/2028 届，3-6 个月实习考察，表现好即授期权、锁股数，另有全球 7 个 Wild Card 名额。',
    requirements: '不限专业、不限学历，2027 届、2028 届都收。',
    source_url: 'https://moonshot.cn',
    apply_url: 'https://moonshot.cn',
    aliases: ['月之暗面', 'Kimi', 'Moonshot AI'],
  },
  {
    company: '智谱AI',
    title: '智谱 AI 2027 校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '人工智能',
    cohort: '2027 届',
    responsibilities:
      '开放大模型算法、后训练算法、训练与推理 Infra、平台研发、全栈、SRE、AI 产品经理等岗位。硕士开发年包 40-55 万，博士算法 80-100 万以上。',
    requirements:
      '2026 年 9 月—2027 年 8 月毕业，境内外本硕博。算法岗要求计算机、人工智能、数学相关专业，硕士优先。',
    source_url: 'https://zhipuai.cn/joinus',
    apply_url: 'https://zhipuai.cn/joinus',
    aliases: ['智谱AI', '智谱', 'Zhipu AI'],
  },
  {
    company: 'MiniMax',
    title: 'MiniMax 2027 校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '人工智能',
    cohort: '2027 届',
    responsibilities:
      '开放大模型算法（预训练）、训练框架、RL 框架、推理优化、AI 产品、工程开发等岗位。近乎全员持股，实习生也能拿期权。',
    requirements:
      '2027 届海内外应届，算法岗以计算机、人工智能、数学为主，硕博优先。',
    source_url: 'https://www.minimaxi.com/',
    apply_url: 'https://www.minimaxi.com/',
    aliases: ['MiniMax', '稀宇科技'],
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

console.log(`\n第六批完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${jobs.length} 条。`);
