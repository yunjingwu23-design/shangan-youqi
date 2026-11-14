/**
 * 第十三批秋招岗位：医药 / 地产 / 外企四大 / 能源
 * Run: node scripts/seed-autumn-batch13.mjs
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
    company: '恒瑞医药',
    title: '恒瑞医药 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '连云港',
    industry: '医药 / 创新药',
    cohort: '2027 届',
    responsibilities:
      '开放研发、临床、营销、生产、职能全产业链岗位，覆盖创新药研发、临床药理、药物合成、制剂、生物统计、医学事务等，工作地点连云港、上海、苏州、南京、北京、成都等。',
    requirements:
      '2027 届全球优秀毕业生，药学、生物学、化学、临床医学、统计等相关专业。',
    source_url: 'https://www.hengrui.com',
    apply_url: 'https://www.hengrui.com',
    aliases: ['恒瑞医药', 'Hengrui'],
  },
  {
    company: '药明康德',
    title: '药明康德 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '医药 / 生物医药',
    cohort: '2027 届',
    responsibilities:
      '开放测试业务、生物学业务平台岗位，含生物分析、DMPK、毒理、病理、AI 应用、质量审查等，工作地点苏州、南京、启东、上海等。',
    requirements:
      '2027 届毕业生（2027 年 1 月—2027 年 12 月毕业），药学、生物、化学、医学等相关专业。',
    source_url: 'https://www.wuxiapptec.com',
    apply_url: 'https://www.wuxiapptec.com',
    aliases: ['药明康德', 'WuXi AppTec'],
  },
  {
    company: '迈瑞医疗',
    title: '迈瑞医疗 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '医疗器械',
    cohort: '2027 届',
    responsibilities:
      '开放研发（硬件/软件/算法/临床）、产品、市场、职能等岗位，工作地点深圳、武汉、南京、北京等。',
    requirements:
      '2027 届应届生，生物医学工程、电子、软件、临床、机械等相关专业。',
    source_url: 'https://www.mindray.com',
    apply_url: 'https://www.mindray.com',
    aliases: ['迈瑞医疗', 'Mindray'],
  },
  {
    company: '联影医疗',
    title: '联影医疗 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '医疗器械',
    cohort: '2027 届',
    responsibilities:
      '开放研发、算法、软件、硬件、临床、产品、市场等岗位，聚焦高端医学影像设备，工作地点上海、武汉、成都等。',
    requirements:
      '2027 届应届生，生物医学工程、电子、计算机、物理、医学影像等相关专业。',
    source_url: 'https://www.united-imaging.com',
    apply_url: 'https://www.united-imaging.com',
    aliases: ['联影医疗', 'United Imaging'],
  },
  {
    company: '华润置地',
    title: '华润置地 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '地产',
    cohort: '2027 届',
    responsibilities:
      '开放开发销售、经营性不动产、轻资产管理等方向岗位，涵盖投资、工程、设计、商业管理、资产管理等，工作地点全国。',
    requirements:
      '2026 年 9 月—2027 年 8 月毕业的应届生，专业不限。',
    source_url: 'https://app.mokahr.com/campus-recruitment/crland/168540',
    apply_url: 'https://app.mokahr.com/campus-recruitment/crland/168540',
    aliases: ['华润置地', 'CR Land'],
  },
  {
    company: '保利发展',
    title: '保利发展控股 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '地产',
    cohort: '2027 届',
    responsibilities:
      '开放策划管培生、销售管培生、数字营销管培生、经纪管培生、AI 算法工程师、AI 产品经理等岗位，工作地点全国。',
    requirements:
      '2027 届本科及以上（2026 年 9 月—2027 年 9 月毕业）。',
    source_url: 'https://polyharmony.zhiye.com',
    apply_url: 'https://polyharmony.zhiye.com',
    aliases: ['保利发展', 'Poly Developments'],
  },
  {
    company: '万科',
    title: '万科 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '地产',
    cohort: '2027 届',
    responsibilities:
      '开放开发、运营、商业、物业、职能等岗位，工作地点全国。',
    requirements:
      '2027 届应届生，专业不限。',
    source_url: 'https://www.vanke.com',
    apply_url: 'https://www.vanke.com',
    aliases: ['万科', 'Vanke'],
  },
  {
    company: '德勤',
    title: '德勤（Deloitte）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '咨询 / 审计',
    cohort: '2027 届',
    responsibilities:
      '开放审计、税务、咨询、风险咨询等岗位，工作地点北京、上海、深圳、广州、香港等。',
    requirements:
      '2027 届应届生，专业不限，财务、会计、经济、计算机等优先，英语流利。',
    source_url: 'https://www2.deloitte.com/cn',
    apply_url: 'https://www2.deloitte.com/cn',
    aliases: ['德勤', 'Deloitte'],
  },
  {
    company: '普华永道',
    title: '普华永道（PwC）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '咨询 / 审计',
    cohort: '2027 届',
    responsibilities:
      '开放审计、税务、咨询、风险及控制服务等岗位，工作地点北京、上海、深圳、广州、香港等。',
    requirements:
      '2027 届应届生，专业不限，英语流利。',
    source_url: 'https://www.pwccn.com',
    apply_url: 'https://www.pwccn.com',
    aliases: ['普华永道', 'PwC'],
  },
  {
    company: '安永',
    title: '安永（EY）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '咨询 / 审计',
    cohort: '2027 届',
    responsibilities:
      '开放审计、税务、咨询、战略与交易等岗位，工作地点北京、上海、深圳、广州、香港等。',
    requirements:
      '2027 届应届生，专业不限，英语流利。',
    source_url: 'https://www.ey.com/zh_cn',
    apply_url: 'https://www.ey.com/zh_cn',
    aliases: ['安永', 'EY'],
  },
  {
    company: '毕马威',
    title: '毕马威（KPMG）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '咨询 / 审计',
    cohort: '2027 届',
    responsibilities:
      '开放审计、税务、咨询、风险咨询等岗位，工作地点北京、上海、深圳、广州、香港等。',
    requirements:
      '2027 届应届生，专业不限，英语流利。',
    source_url: 'https://www.kpmg.com/cn',
    apply_url: 'https://www.kpmg.com/cn',
    aliases: ['毕马威', 'KPMG'],
  },
  {
    company: '微软',
    title: '微软（Microsoft）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '科技 / 软件',
    cohort: '2027 届',
    responsibilities:
      '开放软件工程、产品、算法、云计算等岗位，工作地点北京、上海、苏州等。',
    requirements:
      '2027 届应届生，计算机、软件等相关专业，英语流利。',
    source_url: 'https://careers.microsoft.com',
    apply_url: 'https://careers.microsoft.com',
    aliases: ['微软', 'Microsoft'],
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
