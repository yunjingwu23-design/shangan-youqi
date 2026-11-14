/**
 * 第二十批：医药 + 消费/互联网独角兽补充
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'药明生物', title:'药明生物 2027 届校园招聘', city:'上海', industry:'医药', cohort:'2027 届', responsibilities:'开放研发、质量、原液生产、制剂生产、工程、AI/计算机等岗位，本硕博招聘需求 1400+，工作地点上海、苏州、无锡、成都、石家庄、杭州。', requirements:'2027 届本硕博，生物、药学、化学、工程、计算机等专业。', source_url:'https://www.wuxibiologics.com', apply_url:'https://www.wuxibiologics.com', aliases:['药明生物','WuXi Biologics'] },
  { company:'云南白药', title:'云南白药集团 2027 届全球校园招聘', city:'昆明', industry:'医药', cohort:'2027 届', responsibilities:'开放研发管理、智能制造、现代种植、营销管理、数字化、职能管理六大方向 60+ 岗位，工作地点昆明及全国。', requirements:'2027 届海内外应届生，专业不限。', source_url:'https://ynby.hotjob.cn', apply_url:'https://ynby.hotjob.cn', aliases:['云南白药'] },
  { company:'百济神州', title:'百济神州 2027 届校园招聘', city:'北京', industry:'医药', cohort:'2027 届', responsibilities:'开放研发、临床、生产、商业化、职能等岗位，聚焦创新药，工作地点北京、上海等。', requirements:'2027 届应届生，药学、生物、临床医学等专业。', source_url:'https://www.beigene.com.cn', apply_url:'https://www.beigene.com.cn', aliases:['百济神州','BeiGene'] },
  { company:'石药集团', title:'石药集团 2027 届校园招聘', city:'石家庄', industry:'医药', cohort:'2027 届', responsibilities:'开放研发、生产、质量、营销、职能等岗位，工作地点石家庄、北京、上海等。', requirements:'2027 届应届生，药学、化学、生物、医学等专业。', source_url:'https://www.e-cspc.com', apply_url:'https://www.e-cspc.com', aliases:['石药集团','CSPC'] },
  { company:'华大基因', title:'华大基因 2027 届校园招聘', city:'深圳', industry:'医药/生物科技', cohort:'2027 届', responsibilities:'开放研发、生物信息、医学检验、市场、职能等岗位，工作地点深圳、武汉等。', requirements:'2027 届应届生，生物、医学、计算机、生物信息等专业。', source_url:'https://www.genomics.cn', apply_url:'https://www.genomics.cn', aliases:['华大基因','BGI'] },
  { company:'复星医药', title:'复星医药 2027 届校园招聘', city:'上海', industry:'医药', cohort:'2027 届', responsibilities:'开放研发、生产、质量、营销、职能等岗位，工作地点上海及全国。', requirements:'2027 届应届生，药学、生物、化学、医学等专业。', source_url:'https://www.fosunpharma.com', apply_url:'https://www.fosunpharma.com', aliases:['复星医药','Fosun Pharma'] },
  { company:'贝壳找房', title:'贝壳找房 2027 届校园招聘', city:'北京', industry:'互联网', cohort:'2027 届', responsibilities:'开放研发、算法、产品、运营、经纪、职能等岗位，工作地点北京、上海等。', requirements:'2027 届应届生，计算机、产品、运营等专业。', source_url:'https://www.ke.com', apply_url:'https://www.ke.com', aliases:['贝壳找房','Beike'] },
  { company:'货拉拉', title:'货拉拉 2027 届校园招聘', city:'深圳', industry:'互联网/物流', cohort:'2027 届', responsibilities:'开放研发、算法、产品、运营、职能等岗位，工作地点深圳、北京等。', requirements:'2027 届应届生，计算机、产品、运营等专业。', source_url:'https://www.huolala.cn', apply_url:'https://www.huolala.cn', aliases:['货拉拉','Lalamove'] },
  { company:'满帮集团', title:'满帮集团 2027 届校园招聘', city:'南京', industry:'互联网/物流', cohort:'2027 届', responsibilities:'开放研发、算法、产品、运营、职能等岗位，工作地点南京、北京等。', requirements:'2027 届应届生，计算机、产品、运营等专业。', source_url:'https://www.fulltruckalliance.com', apply_url:'https://www.fulltruckalliance.com', aliases:['满帮集团','Full Truck Alliance'] },
  { company:'得物', title:'得物 2027 届校园招聘', city:'上海', industry:'电商', cohort:'2027 届', responsibilities:'开放技术、运营、产品、用户研究、供应链、商品研究、职能、设计、数据分析、风控十大职类，工作地点上海、杭州、北京等 11 城。', requirements:'2027 届毕业生（2026.9—2027.8 毕业），专业不限。', source_url:'https://campus.dewu.com', apply_url:'https://campus.dewu.com', aliases:['得物','Dewu'] },
  { company:'转转', title:'转转 2027 届校园招聘', city:'北京', industry:'电商', cohort:'2027 届', responsibilities:'开放研发、产品、运营、供应链、职能等岗位，工作地点北京。', requirements:'2027 届应届生，计算机、产品、运营等专业。', source_url:'https://www.zhuanzhuan.com', apply_url:'https://www.zhuanzhuan.com', aliases:['转转','Zhuanzhuan'] },
  { company:'亿联网络', title:'亿联网络 2027 届校园招聘', city:'厦门', industry:'通信/智能硬件', cohort:'2027 届', responsibilities:'开放研发、营销、产品等岗位，工作地点厦门、杭州及海外。', requirements:'2027 届毕业生，计算机、电子、通信等专业。', source_url:'https://yealink.zhiye.com/campus', apply_url:'https://yealink.zhiye.com/campus', aliases:['亿联网络','Yealink'] },
  { company:'深信服', title:'深信服 2027 届校园招聘', city:'深圳', industry:'企业服务/安全', cohort:'2027 届', responsibilities:'开放研发、算法、安全、产品、销售、职能等岗位，工作地点深圳、北京等。', requirements:'2027 届应届生，计算机、网络安全等专业。', source_url:'https://www.sangfor.com.cn', apply_url:'https://www.sangfor.com.cn', aliases:['深信服','Sangfor'] },
  { company:'奇安信', title:'奇安信 2027 届校园招聘', city:'北京', industry:'企业服务/安全', cohort:'2027 届', responsibilities:'开放安全、研发、算法、产品、销售、职能等岗位，工作地点北京等。', requirements:'2027 届应届生，计算机、网络安全等专业。', source_url:'https://www.qianxin.com', apply_url:'https://www.qianxin.com', aliases:['奇安信','Qianxin'] },
  { company:'用友网络', title:'用友网络 2027 届校园招聘', city:'北京', industry:'企业服务/SaaS', cohort:'2027 届', responsibilities:'开放研发、产品、实施、销售、职能等岗位，工作地点北京及全国。', requirements:'2027 届应届生，计算机、软件、管理等相关专业。', source_url:'https://www.yonyou.com', apply_url:'https://www.yonyou.com', aliases:['用友网络','Yonyou'] },
  { company:'金蝶', title:'金蝶 2027 届校园招聘', city:'深圳', industry:'企业服务/SaaS', cohort:'2027 届', responsibilities:'开放研发、产品、实施、销售、职能等岗位，工作地点深圳及全国。', requirements:'2027 届应届生，计算机、软件、管理等相关专业。', source_url:'https://www.kingdee.com', apply_url:'https://www.kingdee.com', aliases:['金蝶','Kingdee'] },
  { company:'石头科技', title:'石头科技 2027 届校园招聘', city:'北京', industry:'智能硬件', cohort:'2027 届', responsibilities:'开放硬件、软件、算法、结构、供应链、职能等岗位，工作地点北京、深圳。', requirements:'2027 届应届生，电子、软件、机械等专业。', source_url:'https://www.roborock.com', apply_url:'https://www.roborock.com', aliases:['石头科技','Roborock'] },
  { company:'科沃斯', title:'科沃斯 2027 届校园招聘', city:'苏州', industry:'智能硬件', cohort:'2027 届', responsibilities:'开放硬件、软件、算法、结构、供应链、职能等岗位，工作地点苏州。', requirements:'2027 届应届生，电子、软件、机械等专业。', source_url:'https://www.ecovacs.com', apply_url:'https://www.ecovacs.com', aliases:['科沃斯','Ecovacs'] },
  { company:'追觅科技', title:'追觅科技 2027 届校园招聘', city:'苏州', industry:'智能硬件', cohort:'2027 届', responsibilities:'开放硬件、软件、算法、结构、供应链、职能等岗位，工作地点苏州、上海。', requirements:'2027 届应届生，电子、软件、机械等专业。', source_url:'https://www.dreame.com', apply_url:'https://www.dreame.com', aliases:['追觅科技','Dreame'] },
  { company:'云鲸智能', title:'云鲸智能 2027 届校园招聘', city:'深圳', industry:'智能硬件', cohort:'2027 届', responsibilities:'开放硬件、软件、算法、结构、供应链、职能等岗位，工作地点深圳。', requirements:'2027 届应届生，电子、软件、机械等专业。', source_url:'https://www.narwal.com', apply_url:'https://www.narwal.com', aliases:['云鲸智能','Narwal'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
