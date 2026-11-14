/**
 * 第九批秋招岗位：快消 / 半导体 / 游戏 / 汽车 / 金融科技 / 电商独角兽
 * Run: node scripts/seed-autumn-batch9.mjs
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
    company: '地平线',
    title: '地平线 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '智能驾驶 / 芯片',
    cohort: '2027 届',
    responsibilities:
      '面向智能驾驶与具身智能赛道，开放端到端算法、感知算法、大模型、软件开发、嵌入式、芯片物理设计、数字设计、AI 产品经理、Agent 开发等岗位，覆盖北京、上海、深圳、南京、成都等城市。',
    requirements:
      '2027 届应届生，计算机、人工智能、数学、电子、通信、自动化等相关专业，硕士及以上学历优先。',
    source_url: 'https://www.horizon.cc',
    apply_url: 'https://www.horizon.cc',
    aliases: ['地平线', 'Horizon Robotics'],
  },
  {
    company: '中芯国际',
    title: '中芯国际 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '半导体',
    cohort: '2027 届',
    responsibilities:
      '开放工艺研发、器件、工艺整合、设备、良率、测试、制造、厂务、职能等岗位，覆盖上海、北京、天津、深圳、成都等主要晶圆厂及研发中心。',
    requirements:
      '2027 届海内外应届生，微电子、物理、材料、化学、机械、电气、自动化等相关专业。',
    source_url: 'https://www.smics.com',
    apply_url: 'https://campus.smics.com',
    aliases: ['中芯国际', 'SMIC'],
  },
  {
    company: '宝洁',
    title: '宝洁（P&G）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '广州',
    industry: '快消',
    cohort: '2027 届',
    responsibilities:
      '开放管理培训生、供应链、品牌管理、研发、销售、财务等方向，工作地点广州、上海、北京等。',
    requirements:
      '2027 届海内外应届生，专业不限，具备领导力与英语沟通能力。',
    source_url: 'https://www.pgcareers.cn',
    apply_url: 'https://www.pgcareers.cn',
    aliases: ['宝洁', 'P&G', 'Procter & Gamble'],
  },
  {
    company: '联合利华',
    title: '联合利华 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '快消',
    cohort: '2027 届',
    responsibilities:
      '开放管理培训生、市场、销售、供应链、研发、财务等岗位，工作地点上海、合肥、天津等。',
    requirements:
      '2027 届海内外应届生，专业不限，具备英语沟通能力。',
    source_url: 'https://careers.unilever.com.cn',
    apply_url: 'https://careers.unilever.com.cn',
    aliases: ['联合利华', 'Unilever'],
  },
  {
    company: '微众银行',
    title: '微众银行 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '金融科技 / 银行',
    cohort: '2027 届',
    responsibilities:
      '开放技术研发、数据、算法、产品、风控、运营、职能等岗位，工作地点深圳。',
    requirements:
      '2027 届海内外应届生，计算机、金融、数学、统计等相关专业。',
    source_url: 'https://hr.webank.com',
    apply_url: 'https://hr.webank.com',
    aliases: ['微众银行', 'WeBank'],
  },
  {
    company: '巨人网络',
    title: '巨人网络 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放游戏策划、游戏开发、游戏美术、运营发行、项目管理、职能六大方向岗位，工作地点上海。',
    requirements:
      '2027 届应届生，计算机、美术、设计、数学等相关专业。',
    source_url: 'https://app.mokahr.com/campus-recruitment/ztgame/92438',
    apply_url: 'https://app.mokahr.com/campus-recruitment/ztgame/92438',
    aliases: ['巨人网络', 'Giant'],
  },
  {
    company: '游卡',
    title: '游卡 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放游戏程序、游戏策划、美术表现等岗位，旗下含《三国杀》等 IP，工作地点杭州。',
    requirements:
      '2027 届应届生，计算机、设计、美术等相关专业。',
    source_url: 'https://www.yokagames.com',
    apply_url: 'https://www.yokagames.com',
    aliases: ['游卡', 'YokaGames'],
  },
  {
    company: '点点互动',
    title: '点点互动 2027 届应届生校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放策划、美术、市场等岗位，出海游戏方向，工作地点上海。',
    requirements:
      '2027 届应届生，相关专业背景。',
    source_url: 'https://www.ddhdgames.com',
    apply_url: 'https://www.ddhdgames.com',
    aliases: ['点点互动', 'DDHD'],
  },
  {
    company: '欣旺达',
    title: '欣旺达 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '新能源 / 电池',
    cohort: '2027 届',
    responsibilities:
      '开放研发、制造、职能类岗位，聚焦锂电池与储能方向，工作地点深圳、惠州、东莞等。',
    requirements:
      '2027 届海内外应届生，材料、化学、机械、电子、电气等相关专业。',
    source_url: 'https://www.sunwoda.com',
    apply_url: 'https://www.sunwoda.com',
    aliases: ['欣旺达', 'Sunwoda'],
  },
  {
    company: '上汽通用五菱',
    title: '上汽通用五菱 2027 届全球秋季校园招聘',
    type: 'autumn_recruitment',
    city: '柳州',
    industry: '汽车',
    cohort: '2027 届',
    responsibilities:
      '开放研发、制造、营销、职能等岗位，覆盖柳州、青岛、重庆、上海及东南亚、欧洲等海外市场。',
    requirements:
      '2027 届海内外应届生，机械、车辆、电子、自动化、营销等相关专业。',
    source_url: 'https://www.sgmw.com.cn',
    apply_url: 'https://www.sgmw.com.cn',
    aliases: ['上汽通用五菱', 'SGMW'],
  },
  {
    company: '盒马',
    title: '盒马 2027 届产研应届生校招',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '新零售 / 电商',
    cohort: '2027 届',
    responsibilities:
      '开放研发、算法、数据等产研类岗位，工作地点上海、杭州等。',
    requirements:
      '2027 届应届生，计算机、数据、算法等相关专业。',
    source_url: 'https://www.freshhema.com',
    apply_url: 'https://campus.aliyun.com',
    aliases: ['盒马', 'FreshHema'],
  },
  {
    company: '淘米网络',
    title: '淘米网络 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '游戏',
    cohort: '2027 届',
    responsibilities:
      '开放游戏策划、游戏开发、游戏美术（角色原画、场景原画、3D 特效、2D 动画、技术美术）、游戏营销等岗位，旗下含《摩尔庄园》《赛尔号》《小花仙》IP，工作地点上海。',
    requirements:
      '2027 届毕业生，美术岗位需附作品集。',
    source_url: 'https://www.61.com',
    apply_url: 'https://www.61.com',
    aliases: ['淘米网络', 'Taomee'],
  },
  {
    company: '慧策（掌上先机）',
    title: '慧策（掌上先机）2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '企业服务 / SaaS',
    cohort: '2027 届',
    responsibilities:
      '开放产研类（Java 开发、数据、后端、推荐算法、前端、产品、数据分析等）、业务类（销售管培生、实施管培生、客户成功管培生等）、职能类岗位，工作地点北京、天津及全国业务网点。',
    requirements:
      '2027 届应届生，专业不限，技术岗需计算机相关专业。',
    source_url: 'https://huicecom.zhiye.com/Campus',
    apply_url: 'https://huicecom.zhiye.com/Campus',
    aliases: ['慧策', '掌上先机', 'Huice'],
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
