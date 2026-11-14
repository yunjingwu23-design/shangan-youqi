/**
 * 第十九批：城商行 + 车企 + 制造/消费补充
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'宁波银行', title:'宁波银行 2027 届校园招聘', city:'宁波', industry:'银行', cohort:'2027 届', responsibilities:'开放总行培训生（公司金融/财富管理/量化风控）、金融科技定向生、分行培训生、客户经理、理财经理、综合柜员等岗位。', requirements:'2027 届应届生，本科及以上学历，专业不限。', source_url:'https://zhaopin.nbcb.com.cn', apply_url:'https://zhaopin.nbcb.com.cn', aliases:['宁波银行','NBCB'] },
  { company:'江苏银行', title:'江苏银行 2027 届校园招聘', city:'南京', industry:'银行', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.jsbchina.cn', apply_url:'https://www.jsbchina.cn', aliases:['江苏银行','JSB'] },
  { company:'北京银行', title:'北京银行 2027 届校园招聘', city:'北京', industry:'银行', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.bankofbeijing.com.cn', apply_url:'https://www.bankofbeijing.com.cn', aliases:['北京银行','BOB'] },
  { company:'上海银行', title:'上海银行 2027 届校园招聘', city:'上海', industry:'银行', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.bosc.cn', apply_url:'https://www.bosc.cn', aliases:['上海银行','BOSC'] },
  { company:'杭州银行', title:'杭州银行 2027 届校园招聘', city:'杭州', industry:'银行', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.hzbank.com.cn', apply_url:'https://www.hzbank.com.cn', aliases:['杭州银行','HZBank'] },
  { company:'南京银行', title:'南京银行 2027 届校园招聘', city:'南京', industry:'银行', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.njcb.com.cn', apply_url:'https://www.njcb.com.cn', aliases:['南京银行','NJCB'] },
  { company:'长城汽车', title:'长城汽车 2027 届校园招聘', city:'保定', industry:'汽车', cohort:'2027 届', responsibilities:'开放整车研发、新能源、智能驾驶、制造、营销、职能等岗位。', requirements:'2027 届应届生，机械、车辆、电子、软件等专业。', source_url:'https://www.gwm.com.cn', apply_url:'https://www.gwm.com.cn', aliases:['长城汽车','GWM'] },
  { company:'长安汽车', title:'长安汽车 2027 届校园招聘', city:'重庆', industry:'汽车', cohort:'2027 届', responsibilities:'开放整车研发、新能源、智能网联、制造、营销、职能等岗位。', requirements:'2027 届应届生，机械、车辆、电子、软件等专业。', source_url:'https://www.changan.com.cn', apply_url:'https://www.changan.com.cn', aliases:['长安汽车','Changan'] },
  { company:'江淮汽车', title:'江淮汽车 2027 届校园招聘', city:'合肥', industry:'汽车', cohort:'2027 届', responsibilities:'开放 IT 信息技术、工艺质量、营销品牌、专业管理等岗位，工作地点合肥等。', requirements:'2026、2027 届本科及以上，机械、电子、计算机、管理、营销等专业。', source_url:'https://www.jac.com.cn', apply_url:'https://www.jac.com.cn', aliases:['江淮汽车','JAC'] },
  { company:'北汽集团', title:'北汽集团 2027 届校园招聘', city:'北京', industry:'汽车', cohort:'2027 届', responsibilities:'开放整车研发、新能源、制造、营销、职能等岗位，工作地点北京等。', requirements:'2027 届应届生，机械、车辆、电子等专业。', source_url:'https://www.baicgroup.com.cn', apply_url:'https://www.baicgroup.com.cn', aliases:['北汽集团','BAIC'] },
  { company:'零跑汽车', title:'零跑汽车 2027 届校园招聘', city:'杭州', industry:'新能源汽车', cohort:'2027 届', responsibilities:'开放智驾算法、三电算法、软硬件、大数据、整车研发、电池研发、电驱研发、测试验证、工艺、供应链、营销等岗位，产研岗占比 80%。', requirements:'2027 届海内外应届生（2026.11—2027.10 毕业），机械、电子、软件、车辆等专业。', source_url:'https://www.leapmotor.com', apply_url:'https://www.leapmotor.com', aliases:['零跑汽车','Leapmotor'] },
  { company:'极氪', title:'极氪 2027 届校园招聘', city:'杭州', industry:'新能源汽车', cohort:'2027 届', responsibilities:'开放整车研发、三电、智能驾驶、软件、制造、营销、职能等岗位。', requirements:'2027 届应届生，机械、电子、软件、车辆等专业。', source_url:'https://www.zeekrlife.com', apply_url:'https://www.zeekrlife.com', aliases:['极氪','Zeekr'] },
  { company:'三一集团', title:'三一集团 2027 届校园招聘', city:'长沙', industry:'制造/工程机械', cohort:'2027 届', responsibilities:'开放研发、制造、营销、国际化、职能等岗位，工作地点长沙、北京、上海等及海外。', requirements:'2027 届应届生，机械、电子、软件、管理等专业。', source_url:'https://www.sany.com.cn', apply_url:'https://www.sany.com.cn', aliases:['三一集团','SANY'] },
  { company:'徐工集团', title:'徐工集团 2027 届校园招聘', city:'徐州', industry:'制造/工程机械', cohort:'2027 届', responsibilities:'开放研发、制造、营销、国际化、职能等岗位，工作地点徐州及全国。', requirements:'2027 届应届生，机械、电子、软件、管理等专业。', source_url:'https://www.xcmg.com', apply_url:'https://www.xcmg.com', aliases:['徐工集团','XCMG'] },
  { company:'中联重科', title:'中联重科 2027 届校园招聘', city:'长沙', industry:'制造/工程机械', cohort:'2027 届', responsibilities:'开放研发、制造、营销、国际化、职能等岗位。', requirements:'2027 届应届生，机械、电子、软件、管理等专业。', source_url:'https://www.zoomlion.com', apply_url:'https://www.zoomlion.com', aliases:['中联重科','Zoomlion'] },
  { company:'比亚迪电子', title:'比亚迪电子 2027 届校园招聘', city:'深圳', industry:'制造/电子', cohort:'2027 届', responsibilities:'开放电子、结构、软件、制造、供应链、职能等岗位。', requirements:'2027 届应届生，电子、机械、软件等专业。', source_url:'https://www.byd.com', apply_url:'https://www.byd.com', aliases:['比亚迪电子','BYD Electronic'] },
  { company:'京东方精电', title:'京东方精电 2027 届校园招聘', city:'深圳', industry:'半导体显示', cohort:'2027 届', responsibilities:'开放车载显示、研发、制造、供应链、职能等岗位。', requirements:'2027 届应届生，电子、材料、机械等专业。', source_url:'https://www.boe.com', apply_url:'https://www.boe.com', aliases:['京东方精电'] },
  { company:'闻泰科技', title:'闻泰科技 2027 届校园招聘', city:'嘉兴', industry:'半导体/电子', cohort:'2027 届', responsibilities:'开放半导体、电子、软件、制造、供应链等岗位，工作地点嘉兴、上海等。', requirements:'2027 届应届生，微电子、电子、软件等专业。', source_url:'https://www.wingtech.com', apply_url:'https://www.wingtech.com', aliases:['闻泰科技','Wingtech'] },
  { company:'华勤技术', title:'华勤技术 2027 届校园招聘', city:'上海', industry:'智能硬件', cohort:'2027 届', responsibilities:'开放硬件、软件、结构、供应链、职能等岗位，工作地点上海、东莞、南昌等。', requirements:'2027 届应届生，电子、软件、机械等专业。', source_url:'https://www.huaqin.com', apply_url:'https://www.huaqin.com', aliases:['华勤技术','Huaqin'] },
  { company:'传音控股', title:'传音控股 2027 届校园招聘', city:'深圳', industry:'智能硬件', cohort:'2027 届', responsibilities:'开放硬件、软件、算法、供应链、营销、职能等岗位，聚焦非洲及新兴市场。', requirements:'2027 届应届生，电子、软件、营销等专业。', source_url:'https://www.transsion.com', apply_url:'https://www.transsion.com', aliases:['传音控股','Transsion'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
