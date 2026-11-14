/**
 * 第二十八批：出版传媒央企 + 家具中小厂
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'中国出版集团', title:'中国出版集团 2027 届校园招聘', city:'北京', industry:'出版/传媒', cohort:'2027 届', responsibilities:'开放岗位：编辑类（商务印书馆、中华书局、三联书店、人民文学、人民美术、人民音乐、中国大百科全书出版社等）、非编辑类（版权贸易、数字出版、翻译、印刷复制、物流发行、大数据服务、资产资本运营、职能）。工作地点：北京（除东方出版中心在上海外，其余均在北京）。设「拔尖人才计划」。', requirements:'2027 届应届生，文学、历史、哲学、新闻传播、法学、经管、心理学、理学、工学、人工智能等专业。', source_url:'https://cnpubg.iguopin.com', apply_url:'https://cnpubg.iguopin.com', aliases:['中国出版集团','中国出版','CNPubg'] },
  { company:'凤凰出版传媒', title:'凤凰出版传媒集团 2027 届校园招聘', city:'南京', industry:'出版/传媒', cohort:'2027 届', responsibilities:'开放岗位：编辑、数字出版、版权贸易、发行、印刷、职能等方向。工作地点：南京（总部）及江苏省内。', requirements:'2027 届应届生，文学、历史、新闻传播、经管、计算机等专业。', source_url:'https://www.ppmg.cn', apply_url:'https://www.ppmg.cn', aliases:['凤凰出版传媒','凤凰传媒','PPMG'] },
  { company:'中南出版传媒', title:'中南出版传媒集团 2027 届校园招聘', city:'长沙', industry:'出版/传媒', cohort:'2027 届', responsibilities:'开放岗位：编辑、数字出版、版权贸易、发行、职能等方向。工作地点：长沙（总部）。', requirements:'2027 届应届生，文学、历史、新闻传播、经管等专业。', source_url:'https://www.zncm.com.cn', apply_url:'https://www.zncm.com.cn', aliases:['中南出版传媒','中南传媒'] },
  { company:'山东出版集团', title:'山东出版集团 2027 届校园招聘', city:'济南', industry:'出版/传媒', cohort:'2027 届', responsibilities:'开放岗位：编辑、数字出版、发行、印刷、职能等方向。工作地点：济南（总部）。', requirements:'2027 届应届生，文学、历史、新闻传播、经管等专业。', source_url:'https://www.sdpress.com.cn', apply_url:'https://www.sdpress.com.cn', aliases:['山东出版集团','山东出版'] },
  { company:'圣奥集团', title:'圣奥集团 2027 届校园招聘', city:'杭州', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：营销类（销售工程师/解决方案设计师/外贸业务员/跨境电商运营/中心助理/售后专员）、职能管理类（行政/展厅讲解/订单助理）、智能制造类（生产助理/设备工程师/仓储工程师/模具工程师/物流交付/质量/检测）。工作地点：杭州、上海、北京、广州、武汉、济南、青岛、深圳、河北深州、嘉兴海宁、广东中山。', requirements:'2027 届应届生，专业不限，学习成绩优秀，抗压能力强。', source_url:'https://www.sunon.com', apply_url:'https://www.sunon.com', aliases:['圣奥集团','圣奥','Sunon'] },
  { company:'曲美家居', title:'曲美家居 2027 届校园招聘', city:'北京', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：设计、营销、研发、制造、供应链、职能等方向，聚焦整家定制。工作地点：北京（总部）及全国。', requirements:'2027 届应届生，设计、木材、材料、营销等专业。', source_url:'https://www.qumei.com', apply_url:'https://www.qumei.com', aliases:['曲美家居','曲美','Qumei'] },
  { company:'喜临门', title:'喜临门 2027 届校园招聘', city:'绍兴', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：研发、设计、营销、制造、供应链、职能等方向，聚焦床垫寝具。工作地点：绍兴（总部）及全国。', requirements:'2027 届应届生，材料、设计、营销等专业。', source_url:'https://www.sleemon.com', apply_url:'https://www.sleemon.com', aliases:['喜临门','Sleemon'] },
  { company:'梦百合', title:'梦百合 2027 届校园招聘', city:'南通', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：研发、设计、营销、制造、供应链、职能等方向，聚焦记忆绵家居。工作地点：南通如皋（总部）及全国、海外。', requirements:'2027 届应届生，材料、设计、营销等专业。', source_url:'https://www.mlily.com', apply_url:'https://www.mlily.com', aliases:['梦百合','Mlily'] },
];
let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
