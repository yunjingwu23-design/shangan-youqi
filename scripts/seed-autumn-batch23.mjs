/**
 * 第二十三批：城商行/农商行 + 汽车零部件/制造
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'徽商银行', title:'徽商银行 2027 届全球校园招聘', city:'合肥', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：总行金融科技岗（软件开发类/数据模型类）、分行管理培训生、客户经理岗、定向柜员岗。工作地点：合肥（总行）、安徽全省及南京等地分行。', requirements:'2027 届应届生，软件开发/数据岗需计算机、AI、大数据、统计等专业，其余专业不限。', source_url:'https://rczp.hsbank.com.cn', apply_url:'https://rczp.hsbank.com.cn', aliases:['徽商银行','Huishang Bank'] },
  { company:'青岛银行', title:'青岛银行 2027 届校园招聘', city:'青岛', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：客户经理岗（110人）、运营支持岗（68人）、厅堂服务岗（56人）、管辖行管理培训生（70人）、总行管理培训生（15人）。工作地点：青岛及山东省内管辖行。', requirements:'2027 届本科及以上，客户经理/运营/厅堂专业不限，管培生需理学、工学、经济学、法学、管理类硕士。', source_url:'https://campus.51job.com/qdccb2027', apply_url:'https://campus.51job.com/qdccb2027', aliases:['青岛银行','BQD'] },
  { company:'成都银行', title:'成都银行 2027 届秋季校园招聘', city:'成都', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：总行及分行管培生、科技、营销、运营、综合柜员等方向。工作地点：成都（总行）、重庆、西安等。', requirements:'2027 届应届生，专业不限，经济、金融、计算机等优先。', source_url:'https://www.bocd.com.cn', apply_url:'https://www.bocd.com.cn', aliases:['成都银行','BOCD'] },
  { company:'广州农商银行', title:'广州农商银行 2027 届秋季校园招聘', city:'广州', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：管培生、科技、营销、运营、柜员等方向。工作地点：广州及珠三角。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.grcbank.com', apply_url:'https://www.grcbank.com', aliases:['广州农商银行','GRCB'] },
  { company:'东莞农商银行', title:'东莞农村商业银行 2027 届秋季校园招聘', city:'东莞', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：管培生、科技、营销、运营、柜员等方向。工作地点：东莞及珠三角。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.drcbank.com', apply_url:'https://www.drcbank.com', aliases:['东莞农商银行','DRC Bank'] },
  { company:'重庆银行', title:'重庆银行 2027 届校园招聘', city:'重庆', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：总行及分行管培生、科技、营销、运营等方向。工作地点：重庆、成都、西安等。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.cqcbank.com', apply_url:'https://www.cqcbank.com', aliases:['重庆银行','Bank of Chongqing'] },
  { company:'长沙银行', title:'长沙银行 2027 届校园招聘', city:'长沙', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：管培生、科技、营销、运营、柜员等方向。工作地点：长沙及湖南省内。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.cscb.cn', apply_url:'https://www.cscb.cn', aliases:['长沙银行','BANK OF CHANGSHA'] },
  { company:'福耀玻璃', title:'福耀玻璃 2027 届校园招聘', city:'福州', industry:'汽车零部件', cohort:'2027 届', responsibilities:'开放岗位：研发、工艺、质量、设备、制造、供应链、销售、职能等方向，聚焦汽车玻璃。工作地点：福州福清（总部）及全国基地、海外。', requirements:'2027 届应届生，材料、机械、化工、自动化、管理等相关专业。', source_url:'https://www.fuyaogroup.com', apply_url:'https://www.fuyaogroup.com', aliases:['福耀玻璃','Fuyao'] },
  { company:'潍柴动力', title:'潍柴动力 2027 届全球校园招聘', city:'潍坊', industry:'制造/发动机', cohort:'2027 届', responsibilities:'开放岗位：产品设计类（发动机零部件/整机设计）、仿真研究类（动力学/流体/燃烧/热管理）、新能源动力电池产品类（青岛，BMS/电芯）、电控硬件开发、基础软件开发（嵌入式/Linux）、职能管理（财会/人力/法务）。工作地点：潍坊（总部）、青岛、全国。', requirements:'2027 届本硕博，机械、能动、车辆、电气、软件、材料、财会、法学等专业。', source_url:'https://weichai.zhiye.com', apply_url:'https://weichai.zhiye.com', aliases:['潍柴动力','潍柴集团','Weichai'] },
  { company:'盾安环境', title:'盾安环境 2027 届校园招聘', city:'绍兴', industry:'汽车零部件/制冷', cohort:'2027 届', responsibilities:'开放岗位：技术类（产品开发、工艺技术、仿真、设备管理、液冷、具身机器人）、质量制造类（质量管理、生产管理）、计划采购类（供应链、物流）、销售类（国内外销售）、职能类（财务/审计/法务/IT）。工作地点：绍兴诸暨（总部）、珠海、芜湖、南昌、合肥、苏州、天津、泰国等。', requirements:'2027 届本硕博，机械、能动、建环、车辆、焊接、材料、电气、财会、法学、计算机等专业。', source_url:'https://www.dunan.net', apply_url:'https://www.dunan.net', aliases:['盾安环境','Dunan'] },
  { company:'三花智控', title:'三花智控 2027 届校园招聘', city:'绍兴', industry:'汽车零部件/制冷', cohort:'2027 届', responsibilities:'开放岗位：研发工程师、销售工程师、质量工程师、生产运营管理岗、采购工程师（IT/技术类、硬件/工程类）。工作地点：绍兴（总部）、全国及美国、墨西哥、印度、欧洲等海外基地。', requirements:'2027 届本科及以上，机械、材料、焊接、流体力学、能动、制冷、电子、国贸、小语种等专业。', source_url:'https://www.sanhuagroup.com', apply_url:'https://www.sanhuagroup.com', aliases:['三花智控','Sanhua'] },
  { company:'均胜电子', title:'均胜电子 2027 届校园招聘', city:'宁波', industry:'汽车零部件', cohort:'2027 届', responsibilities:'开放岗位：研发、软件、硬件、测试、工艺、质量、供应链、职能等方向，聚焦汽车安全与智能座舱。工作地点：宁波（总部）、上海及海外。', requirements:'2027 届应届生，电子、软件、机械、材料等专业。', source_url:'https://www.joyson.cn', apply_url:'https://www.joyson.cn', aliases:['均胜电子','Joyson'] },
  { company:'中国中车', title:'中国中车 2027 届校园招聘', city:'北京', industry:'制造/轨道交通', cohort:'2027 届', responsibilities:'开放岗位：机车车辆、机电、电气、自动化、材料、软件、管理、职能等岗位，覆盖旗下各子企业。工作地点：北京、株洲、青岛、大连、长春、唐山等全国。', requirements:'2027 届应届生，机械、电气、材料、软件、管理等专业。', source_url:'https://www.crrcgc.cc', apply_url:'https://www.crrcgc.cc', aliases:['中国中车','中车','CRRC'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
