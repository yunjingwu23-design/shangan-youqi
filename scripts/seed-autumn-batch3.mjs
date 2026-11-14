/**
 * 第三批秋招岗位：互联网中厂 / 游戏 / 出行
 * Run: node scripts/seed-autumn-batch3.mjs
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
    company: '哔哩哔哩',
    title: '哔哩哔哩 2027 校园招聘（秋招）',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放研发、产品、运营、设计、市场、职能等全序列岗位，同步设「B-UP 顶尖技术人才项目」面向 AI 领域顶尖青年。工作城市含北京、上海、广州、深圳、成都、武汉、杭州等。每人限投 2 个职位。',
    requirements:
      '2027 届毕业生（毕业时间 2026 年 9 月 1 日—2027 年 8 月 31 日），本科及以上。',
    source_url: 'https://jobs.bilibili.com/campus',
    apply_url: 'https://jobs.bilibili.com/campus',
    aliases: ['哔哩哔哩', 'B站', 'bilibili'],
  },
  {
    company: '米哈游',
    title: '米哈游 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放美术&表现类、程序&技术类、产品策划类、运营类、市场&商务类、国际化类、质量管理类、综合类 8 大通道。自研大模型全链路，单列「基模」等 AI 方向岗位。每人仅可投 1 个职位。',
    requirements:
      '2027 届毕业生（毕业时间 2026 年 9 月—2027 年 8 月），程序岗以计算机/软件/数学为主，美术岗需作品集。',
    source_url: 'https://campus.mihoyo.com',
    apply_url: 'https://jobs.mihoyo.com/campus',
    aliases: ['米哈游', 'miHoYo', '米哈游网络'],
  },
  {
    company: '莉莉丝游戏',
    title: '莉莉丝游戏 2027 秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放技术、产品、发行、测试、项目管理等方向（校招正式批），以及数值/关卡策划、引擎开发、战略分析、发行管培、2D 动画等储备实习方向。代表作《剑与远征》《万国觉醒》，中国游戏出海代表。每人最多同时投 2 个岗位。',
    requirements:
      '2026 年 1 月 1 日—2027 年 12 月 31 日期间毕业的同学。',
    source_url: 'https://lilithgames.jobs.feishu.cn/campus/',
    apply_url: 'https://lilithgames.jobs.feishu.cn/campus/',
    aliases: ['莉莉丝游戏', '莉莉丝', 'Lilith'],
  },
  {
    company: '携程',
    title: '携程集团 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放研发技术类、产品类、设计类、数据分析类、运营市场类、商旅业务类、职能综合类岗位。工作城市上海、北京、广州、深圳、南通等十余个城市。秋招每人仅 1 次投递机会。',
    requirements:
      '2027 届全球全日制本科、硕士应届毕业生（毕业时间 2026 年 9 月—2027 年 8 月），最高学历毕业后无全职工作经历。',
    source_url: 'https://careers.ctrip.com/#/campus',
    apply_url: 'https://job.ctrip.com',
    aliases: ['携程', 'Ctrip', 'Trip.com Group'],
  },
  {
    company: '三七互娱',
    title: '三七互娱 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放 AI 类（AI 算法工程师/AI 产品经理）、游戏研发类、技术开发类、美术设计类、游戏策划类、游戏运营类（含海外游戏运营）、市场推广类（海外市场营销/海外广告优化师）等岗位。工作地点广州、北京、上海。每人 2 次投递机会。',
    requirements:
      '2027 届毕业生（毕业时间 2026 年 9 月—2027 年 8 月）。',
    source_url: 'https://zhaopin.37.com',
    apply_url: 'https://app.mokahr.com/m/campus_apply/37/58016',
    aliases: ['三七互娱', '37 Interactive', '三七'],
  },
  {
    company: '滴滴',
    title: '滴滴 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放工程类、算法类、机器人类、产品类、安全技术类、运营类、数据类、商业分析类、金融业务类岗位。工作地点北京、上海、广州、杭州、深圳、成都等。每人全渠道共 3 次主动投递机会。',
    requirements:
      '2027 届毕业生（毕业时间 2026 年 9 月—2027 年 8 月），最高学历毕业后无全职工作经历。',
    source_url: 'https://campus.didiglobal.com',
    apply_url: 'https://campus.didiglobal.com',
    aliases: ['滴滴', 'DiDi', '滴滴出行'],
  },
  {
    company: '360集团',
    title: '360 集团 2027 全球校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网安全',
    cohort: '2027 届',
    responsibilities:
      '开放安全类（智能化漏洞挖掘研究员）、算法类（AI 大模型算法、广告算法、视觉算法）、开发类（AI 应用开发、Agent 智能体开发、全栈开发）、大数据类、非技术类（AI 产品设计、用户研究、用户体验运营、法务）等岗位。工作地点以北京为主。',
    requirements:
      '2027 届应届毕业生（2026 年 11 月—2027 年 12 月毕业），本科及以上。',
    source_url: 'https://campus.360.cn',
    apply_url: 'https://campus.360.cn',
    aliases: ['360集团', '360', '奇虎360'],
  },
  {
    company: 'BOSS直聘',
    title: 'BOSS直聘 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放算法类（搜推/视觉/Agent 应用/大模型预训练后训练）、开发类（算法/平台/数据/前后端/移动端开发）、数据分析类、测试类、产品类岗位。工作城市北京、杭州。',
    requirements:
      '毕业时间在 2026 年 11 月—2027 年 10 月的同学。',
    source_url: 'https://zhipin.com/campus',
    apply_url: 'https://zhipin.com/campus',
    aliases: ['BOSS直聘', 'BOSS直聘人才招聘'],
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

console.log(`\n第三批完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${jobs.length} 条。`);
