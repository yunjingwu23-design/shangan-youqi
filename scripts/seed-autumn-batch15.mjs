/**
 * 第十五批秋招岗位：消费餐饮 / 游戏
 * Run: node scripts/seed-autumn-batch15.mjs
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
    company: '瑞幸咖啡',
    title: '瑞幸咖啡 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '新零售 / 咖啡',
    cohort: '2027 届',
    responsibilities:
      '开放产品（饮品研发、产品规划、设备研发）、供应链、营销增长、技术（AI 应用算法、AI 产品经理）、国际业务等岗位，工作地点北京、上海、厦门。',
    requirements:
      '2027 届应届毕业生（2026 年 9 月—2027 年 8 月毕业），专业不限，供应链、市场营销、食品科学、计算机、AI 等优先。',
    source_url: 'https://app.mokahr.com/campus_apply/lkcoffee/45257',
    apply_url: 'https://app.mokahr.com/campus_apply/lkcoffee/45257',
    aliases: ['瑞幸咖啡', 'Luckin Coffee'],
  },
  {
    company: '蜜雪冰城',
    title: '蜜雪冰城 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '郑州',
    industry: '新茶饮 / 消费',
    cohort: '2027 届',
    responsibilities:
      '开放门店运营、供应链、产品研发、职能等岗位，工作地点郑州及全国。',
    requirements:
      '2027 届应届生，专业不限。',
    source_url: 'https://www.mxbc.com',
    apply_url: 'https://www.mxbc.com',
    aliases: ['蜜雪冰城', 'Mixue'],
  },
  {
    company: '三只松鼠',
    title: '三只松鼠 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '芜湖',
    industry: '休闲食品 / 电商',
    cohort: '2027 届',
    responsibilities:
      '开放电商运营、产品、供应链、品牌、职能等岗位，工作地点芜湖、杭州等。',
    requirements:
      '2027 届应届生，专业不限。',
    source_url: 'https://www.3songshu.com',
    apply_url: 'https://www.3songshu.com',
    aliases: ['三只松鼠', 'Three Squirrels'],
  },
  {
    company: '吉比特',
    title: '吉比特 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '厦门',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放研发技术、游戏策划、美术设计、产品运营、市场营销、游戏客服、公共职能七大类岗位，旗下含《问道》《一念逍遥》等，工作地点深圳、厦门。',
    requirements:
      '2026/2027 届毕业生，计算机、美术、设计、数学等相关专业。',
    source_url: 'https://hr.g-bits.com',
    apply_url: 'https://hr.g-bits.com',
    aliases: ['吉比特', 'G-Bits', '雷霆游戏'],
  },
  {
    company: '4399游戏',
    title: '4399 游戏 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放游戏开发、策划、美术、运营、市场等岗位，工作地点广州。',
    requirements:
      '2027 届应届生，计算机、设计、美术等相关专业。',
    source_url: 'https://hr.4399om.com',
    apply_url: 'https://hr.4399om.com',
    aliases: ['4399游戏', '4399'],
  },
  {
    company: 'TapTap（心动）',
    title: 'TapTap（心动公司）2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '游戏 / 社区平台',
    cohort: '2027 届',
    responsibilities:
      '开放后端开发、前端、游戏广告销售、社区运营（内容评价）等岗位，工作地点上海。',
    requirements:
      '2027 届应届生，计算机、市场营销、广告、传媒等相关专业。',
    source_url: 'https://www.taptap.com',
    apply_url: 'https://www.taptap.com',
    aliases: ['TapTap', '心动公司', 'XD'],
  },
  {
    company: '完美世界',
    title: '完美世界 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放游戏研发、策划、美术、运营、职能等岗位，工作地点北京、上海等。',
    requirements:
      '2027 届应届生，计算机、美术、设计等相关专业。',
    source_url: 'https://www.wanmei.com',
    apply_url: 'https://www.wanmei.com',
    aliases: ['完美世界', 'Perfect World'],
  },
  {
    company: '网龙',
    title: '网龙 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '福州',
    industry: '游戏 / 教育科技',
    cohort: '2027 届',
    responsibilities:
      '开放游戏研发、产品、设计、教育科技、职能等岗位，工作地点福州、北京等。',
    requirements:
      '2027 届应届生，计算机、设计、教育等相关专业。',
    source_url: 'https://www.nd.com.cn',
    apply_url: 'https://www.nd.com.cn',
    aliases: ['网龙', 'NetDragon'],
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
