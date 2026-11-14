/**
 * 第十一批秋招岗位：具身智能 / 半导体 / 互联网中厂
 * Run: node scripts/seed-autumn-batch11.mjs
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
    company: '宇树科技',
    title: '宇树科技 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '具身智能 / 机器人',
    cohort: '2027 届',
    responsibilities:
      '开放嵌入式、软件、C++ 开发、机械、结构、硬件、系统架构、算法等岗位，聚焦人形机器人与四足机器人，工作地点杭州。',
    requirements:
      '2027 届应届生，本科 18-25K、硕士 25-38K、博士 40-50K（13 薪），机器人、计算机、机械、电子等相关专业。',
    source_url: 'https://www.unitree.com',
    apply_url: 'https://www.unitree.com',
    aliases: ['宇树科技', 'Unitree'],
  },
  {
    company: '优必选',
    title: '优必选 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '具身智能 / 机器人',
    cohort: '2027 届',
    responsibilities:
      '开放步态控制算法、视觉感知算法、嵌入式软件、伺服硬件、人形机器人系统测试等岗位，工作地点深圳、上海、北京、杭州。',
    requirements:
      '2027 届应届生，人工智能、自动化、机器人工程、电子信息、机械电子、计算机、控制工程等理工科专业。',
    source_url: 'https://ubtrobot.zhiye.com/campus',
    apply_url: 'https://ubtrobot.zhiye.com/campus',
    aliases: ['优必选', 'UBTECH'],
  },
  {
    company: '寒武纪',
    title: '寒武纪 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: 'AI 芯片 / 半导体',
    cohort: '2027 届',
    responsibilities:
      '开放芯片类、软件类、职能与研发支持类岗位，聚焦智能算力芯片与软件平台，工作地点北京、上海、深圳、合肥、西安、南京。',
    requirements:
      '2026 年 9 月—2027 年 8 月毕业的应届生，微电子、计算机、软件、电子等相关专业。',
    source_url: 'https://www.cambricon.com',
    apply_url: 'https://www.cambricon.com',
    aliases: ['寒武纪', 'Cambricon'],
  },
  {
    company: '海光信息',
    title: '海光信息 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '半导体 / 芯片',
    cohort: '2027 届',
    responsibilities:
      '开放芯片设计、验证、软件、系统、测试等岗位，聚焦 CPU/DCU 国产高性能芯片，工作地点北京、上海、成都等。',
    requirements:
      '2027 届应届生，微电子、计算机、电子、自动化等相关专业。',
    source_url: 'https://www.hygon.cn',
    apply_url: 'https://www.hygon.cn',
    aliases: ['海光信息', 'Hygon'],
  },
  {
    company: '埃夫特',
    title: '埃夫特 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '芜湖',
    industry: '工业机器人',
    cohort: '2027 届',
    responsibilities:
      '开放机器人本体、控制软件、视觉集成、伺服、机械设计等岗位，工作地点芜湖、上海等。',
    requirements:
      '2027 届应届生，机械、自动化、控制、电子、软件等相关专业。',
    source_url: 'https://www.efort.com.cn',
    apply_url: 'https://www.efort.com.cn',
    aliases: ['埃夫特', 'EFORT'],
  },
  {
    company: '极智嘉',
    title: '极智嘉（Geek+）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '机器人 / 物流自动化',
    cohort: '2027 届',
    responsibilities:
      '开放算法、软件、机器人控制、硬件、产品、项目等岗位，聚焦物流机器人，工作地点北京、上海、苏州等。',
    requirements:
      '2027 届应届生，计算机、机器人、自动化、机械、电子等相关专业。',
    source_url: 'https://www.geekplus.com',
    apply_url: 'https://www.geekplus.com',
    aliases: ['极智嘉', 'Geek+'],
  },
  {
    company: '同程旅行',
    title: '同程旅行 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '苏州',
    industry: '互联网 / 旅游',
    cohort: '2027 届',
    responsibilities:
      '开放 AI 产品经理、AI Agent 开发、商业化产品经理、前端/Java/全栈/算法工程师、大模型算法、运营等岗位，工作地点北京、上海、苏州、合肥、成都等。',
    requirements:
      '2027 届毕业生（2026 年 11 月—2027 年 10 月毕业），本科及以上学历。',
    source_url: 'https://www.ly.com',
    apply_url: 'https://www.ly.com',
    aliases: ['同程旅行', 'Tongcheng'],
  },
  {
    company: '去哪儿网',
    title: '去哪儿网 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网 / 旅游',
    cohort: '2027 届',
    responsibilities:
      '开放研发、算法、产品、运营、市场等岗位，工作地点北京。',
    requirements:
      '2027 届应届生，计算机、产品、运营等相关专业。',
    source_url: 'https://www.qunar.com',
    apply_url: 'https://www.qunar.com',
    aliases: ['去哪儿网', 'Qunar'],
  },
  {
    company: '知乎',
    title: '知乎 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027 届',
    responsibilities:
      '开放研发、算法、产品、运营、内容、职能等岗位，工作地点北京。',
    requirements:
      '2027 届应届生，计算机、产品、运营等相关专业。',
    source_url: 'https://www.zhihu.com',
    apply_url: 'https://www.zhihu.com',
    aliases: ['知乎', 'Zhihu'],
  },
  {
    company: '猎聘',
    title: '猎聘 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网 / 招聘',
    cohort: '2027 届',
    responsibilities:
      '开放研发、产品、运营、销售、职能等岗位，工作地点北京、上海、广州、深圳等。',
    requirements:
      '2027 届应届生，专业不限。',
    source_url: 'https://www.liepin.com',
    apply_url: 'https://www.liepin.com',
    aliases: ['猎聘', 'Liepin'],
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
