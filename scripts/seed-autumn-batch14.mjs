/**
 * 第十四批秋招岗位：央企 / 运营商 / 能源 / 车企 / 消费
 * Run: node scripts/seed-autumn-batch14.mjs
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
    company: '中国移动',
    title: '中国移动 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '通信 / 运营商',
    cohort: '2027 届',
    responsibilities:
      '开放技术、市场、综合等岗位，覆盖各省分公司及终端公司、在线营销服务中心等专业机构，提供 9000+ 就业机会。',
    requirements:
      '2027 届应届生，通信、计算机、电子、市场营销等相关专业，本科及以上学历。',
    source_url: 'https://job.10086.cn',
    apply_url: 'https://job.10086.cn',
    aliases: ['中国移动', 'China Mobile'],
  },
  {
    company: '中国电信',
    title: '中国电信 2027 届应届生秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '通信 / 运营商',
    cohort: '2027 届',
    responsibilities:
      '开放市场、销售与服务、产品、企业信息化、网发建设、网络维护与服务支撑、研发、产数及综合支撑九大类岗位，工作地点全国。',
    requirements:
      '2027 届国内外高等院校本科、硕士、博士毕业生。',
    source_url: 'https://job.chinatelecom.com.cn',
    apply_url: 'https://job.chinatelecom.com.cn',
    aliases: ['中国电信', 'China Telecom'],
  },
  {
    company: '中国联通',
    title: '中国联通 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '通信 / 运营商',
    cohort: '2027 届',
    responsibilities:
      '开放技术、市场、职能等岗位，工作地点全国各省市。',
    requirements:
      '2027 届应届生，通信、计算机、电子等相关专业，本科及以上学历。',
    source_url: 'https://www.chinaunicom.com.cn',
    apply_url: 'https://www.chinaunicom.com.cn',
    aliases: ['中国联通', 'China Unicom'],
  },
  {
    company: '国家电网',
    title: '国家电网 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '电力 / 能源',
    cohort: '2027 届',
    responsibilities:
      '开放电气工程、电力系统、通信、计算机、财务、人力资源等岗位，覆盖各省电力公司及直属单位。',
    requirements:
      '2027 届应届生，电气、能动、计算机、财务等专业，本科及以上学历。',
    source_url: 'https://zhaopin.sgcc.com.cn',
    apply_url: 'https://zhaopin.sgcc.com.cn',
    aliases: ['国家电网', 'SGCC'],
  },
  {
    company: '中国石油',
    title: '中国石油 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '能源 / 石油',
    cohort: '2027 届',
    responsibilities:
      '开放油气田、炼化、销售、工程建设等方向岗位，工作地点全国。',
    requirements:
      '2027 届高校毕业生，石油、化工、地质、机械、电气等相关专业。',
    source_url: 'https://zhaopin.cnpc.com.cn',
    apply_url: 'https://zhaopin.cnpc.com.cn',
    aliases: ['中国石油', 'CNPC'],
  },
  {
    company: '中国石化',
    title: '中国石化 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '能源 / 石化',
    cohort: '2027 届',
    responsibilities:
      '开放油气勘探、炼化、销售、科研等岗位，工作地点全国。',
    requirements:
      '2027 届应届生，化工、石油、地质、机械、电气等相关专业。',
    source_url: 'https://job.sinopec.com',
    apply_url: 'https://job.sinopec.com',
    aliases: ['中国石化', 'Sinopec'],
  },
  {
    company: '特斯拉',
    title: '特斯拉 2027 届秋季校园招聘',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '新能源汽车',
    cohort: '2027 届',
    responsibilities:
      '开放研发、制造、工程、销售、服务等岗位，工作地点上海及全国。',
    requirements:
      '2027 届应届生，机械、电子、软件、车辆等相关专业。',
    source_url: 'https://www.tesla.cn',
    apply_url: 'https://www.tesla.cn',
    aliases: ['特斯拉', 'Tesla'],
  },
  {
    company: '奇瑞汽车',
    title: '奇瑞汽车 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '芜湖',
    industry: '汽车',
    cohort: '2027 届',
    responsibilities:
      '开放机械、电气、电子信息、能源动力、计算机、自动化、材料、新能源等方向岗位，工作地点芜湖、合肥、上海、青岛等及海外。',
    requirements:
      '2026 年 1 月—2027 年 7 月毕业的海内外应届本科、硕士、博士。',
    source_url: 'https://chery.zhiye.com/campus',
    apply_url: 'https://chery.zhiye.com/campus',
    aliases: ['奇瑞汽车', 'Chery'],
  },
  {
    company: '安踏集团',
    title: '安踏集团 2027 届全球校园招聘',
    type: 'autumn_recruitment',
    city: '厦门',
    industry: '体育用品 / 消费',
    cohort: '2027 届',
    responsibilities:
      '开放商品族、品牌族、零售族、供应链族、职能族等岗位族，含鞋/服/配产品企划、品牌创意、零售管理等，工作地点厦门、上海、广州、北京等 30+ 城市。',
    requirements:
      '2027 届全球高校毕业生（2026 年 9 月—2027 年 8 月毕业）。',
    source_url: 'https://campus.anta.com',
    apply_url: 'https://campus.anta.com',
    aliases: ['安踏集团', 'ANTA'],
  },
  {
    company: '李宁',
    title: '李宁集团 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '体育用品 / 消费',
    cohort: '2027 届',
    responsibilities:
      '开放产品管理、供应链管理、研发创新、商品管理、品牌与营销、渠道管理、电商运营、零售管培生等岗位，工作地点北京、上海、深圳、广州、杭州等。',
    requirements:
      '2027 届国内外院校本科及以上毕业生。',
    source_url: 'https://lining.hotjob.cn',
    apply_url: 'https://lining.hotjob.cn',
    aliases: ['李宁', 'Li-Ning'],
  },
  {
    company: '泡泡玛特',
    title: '泡泡玛特 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '潮玩 / 消费',
    cohort: '2027 届',
    responsibilities:
      '开放产品设计、IP 运营、供应链、门店运营、电商、职能等岗位，工作地点北京、上海、深圳等。',
    requirements:
      '2027 届应届生，专业不限，设计、市场等相关专业优先。',
    source_url: 'https://www.popmart.com',
    apply_url: 'https://www.popmart.com',
    aliases: ['泡泡玛特', 'POP MART'],
  },
  {
    company: '海康威视',
    title: '海康威视 2027 届校园招聘',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '安防 / 智能物联',
    cohort: '2027 届',
    responsibilities:
      '开放算法、软件、国内营销、国际营销、供应链等岗位，工作地点杭州及全国。',
    requirements:
      '2027 届应届生，计算机、自动化、电子、市场营销等专业。',
    source_url: 'https://campushr.hikvision.com',
    apply_url: 'https://campushr.hikvision.com',
    aliases: ['海康威视', 'Hikvision'],
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
