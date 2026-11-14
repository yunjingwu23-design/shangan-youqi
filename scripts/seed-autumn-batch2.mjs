/**
 * 第二批秋招岗位：电商 / 跨境电商方向
 * Run: node scripts/seed-autumn-batch2.mjs
 * 与 seed-autumn-jobs.mjs 相同的写入逻辑（company+title 去重，存在则更新）。
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
    company: 'SHEIN',
    title: 'SHEIN 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '跨境电商',
    cohort: '2027 届',
    responsibilities:
      '开放信息技术类（算法、Agent 开发、Java 开发、APP 开发、产品、数据分析）、商品平台类（服装设计、买手、商品企划）、服装供应链类、国际物流与仓储类、全球运营类（管培生、商家运营、KOL 营销、平台运营）、职能管理类等岗位。每人可投 3 个不同校招岗位，招满即下架。',
    requirements:
      '2027 届毕业生（毕业时间 2026 年 9 月 1 日—2027 年 8 月 31 日），中国大陆以毕业证为准，港澳台及海外以学位证为准。',
    source_url: 'https://app.mokahr.com/m/campus_apply/shein/2932',
    apply_url: 'https://careers.shein.cn',
    aliases: ['SHEIN', '希音', '广州希音国际'],
  },
  {
    company: '得物',
    title: '得物 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '电商',
    cohort: '2027 届',
    responsibilities:
      '开放技术类（后端/前端/Android/iOS/算法/测试/数据/安全）、产品类（产品经理/商业产品/数据产品/AI 产品）、设计类、运营类（内容/用户/活动/商家/社区/直播运营）、市场品牌类、职能类等 10 大职类，11 座城市，2 次投递机会。',
    requirements:
      '2027 届毕业生（2026 年 9 月—2027 年 8 月毕业），本科及以上。',
    source_url: 'https://poizon.jobs.feishu.cn/',
    apply_url: 'https://campus.dewu.com',
    aliases: ['得物', '得物App', 'Poizon', '毒App'],
  },
  {
    company: 'Shopee',
    title: 'Shopee 研发中心 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '跨境电商',
    cohort: '2027 届',
    responsibilities:
      '开放研发类（研发工程师、Agent 开发、AI 基础设施、大数据开发、Android/iOS、SRE、信息安全）、算法类（AI 应用、搜广推大模型、AIGC 基模、风控）、产品类（产品经理、策略产品、产品设计、数据分析、项目经理、技术产品经理）等岗位。每人仅可投 1 个志愿。',
    requirements:
      '2027 届毕业生（毕业时间 2026 年 9 月 1 日—2027 年 8 月 31 日）。',
    source_url: 'https://app.mokahr.com/recommendation-apply/shopee/2964',
    apply_url: 'https://careers.shopee.cn/',
    aliases: ['Shopee', '虾皮', '深圳虾皮'],
  },
  {
    company: '唯品会',
    title: '唯品会 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '电商',
    cohort: '2027 届',
    responsibilities:
      '开放商务类、运营类、供应链类、人工智能类、技术类、营销类、数据分析类岗位，以及 VIPER（唯品会精英储备计划）。网申 2026 年 8 月 17 日起，招满即止。',
    requirements: '2027 届应届毕业生，本科及以上。',
    source_url: 'https://campus.vip.com/',
    apply_url: 'https://campus.vip.com/',
    aliases: ['唯品会', 'VIP.com', 'vipshop'],
  },
  {
    company: 'TikTok Shop',
    title: 'TikTok Shop 2027 校园招聘（跨境电商）',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '跨境电商',
    cohort: '2027 届',
    responsibilities:
      '开放跨境电商运营管培生「起航计划」、东南亚电商运营管培生计划，以及 AI 商家产品、AI 商品产品、AI 营销导购产品、行业运营、达人运营、商家运营、经营分析、物流、战略分析、研发、算法等方向。全球 100+ 国家和地区业务。',
    requirements:
      '2027 届应届毕业生，本科及以上，精通英语，掌握欧洲/亚太/中东小语种者优先，有电商/消费科技实习经验者优先。',
    source_url: 'https://jobs.bytedance.com/campus',
    apply_url: 'https://jobs.bytedance.com/campus',
    aliases: ['TikTok Shop', '字节电商', '抖音电商'],
  },
  {
    company: '安克创新',
    title: '安克创新 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '跨境电商',
    cohort: '2027 届',
    responsibilities:
      '开放 9 大类、1000+ offer：研发技术、产品与体验、设计、市场营销、采购与供应链、品质、数据开发、职能、制造。覆盖充电储能（Anker）、智能影音（soundcore）、智能家居（eufy）三大核心赛道，及具身智能、大健康孵化赛道。每人最多投 3 个岗位。',
    requirements:
      '2027 届全球应届毕业生（毕业时间 2026 年 9 月 1 日—2027 年 12 月 31 日）。',
    source_url: 'https://career.anker.com.cn',
    apply_url: 'https://anker-in.jobs.feishu.cn/s/wSyUpi_YCCQ',
    aliases: ['安克创新', 'Anker', '安克'],
  },
  {
    company: 'Cider',
    title: 'Cider 2027 全球校园招聘（跨境电商）',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '跨境电商',
    cohort: '2027 届',
    responsibilities:
      '校招生项目开放品牌市场类、商品管理类、电商运营类、供应链类、AIGC 类；实习&校招开放运营、市场、投放、职能、履约、商品、视觉、供应链、服装设计等方向。时尚科技公司（Gen-Z 快时尚）。',
    requirements:
      '2027 届毕业生（2026 年 9 月—2027 年 9 月毕业），部分岗位对两年内毕业生开放。',
    source_url: 'https://jy.cuc.edu.cn/',
    apply_url: 'https://campus@shopcider.com',
    aliases: ['Cider', '喜得', '北京喜得国际'],
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
    const { error } = await db
      .from('job_catalog')
      .update(payload)
      .eq('id', existing[0].id);
    if (error) {
      failed += 1;
      console.error(`更新失败 [${job.company}]: ${error.message}`);
    } else {
      updated += 1;
    }
    continue;
  }

  const { error } = await db.from('job_catalog').insert(payload);
  if (error) {
    failed += 1;
    console.error(`插入失败 [${job.company}]: ${error.message}`);
  } else {
    inserted += 1;
  }
}

console.log(`\n第二批完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${jobs.length} 条。`);
