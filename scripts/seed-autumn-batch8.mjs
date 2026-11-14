/**
 * 第八批秋招岗位：办公软件 / 家电制造 / 银行金融
 * Run: node scripts/seed-autumn-batch8.mjs
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
    company: '金山办公',
    title: '金山办公 2027 届全球校园招聘（云杉计划）',
    type: 'autumn_recruitment',
    city: '珠海',
    industry: '办公软件',
    cohort: '2027 届',
    responsibilities:
      '开放人才专项「云帆领航者」（管培）、「云巅探索者」（精英研发），及校招专项全栈开发、C++ 研发、服务端研发、算法、AI 应用、产品、运营、营销等岗位。WPS AI 3.0、WPS 灵犀等 AI 办公产品，AI 纳入评估标准。工作地点珠海、武汉、北京、广州等。',
    requirements:
      '2026 年 9 月—2027 年 8 月期间毕业的海内外应届生，年薪 30-65 万，提供一年住房补助。',
    source_url: 'https://join.wps.cn',
    apply_url: 'https://join.wps.cn',
    aliases: ['金山办公', 'WPS', 'Kingsoft'],
  },
  {
    company: '联想',
    title: '联想 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '智能硬件',
    cohort: '2027 届',
    responsibilities:
      '开放技术、产品与项目、设计、市场与销售、职能、供应链六大方向，三大项目：应届生招聘、AI 专项、GFL 全球管培生计划。工作地点北京、上海、深圳、天津、武汉、成都、广州、杭州等 20+ 城市。',
    requirements:
      '2027 届海内外毕业生（毕业时间 2026 年 9 月 1 日—2027 年 8 月 31 日），本科及以上。',
    source_url: 'https://talent.lenovo.com.cn/home',
    apply_url: 'https://talent.lenovo.com.cn/home',
    aliases: ['联想', 'Lenovo', '联想集团'],
  },
  {
    company: '美的',
    title: '美的集团 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '佛山',
    industry: '家电/智能制造',
    cohort: '2027 届',
    responsibilities:
      '开放研发技术类、制造技术类、信息技术类、供应链物流类、国内营销类、海外营销类、财务金融类、管理类岗位。业务覆盖智能家居、工业机器人、AI 大模型、新能源、楼宇科技等，旗下库卡机器人、美的医疗等。',
    requirements:
      '毕业时间 2026 年 1 月 1 日—2027 年 12 月 31 日的海内外本硕博应届生，岗位投递不限次数。',
    source_url: 'https://careers.midea.com',
    apply_url: 'https://careers.midea.com/recruit-school-wechat',
    aliases: ['美的', 'Midea', '美的集团'],
  },
  {
    company: '海尔',
    title: '海尔 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '青岛',
    industry: '家电/智能家居',
    cohort: '2027 届',
    responsibilities:
      '开放研发技术、营销、供应链、职能、智能场景等方向岗位。工作地点青岛、上海、深圳等。',
    requirements: '2027 届毕业生，具体以官网各岗位要求为准。',
    source_url: 'https://maker.haier.net/client/campusmobile/index.html',
    apply_url: 'https://maker.haier.net/client/campusmobile/index.html',
    aliases: ['海尔', 'Haier', '海尔集团'],
  },
  {
    company: '格力电器',
    title: '格力电器 2027 届秋季校园招聘正式批',
    type: 'autumn_recruitment',
    city: '珠海',
    industry: '家电',
    cohort: '2027 届',
    responsibilities:
      '开放研发、营销、供应链、职能等方向岗位。工作地点珠海、深圳、上海等。',
    requirements: '2027 届毕业生，具体以官网各岗位要求为准。',
    source_url: 'https://www.gree.com',
    apply_url: 'https://zhaopin.greeyun.com/home',
    aliases: ['格力电器', '格力', 'Gree'],
  },
  {
    company: 'TCL',
    title: 'TCL 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '惠州',
    industry: '家电/显示',
    cohort: '2027 届',
    responsibilities:
      '开放供应链管培、智能制造、研发、营销、职能等方向岗位。工作地点惠州、上海、深圳等。',
    requirements: '2027 届毕业生，具体以官网各岗位要求为准。',
    source_url: 'https://campus.tcl.com/campus/recruiting.html?id=37',
    apply_url: 'https://campus.tcl.com/campus/recruiting.html?id=37',
    aliases: ['TCL', 'TCL科技', 'TCL实业'],
  },
  {
    company: '招商银行',
    title: '招商银行 2027 届校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '银行/金融',
    cohort: '2027 届',
    responsibilities:
      '开放综合培养生、数字金融岗、定向柜员岗、市场营销岗、运营柜员岗、金融科技类等岗位。招银网络科技 7 月 30 日—9 月 20 日，总行/分行/子公司 8 月 28 日—10 月 10 日。AI 面试纳入标准招聘流程。',
    requirements:
      '2027 届应届生，本科及以上，有四级要求（CET-4），部分岗位需语言测评。',
    source_url: 'https://career.cmbchina.com',
    apply_url: 'https://career.cmbchina.com',
    aliases: ['招商银行', '招行', 'CMB'],
  },
  {
    company: '平安银行',
    title: '平安银行 2027 届校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '银行/金融',
    cohort: '2027 届',
    responsibilities:
      '开放各分行培训生、运营培训生、零售业务培训生、公司业务培训生等岗位。网申 8 月 10 日—11 月 6 日。',
    requirements: '2026/2027 届应届生，本科及以上。',
    source_url: 'https://job.pingan.com',
    apply_url: 'https://job.pingan.com',
    aliases: ['平安银行', '平安', 'Ping An Bank'],
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

console.log(`\n第八批完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${jobs.length} 条。`);
