/**
 * 第三十二批：机场/PCB/化工 + 宠物/零售
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'上海机场集团', title:'上海机场集团 2027 年度校园招聘', city:'上海', industry:'交通/机场', cohort:'2027 届', responsibilities:'开放岗位：培养生类（管理培训生）、机场运行类（机坪管制、航站楼运行管理、陆侧交通运行管理）、技术支持类（机电设备管理、信息系统管理、电气/暖通/给排水/生态净空技术支持）、工程建设类（工程管理）、经营管理类（商业资源开发）。工作地点：上海（浦东、虹桥两大机场）。', requirements:'2027 届本科及以上，2027.8.31 前取得毕业证/学位证，机械、电气、计算机、工程、经管等专业。', source_url:'https://shjc.zhaopin.com', apply_url:'https://shjc.zhaopin.com', aliases:['上海机场集团','上海机场','Shanghai Airport'] },
  { company:'深南电路', title:'深南电路 2027 届校园招聘', city:'深圳', industry:'半导体/PCB', cohort:'2027 届', responsibilities:'开放岗位：计划岗（博士，大模型算法/GNN-LSTM/供应链智能调度）、PCB 研发、PCBA、封装基板、工艺、设备、质量、供应链、职能等方向。工作地点：深圳（总部）、南通、无锡、上海等。', requirements:'2026-2027 届，博士岗需 AI、运筹、数学、统计、计算机等专业，本科硕士需电子、材料、化工、机械等专业。', source_url:'https://campus.scc.com.cn', apply_url:'https://campus.scc.com.cn', aliases:['深南电路','SCC'] },
  { company:'生益科技', title:'生益科技 2027 届校园招聘', city:'东莞', industry:'半导体/PCB', cohort:'2027 届', responsibilities:'开放岗位：覆铜板、绝缘材料研发、工艺、质量、设备、销售、供应链、职能等方向。工作地点：东莞（总部）、苏州、陕西等。', requirements:'2027 届应届生，材料、化工、电子、机械等专业。', source_url:'https://www.syst.com.cn', apply_url:'https://www.syst.com.cn', aliases:['生益科技','Syst'] },
  { company:'万华化学', title:'万华化学 2027 届校园招聘', city:'烟台', industry:'化工', cohort:'2027 届', responsibilities:'开放岗位：研发、工艺、设备、仪表、电气、安全环保、销售、供应链、职能等方向，聚焦聚氨酯、石化、精细化学品。工作地点：烟台（总部）、宁波、珠海、眉山及海外。', requirements:'2027 届应届生，化学、化工、材料、机械、自动化、安全等专业，硕博优先。', source_url:'https://www.whchem.com', apply_url:'https://www.whchem.com', aliases:['万华化学','万华','Wanhua'] },
  { company:'卫星化学', title:'卫星化学 2027 届校园招聘', city:'嘉兴', industry:'化工', cohort:'2027 届', responsibilities:'开放岗位：研发、工艺、设备、仪表、电气、销售、供应链、职能等方向，聚焦轻烃一体化与新材料。工作地点：嘉兴（总部）、连云港、平湖等。', requirements:'2027 届应届生，化学、化工、材料、机械、自动化等专业。', source_url:'https://www.stl-chem.com', apply_url:'https://www.stl-chem.com', aliases:['卫星化学','卫星石化','Satellite Chemical'] },
  { company:'中宠股份', title:'中宠股份 2027 届校园招聘', city:'烟台', industry:'宠物/食品', cohort:'2027 届', responsibilities:'开放岗位：人力资源管培生、国际营销管培生、研发、生产、供应链、电商运营、品牌等方向。工作地点：烟台（总部）及全国、海外。', requirements:'2027 届硕士为主，人力、营销、食品、动物科学、外语等专业。', source_url:'https://www.wanpy.com', apply_url:'https://www.wanpy.com', aliases:['中宠股份','中宠','Wanpy'] },
  { company:'乖宝宠物', title:'乖宝宠物（麦富迪）2027 届校园招聘', city:'聊城', industry:'宠物/食品', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、供应链、电商运营、品牌营销、职能等方向，旗下麦富迪品牌。工作地点：聊城（总部）、上海等。', requirements:'2027 届应届生，食品、动物科学、营销、电商等专业。', source_url:'https://www.gambolpet.com', apply_url:'https://www.gambolpet.com', aliases:['乖宝宠物','麦富迪','Gambol'] },
  { company:'永辉超市', title:'永辉超市 2027 届校园招聘', city:'福州', industry:'零售', cohort:'2027 届', responsibilities:'开放岗位：1933 零售精英工程管培生（储备干部，门店运营/供应链/商品/职能方向）。工作地点：福州（总部）及全国门店。', requirements:'2027 届应届生，专业不限，零售、食品、经管等优先。', source_url:'https://www.yonghui.com.cn', apply_url:'https://www.yonghui.com.cn', aliases:['永辉超市','永辉','Yonghui'] },
  { company:'天虹股份', title:'天虹股份 2027 届校园招聘', city:'深圳', industry:'零售', cohort:'2027 届', responsibilities:'开放岗位：门店运营管培生、招商、电商运营、供应链、职能等方向。工作地点：深圳（总部）及全国门店。', requirements:'2027 届应届生，专业不限，经管、零售、电商优先。', source_url:'https://www.rainbowcn.com', apply_url:'https://www.rainbowcn.com', aliases:['天虹股份','天虹','Rainbow'] },
  { company:'王府井集团', title:'王府井集团 2027 届校园招聘', city:'北京', industry:'零售', cohort:'2027 届', responsibilities:'开放岗位：门店运营管培生、招商、商品、电商、职能等方向。工作地点：北京（总部）及全国门店。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.wfj.com.cn', apply_url:'https://www.wfj.com.cn', aliases:['王府井集团','王府井','Wangfujing'] },
];
let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
