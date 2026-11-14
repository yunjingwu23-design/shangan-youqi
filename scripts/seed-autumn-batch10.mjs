/**
 * 第十批秋招岗位：券商 / 汽车 / 消费
 * Run: node scripts/seed-autumn-batch10.mjs
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
    company: '中信证券',
    title: '中信证券 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '证券',
    cohort: '2027 届',
    responsibilities:
      '开放投行、研究、资产管理、财富管理、金融科技、分支机构培训生等岗位，覆盖北京、上海、深圳及全国分支机构。',
    requirements:
      '2027 届境内外应届生，金融、经济、会计、法律、计算机、数学等专业，本科及以上学历。',
    source_url: 'http://careers.citics.com',
    apply_url: 'https://careers.citics.com',
    aliases: ['中信证券', 'CITIC Securities'],
  },
  {
    company: '国泰海通证券',
    title: '国泰海通证券 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '证券',
    cohort: '2027 届',
    responsibilities:
      '开放投行、研究所、资产管理、量化、财富管理、分支机构管培生等岗位，工作地点上海、北京、深圳等。',
    requirements:
      '2027 届应届生，经济、金融、会计、法律、计算机、数学等专业，硕士及以上学历优先。',
    source_url: 'https://www.gtja.com',
    apply_url: 'https://www.gtja.com',
    aliases: ['国泰海通证券', '国泰君安', '海通证券'],
  },
  {
    company: '招商证券',
    title: '招商证券 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '证券',
    cohort: '2027 届',
    responsibilities:
      '开放投行、投资交易、研究、金融科技、财富管理、机构业务等岗位，工作地点深圳、北京、上海及全国分支机构。',
    requirements:
      '2027 届应届生，经济、金融、会计、法律、计算机、数学、物理等专业，理工科复合背景优先。',
    source_url: 'https://cmschina.zhiye.com',
    apply_url: 'https://cmschina.zhiye.com',
    aliases: ['招商证券', 'CMS'],
  },
  {
    company: '广汽集团',
    title: '广汽集团 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '汽车',
    cohort: '2027 届',
    responsibilities:
      '开放产品研发、商品企划、设计、智能网联、智能制造、营销、新媒体运营、海外运营、财务金融等岗位，覆盖广州、上海、北京、长沙、西安、武汉等。',
    requirements:
      '2027 届全球应届毕业生，专业不限，车辆、机械、电子、计算机、营销等优先。',
    source_url: 'https://xyzp.51job.com/gacgroup2027/',
    apply_url: 'https://xyzp.51job.com/gacgroup2027/',
    aliases: ['广汽集团', 'GAC Group'],
  },
  {
    company: '吉利控股集团',
    title: '吉利控股集团 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '汽车',
    cohort: '2027 届',
    responsibilities:
      '开放 IT/互联网、整车研发、新能源开发、航空航天、采购/供应链/质量、智能制造、营销服务、职能、设计九大方向 1000+ 岗位，覆盖北京、上海、杭州、宁波、深圳、重庆、成都等 35+ 城市。',
    requirements:
      '2027 届应届本/硕/博毕业生（2026 年 9 月—2027 年 8 月毕业）。',
    source_url: 'https://app.mokahr.com/su/svxowv',
    apply_url: 'https://app.mokahr.com/su/svxowv',
    aliases: ['吉利控股集团', 'Geely'],
  },
  {
    company: '立讯精密',
    title: '立讯精密 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '电子制造 / 消费电子',
    cohort: '2027 届',
    responsibilities:
      '开放研发、工程、制造、供应链、项目和职能类岗位，覆盖昆山、常熟、苏州、无锡、南京、上海、深圳、东莞及海外基地。',
    requirements:
      '2027 届应届生，机械、电子、自动化、材料、工业工程等相关专业。',
    source_url: 'https://www.luxshare-ict.com',
    apply_url: 'https://www.luxshare-ict.com',
    aliases: ['立讯精密', 'Luxshare'],
  },
  {
    company: '名创优品',
    title: '名创优品 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '零售 / 消费',
    cohort: '2027 届',
    responsibilities:
      '开放产品、设计、供应链、门店运营、电商、职能等岗位，工作地点广州及全国。',
    requirements:
      '2027 届应届生，专业不限。',
    source_url: 'https://www.miniso.com',
    apply_url: 'https://www.miniso.com',
    aliases: ['名创优品', 'MINISO'],
  },
  {
    company: '海底捞',
    title: '海底捞 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '餐饮 / 消费',
    cohort: '2027 届',
    responsibilities:
      '开放门店管理培训生、运营、供应链、职能等岗位，工作地点全国。',
    requirements:
      '2027 届应届生，专业不限。',
    source_url: 'https://www.haidilao.com',
    apply_url: 'https://www.haidilao.com',
    aliases: ['海底捞', 'Haidilao'],
  },
  {
    company: '沃尔玛',
    title: '沃尔玛 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '零售 / 快消',
    cohort: '2027 届',
    responsibilities:
      '开放供应链区域管培生、门店运营、采购、电商等岗位，工作地点全国。',
    requirements:
      '2027 届应届生，专业不限。',
    source_url: 'https://www.walmartchina.com',
    apply_url: 'https://www.walmartchina.com',
    aliases: ['沃尔玛', 'Walmart'],
  },
  {
    company: '光明食品集团',
    title: '光明食品集团 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '快消 / 食品',
    cohort: '2027 届',
    responsibilities:
      '开放数字化管培生、市场销售管培生、专业职能管培生、食品研发、合成生物、供应链管理等岗位，工作地点上海及全国。',
    requirements:
      '2027 届应届生，食品、生物、营销、管理等相关专业。',
    source_url: 'https://campus.51job.com/brightfood2027/job.html',
    apply_url: 'https://campus.51job.com/brightfood2027/job.html',
    aliases: ['光明食品集团', 'Bright Food'],
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
