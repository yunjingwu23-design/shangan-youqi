/**
 * 第四批秋招岗位：硬件 / 新能源 / 智能科技
 * Run: node scripts/seed-autumn-batch4.mjs
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
    company: '小米',
    title: '小米集团 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '智能硬件',
    cohort: '2027 届',
    responsibilities:
      '开放算法类、软件研发类、硬件研发类、芯片类、产品类、市场类、设计类、职能类、供应链、销售、服务等 17+ 职类。工作地点北京、上海、武汉、南京、西安、深圳等，及慕尼黑、新加坡等海外城市。网申 2026 年 8 月 10 日—12 月 31 日。',
    requirements:
      '2027 届海内外应届毕业生（毕业时间 2026 年 9 月 1 日—2027 年 8 月 31 日）。',
    source_url: 'https://hr.xiaomi.com/campus',
    apply_url: 'https://hr.xiaomi.com/campus',
    aliases: ['小米', '小米集团', 'Xiaomi'],
  },
  {
    company: 'OPPO',
    title: 'OPPO 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '智能硬件',
    cohort: '2027 届',
    responsibilities:
      '开放 AI/算法类、软件类、硬件类、标准研究类、产品类、设计类、品牌策划类、销售服务类、工程技术类、采购类、综合职能类 11 大类 100+ 岗位。工作地点深圳、东莞、成都、上海、北京、西安、南京、武汉等。岗位招满即止，最快 8 月拿 Offer。',
    requirements:
      '2027 届全球高校本硕博毕业生；大陆本硕毕业时间 2027 年 1 月—12 月，港澳台及海外 2026 年 1 月—2027 年 12 月。',
    source_url: 'https://careers.oppo.com/university/oppo/campus',
    apply_url: 'https://careers.oppo.com/university/oppo/campus',
    aliases: ['OPPO', 'OPPO广东移动通信'],
  },
  {
    company: '华为',
    title: '华为 2027 届应届生招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: 'ICT/通信',
    cohort: '2027 届',
    responsibilities:
      '开放软件/算法研发、AI 大模型（LLM/VLM/VLA 多模态）、昇腾 NPU 算子、模型性能优化、Agent 智能体、嵌入式软件、芯片与器件设计、硬件技术、客户经理、产品行销、华为云 BD、数字能源 BD 等岗位。工作地点深圳、上海、北京、成都、武汉、南京、杭州、东莞等。',
    requirements:
      '2027 届本科生、硕士、博士毕业生，计算机、软件、电子信息、集成电路等相关专业为主，部分销售类不限专业。',
    source_url: 'https://career.huawei.com',
    apply_url: 'https://career.huawei.com',
    aliases: ['华为', 'HUAWEI', '华为技术'],
  },
  {
    company: '科大讯飞',
    title: '科大讯飞 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '合肥',
    industry: '人工智能',
    cohort: '2027 届',
    responsibilities:
      '开放研究算法类、研发类、AI 研发类、大数据类、产品类、测试类、营销类、教育类、设计类、职能类、医学类、工程类、交付类 14 大类。同步开放「飞星计划」（算法专项）、「飞凡计划」（管培）、「星火 X」（顶尖 AI 人才）四大项目，可同时投递。工作地点合肥、北京、上海、武汉、深圳、广州等。',
    requirements:
      '毕业时间在 2025 年 6 月 1 日—2027 年 8 月 31 日期间的海内外高校同学（放宽毕业年限）。每人最多投两个岗位。',
    source_url: 'https://iflytek.zhiye.com',
    apply_url: 'https://iflytek.zhiye.com/campus/jobs',
    aliases: ['科大讯飞', 'iFLYTEK', '讯飞'],
  },
  {
    company: '比亚迪',
    title: '比亚迪 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '新能源汽车',
    cohort: '2027 届',
    responsibilities:
      '开放汽车、电子、新能源、轨道交通四大产业的研发、制造、工程、汽车智能化、供应链、销售与职能等岗位。工作地点深圳、西安、惠州、郑州、合肥、成都、上海等境内城市，及越南、泰国、巴西等境外。研发人员超 12 万名，全球专利申请超 7.1 万项。',
    requirements:
      '2027 届全球高校本科、硕士、博士；境内院校 2026 年 9 月 1 日—2027 年 8 月 31 日，境外院校 2026 年 7 月 1 日—2027 年 12 月 31 日毕业。部分岗位不限专业。',
    source_url: 'https://job.byd.com',
    apply_url: 'https://job.byd.com',
    aliases: ['比亚迪', 'BYD', '比亚迪股份'],
  },
  {
    company: '蔚来',
    title: '蔚来 2027 届 Super Sparks 招募',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '新能源汽车',
    cohort: '2027 届',
    responsibilities:
      '开放技术人才专项、AGI 超星计划、Super Sparks、营销 Sparks 等方向，覆盖智能汽车、研发、运营等岗位。工作地点上海、合肥、北京等。',
    requirements: '2027 届毕业生，具体以官网各岗位要求为准。',
    source_url: 'https://campus.nio.com/',
    apply_url: 'https://campus.nio.com/',
    aliases: ['蔚来', 'NIO', '蔚来汽车'],
  },
  {
    company: '理想汽车',
    title: '理想汽车 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '新能源汽车',
    cohort: '2027 届',
    responsibilities:
      '开放整车与智能硬件研发、算法与软件、芯片研发、产品、供应链与智能制造、销售与服务、充电网络、项目管理、设计、职能等岗位，另设「理想 ONE」管培生计划。工作地点北京、上海、深圳、杭州、常州等。',
    requirements:
      '全球 2027 届毕业生（毕业时间 2026 年 9 月—2027 年 8 月）。',
    source_url: 'https://www.lixiang.com/employ/campus.html',
    apply_url: 'https://www.lixiang.com/employ/campus.html',
    aliases: ['理想汽车', '理想', 'Li Auto'],
  },
  {
    company: '小鹏汽车',
    title: '小鹏集团 2027 届「探索者计划」全球校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '新能源汽车',
    cohort: '2027 届',
    responsibilities:
      '以物理 AI 为底座，开放算法、软硬件开发、测试、产品、设计、营销、运营、供应链、职能等岗位。工作地点广州、深圳、上海、北京。',
    requirements:
      '2027 届全球毕业生（以官网各岗位为准）。',
    source_url: 'https://www.xpeng.com/join-us',
    apply_url: 'https://xiaopeng.jobs.feishu.cn',
    aliases: ['小鹏汽车', '小鹏', 'XPeng'],
  },
  {
    company: '大疆',
    title: 'DJI 大疆 2027「拓疆者」校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '智能硬件',
    cohort: '2027 届',
    responsibilities:
      '开放研发、算法、产品、硬件、机械、软件、飞控、机器人等方向岗位，招聘约 1000 人。工作地点深圳、上海、北京。本次校招不设网申截止时间，招满即止，每人限投 1 个职位。',
    requirements:
      '2027 届高校毕业生（优秀的 2026 届毕业生可适当放宽），本科、硕士、博士。',
    source_url: 'https://careers.dji.com',
    apply_url: 'https://apply.careers.dji.com/campus-recruitment/dji/143359',
    aliases: ['大疆', 'DJI', '大疆创新'],
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

console.log(`\n第四批完成：新增 ${inserted} 条，更新 ${updated} 条，失败 ${failed} 条，共 ${jobs.length} 条。`);
