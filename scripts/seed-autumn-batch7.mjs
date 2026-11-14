/**
 * 第七批秋招岗位：教育科技 / 直播 / 保险科技
 * Run: node scripts/seed-autumn-batch7.mjs
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
    company: '网易有道',
    title: '网易有道 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '教育科技',
    cohort: '2027 届',
    responsibilities:
      '开放研发类（全栈开发、AI 全栈工程师、算法应用、AI Agent 应用开发、AI Infra）、算法类（大模型算法、计算机视觉/多模态、语音交互）、市场类（市场管理培训生）、教育类岗位，及博士后专项（LLM、Agent/多模态 LLM、高性能计算）。国内首个教育大模型「子曰」技术底座。',
    requirements:
      '2027 届毕业生（2026 年 9 月—2027 年 8 月毕业）。',
    source_url: 'https://campus.163.com',
    apply_url: 'https://campus.163.com',
    aliases: ['网易有道', '有道', 'Youdao'],
  },
  {
    company: '水滴公司',
    title: '水滴公司 2027 年秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '保险科技',
    cohort: '2027 届',
    responsibilities:
      '开放 AI 类、技术类、产品类、运营类、商分战略类、职能类、金融类、保险产业类、销售客服类等岗位，招聘约 80 人。工作地点北京、深圳、西安。水滴筹、水滴保、深蓝保等业务，2026 年从「使用 AI」进化为「AI 原生」公司。',
    requirements:
      '毕业时间 2026 年 1 月—2027 年 12 月的应届毕业生，本科及以上，专业不限。',
    source_url: 'https://jobs.waterdrop-inc.com/campus',
    apply_url: 'https://jobs.waterdrop-inc.com/campus',
    aliases: ['水滴公司', '水滴', 'Waterdrop'],
  },
  {
    company: '虎牙',
    title: '虎牙 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '游戏直播',
    cohort: '2027 届',
    responsibilities:
      '开放技术类（大模型算法、多模态视频生成、AIGC 语音大模型、图像算法、搜推广、全栈、后台、数据、SRE 等）、产品类（产品经理、产品运营、游戏策划）、运营类（内容运营、赛事运营、赛事商务、AI 短视频编导）、设计类（AI 视觉/体验设计）、职能类岗位。工作地点佛山、广州、深圳、上海、武汉。',
    requirements:
      '毕业时间 2026 年 9 月—2027 年 8 月的应届毕业生，每人同一时间仅能投 2 个岗位。',
    source_url: 'https://hr.huya.com/home',
    apply_url: 'https://hr.huya.com/home',
    aliases: ['虎牙', '虎牙直播', 'Huya'],
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

console.log(`\n第七批完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${jobs.length} 条。`);
