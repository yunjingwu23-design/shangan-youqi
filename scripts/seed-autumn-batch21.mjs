/**
 * 第二十一批：八大会计师事务所 + 家电中小厂（岗位明细 + 地点明确）
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'天健会计师事务所', title:'天健会计师事务所 2027 届校园招聘', city:'杭州', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：财务审计（年报审计/IPO审计/并购重组审计）、资产评估、涉税咨询、管理咨询、工程造价咨询。工作地点：杭州（总部）、北京、上海、成都、深圳、重庆、广州等 15+ 城市。', requirements:'2027 届本科及以上，会计、审计、财管、计算机审计等专业，CPA/ACCA 通过若干门优先。', source_url:'https://zhaopin.pccpa.cn', apply_url:'https://zhaopin.pccpa.cn', aliases:['天健','天健会计师事务所','Pan-China'] },
  { company:'立信会计师事务所', title:'立信会计师事务所 2027 届校园招聘', city:'上海', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：审计助理（年报/IPO/重组）、税务咨询、管理咨询、IT审计、造价咨询。工作地点：上海（总部）、北京、深圳、广州、杭州、成都、武汉、南京等全国分支机构。', requirements:'2027 届本科及以上，会计、审计、财务、计算机等专业。', source_url:'https://www.bdo.com.cn', apply_url:'https://www.bdo.com.cn', aliases:['立信','立信会计师事务所','BDO China'] },
  { company:'信永中和', title:'信永中和 2027 届校园招聘', city:'北京', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：财务/审计/税务类（审计含国际、金融、H股方向、税务咨询、会计代理）、管理咨询类（投融资、并购重组、风控合规、数字化规划、资产评估）、信息技术类（信息系统审计、前后端开发）、工程类（工程造价）、职能支持类。工作地点：北京、上海、深圳、成都、西安、天津、青岛、长沙、广州、武汉、杭州、重庆、合肥、郑州、苏州、厦门等 30+ 城市。', requirements:'2027 届毕业生，财经类、计算机类、工程类、管理类等专业。', source_url:'https://job.shinewing.com', apply_url:'https://job.shinewing.com', aliases:['信永中和','ShineWing'] },
  { company:'大华会计师事务所', title:'大华会计师事务所 2027 届校园招聘', city:'北京', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：审计、税务、咨询、工程造价等方向。工作地点：北京（总部）、上海、深圳、广州、杭州、成都、武汉等全国分支机构。', requirements:'2027 届本科及以上，会计、审计、财务等专业。', source_url:'https://www.dahua-cpa.com', apply_url:'https://www.dahua-cpa.com', aliases:['大华','大华会计师事务所'] },
  { company:'容诚会计师事务所', title:'容诚会计师事务所 2027 届校园招聘', city:'北京', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：审计助理（年报/IPO/重组）、税务、咨询等方向。工作地点：北京（总部）、合肥、沈阳、上海、济南、成都、苏州、杭州、深圳、厦门、南京、福州、广州、武汉、西安等 19 家分支机构。', requirements:'2027 届本科及以上，专业不限，财会类优先，CPA 通过部分科目优先。', source_url:'https://careers.rccpa.com.cn', apply_url:'https://careers.rccpa.com.cn', aliases:['容诚','容诚会计师事务所','RSM China'] },
  { company:'大信会计师事务所', title:'大信会计师事务所 2027 届校园招聘', city:'北京', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：审计类、风控审计类、IT审计类、咨询类、数据治理类、职能类。工作地点：北京总部、武汉、山东、上海、深圳及全国 33 家分支机构。', requirements:'2027 届本科及硕士，会计、审计、财管、计算机审计、智能会计、ACCA 等专业。', source_url:'https://daxincpa.zhiye.com', apply_url:'https://daxincpa.zhiye.com', aliases:['大信','大信会计师事务所'] },
  { company:'致同会计师事务所', title:'致同会计师事务所 2027 届校园招聘', city:'北京', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：审计、税务、咨询、评估等方向。工作地点：北京、上海、深圳、广州、杭州、成都等全国分支机构。', requirements:'2027 届本科及以上，会计、审计、财务等专业。', source_url:'https://www.grantthornton.cn', apply_url:'https://www.grantthornton.cn', aliases:['致同','致同会计师事务所','Grant Thornton'] },
  { company:'天职国际', title:'天职国际会计师事务所 2027 届校园招聘', city:'北京', industry:'咨询/审计', cohort:'2027 届', responsibilities:'开放岗位：审计、税务、咨询、IT审计等方向。工作地点：北京、上海、深圳、广州、杭州、成都等全国分支机构。', requirements:'2027 届本科及以上，会计、审计、财务、计算机等专业。', source_url:'https://www.tzcpa.com', apply_url:'https://www.tzcpa.com', aliases:['天职国际','天职'] },
  { company:'小熊电器', title:'小熊电器 2027 届校园招聘', city:'佛山', industry:'家电', cohort:'2027 届', responsibilities:'开放岗位：品推岗（全域流量/达人营销）、店铺运营专员（产品运营/活动规划）、店铺推广专员（付费推广）、管培生（市场营销方向/电商运营/品牌推广/产品经理）、工艺工程师（新品工艺导入/制程改善）、海外产品经理。工作地点：佛山顺德（总部）、广东佛山。', requirements:'2027 届本科及以上，营销、数据、计算机、机械、材料等专业优先，硕士有管培生通道。', source_url:'https://www.bears.com.cn', apply_url:'https://www.bears.com.cn', aliases:['小熊电器','Bear Electric'] },
  { company:'万和电气', title:'万和电气 2027 届校园招聘', city:'佛山', industry:'家电', cohort:'2027 届', responsibilities:'开放岗位：研发技术类（烤炉/取暖器/电热/采暖炉研发工程师、电控软件、阀体、电机研发）、国内营销类（销售业务）、国际营销类（海外销售）。工作地点：佛山顺德、佛山高明（研发）、全国（国内营销）。', requirements:'2027 届海内外本硕（2026.9—2027.9 毕业），机械、电子、自动化、软件、电气、小语种等专业。', source_url:'https://www.vanward.com', apply_url:'https://www.vanward.com', aliases:['万和电气','Vanward'] },
  { company:'九阳股份', title:'九阳股份 2027 届校园招聘', city:'杭州', industry:'家电', cohort:'2027 届', responsibilities:'开放岗位：研发技术、产品、电商运营、品牌营销、供应链、职能等方向。工作地点：杭州（总部）、济南等。', requirements:'2027 届应届生，机械、电子、食品、营销等相关专业。', source_url:'https://www.joyoung.com', apply_url:'https://www.joyoung.com', aliases:['九阳','Joyoung'] },
  { company:'苏泊尔', title:'苏泊尔 2027 届校园招聘', city:'杭州', industry:'家电', cohort:'2027 届', responsibilities:'开放岗位：研发、设计、产品、电商、营销、供应链、职能等方向。工作地点：杭州、武汉、绍兴等。', requirements:'2027 届应届生，机械、电子、设计、营销等相关专业。', source_url:'https://www.supor.com', apply_url:'https://www.supor.com', aliases:['苏泊尔','Supor'] },
  { company:'方太集团', title:'方太集团 2027 届校园招聘', city:'宁波', industry:'家电', cohort:'2027 届', responsibilities:'开放岗位：研发、设计、产品、营销、供应链、服务、职能等方向，聚焦高端厨电。工作地点：宁波（总部）及全国。', requirements:'2027 届应届生，机械、电子、设计、营销等相关专业。', source_url:'https://www.fotile.com', apply_url:'https://www.fotile.com', aliases:['方太','Fotile'] },
  { company:'老板电器', title:'老板电器 2027 届校园招聘', city:'杭州', industry:'家电', cohort:'2027 届', responsibilities:'开放岗位：研发、设计、产品、营销、电商、供应链、职能等方向，聚焦高端厨电。工作地点：杭州（总部）及全国。', requirements:'2027 届应届生，机械、电子、设计、营销等相关专业。', source_url:'https://www.robam.com', apply_url:'https://www.robam.com', aliases:['老板电器','Robam'] },
  { company:'新宝股份', title:'新宝股份 2027 届校园招聘', city:'佛山', industry:'家电', cohort:'2027 届', responsibilities:'开放岗位：研发、制造、工程、供应链、职能等方向，聚焦小家电 OEM/ODM。工作地点：佛山顺德。', requirements:'2027 届应届生，机械、电子、材料、管理等专业。', source_url:'https://www.donlim.com', apply_url:'https://www.donlim.com', aliases:['新宝股份','Donlim'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
