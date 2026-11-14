/**
 * 第三十三批：出版传媒 + 珠宝黄金 + 外企快消补强
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'南方出版传媒', title:'南方出版传媒 2027 届校园招聘', city:'广州', industry:'出版/传媒', cohort:'2027 届', responsibilities:'开放岗位：内容生产类（专业编辑/采编/校对/融媒体内容制作）、市场运营类（发行销售/市场营销/电商/新媒体运营/项目运营）、技术研发类（开发工程师/设计工程师/UI设计师/印刷质量）、财务投资类（财务/审计/投资）、综合管理类（行政/人力/法务/经营管理/物业）、生产操作类（印刷车间技术）。工作地点：广州（总部）及全国。', requirements:'2027 届应届生（含 26 届未就业），中文、新闻传播、历史、经济、工商管理、教育、财务、AI、计算机、数学等专业。', source_url:'https://nfcb2027.zhaopin.com', apply_url:'https://nfcb2027.zhaopin.com', aliases:['南方出版传媒','南方传媒','NFCB'] },
  { company:'周大福', title:'周大福 2027 届 GMT 管理培训生', city:'深圳', industry:'珠宝/黄金', cohort:'2027 届', responsibilities:'开放岗位：GMT 管培生（高管助理角色，2 年跨部门跨城市轮岗，目标培养企业未来领袖）。工作地点：Base 深圳，全国轮岗。', requirements:'2027 届本硕，专业不限，英语流利优先。本科年薪 18-20 万、硕士 20-24 万。', source_url:'https://hr.ctf.com.cn/campus/jobs', apply_url:'https://hr.ctf.com.cn/campus/jobs', aliases:['周大福','周大福珠宝','Chow Tai Fook'] },
  { company:'豫园珠宝', title:'豫园珠宝时尚集团 2027 届校园招聘', city:'上海', industry:'珠宝/黄金', cohort:'2027 届', responsibilities:'开放岗位：渠道销售、电商运营、海外拓展、门店销售、品牌市场、CRM、供应链、珠宝设计、商品、产品研发、AI 应用、投融资等方向。工作地点：上海、北京、成都、济南及全国。', requirements:'2027 届本科及以上，专业不限，IT/技术、市场、运营、AI 等方向对口优先。', source_url:'https://www.yuyuan.com.cn', apply_url:'https://www.yuyuan.com.cn', aliases:['豫园珠宝','豫园珠宝时尚集团','Yuyuan'] },
  { company:'老凤祥', title:'老凤祥 2027 届校园招聘', city:'上海', industry:'珠宝/黄金', cohort:'2027 届', responsibilities:'开放岗位：珠宝设计、营销、门店运营、供应链、职能等方向。工作地点：上海（总部）及全国门店。', requirements:'2027 届应届生，专业不限，设计、营销、经管优先。', source_url:'https://www.laofengxiang.com', apply_url:'https://www.laofengxiang.com', aliases:['老凤祥','Lao Feng Xiang'] },
  { company:'周大生', title:'周大生 2027 届校园招聘', city:'深圳', industry:'珠宝/黄金', cohort:'2027 届', responsibilities:'开放岗位：珠宝设计、营销、门店运营、供应链、职能等方向。工作地点：深圳（总部）及全国门店。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.chowtaiseng.com', apply_url:'https://www.chowtaiseng.com', aliases:['周大生','Chow Tai Seng'] },
  { company:'李锦记', title:'李锦记 2027 届校园招聘', city:'香港', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：食品研发、AI 技术创新、品牌营销、品类管理、职能等方向。工作地点：香港、上海、广州、江门、伦敦等。', requirements:'2027 届应届生，食品、营销、计算机等专业。', source_url:'https://www.lkk.com', apply_url:'https://www.lkk.com', aliases:['李锦记','Lee Kum Kee'] },
  { company:'卡夫亨氏', title:'卡夫亨氏 2027 届校园招聘', city:'上海', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：综合管培生、国际生产制造管培生、销售培训生等方向。工作地点：上海、广东、青岛。', requirements:'2027 届应届生，专业不限，英语流利。', source_url:'https://www.kraftheinz.com', apply_url:'https://www.kraftheinz.com', aliases:['卡夫亨氏','Kraft Heinz'] },
  { company:'亚玛芬', title:'亚玛芬（Amer Sports）2027 届校园招聘', city:'上海', industry:'消费/体育', cohort:'2027 届', responsibilities:'开放岗位：商品企划管培生、服装设计管培生、人力资源管培生、运营管培生等方向，旗下含始祖鸟、萨洛蒙等品牌。工作地点：上海。', requirements:'2027 届应届生，专业不限，英语流利。', source_url:'https://www.amersports.com', apply_url:'https://www.amersports.com', aliases:['亚玛芬','Amer Sports','始祖鸟'] },
  { company:'宝格丽', title:'宝格丽（Bulgari）2027 届零售培训生', city:'上海', industry:'奢侈品/消费', cohort:'2027 届', responsibilities:'开放岗位：零售培训生项目。工作地点：上海。', requirements:'2027 届应届生，专业不限，英语流利，热爱奢侈品行业。', source_url:'https://www.bulgari.com', apply_url:'https://www.bulgari.com', aliases:['宝格丽','Bulgari'] },
  { company:'华润电力', title:'华润电力 2027 届校园招聘', city:'深圳', industry:'能源电力', cohort:'2027 届', responsibilities:'开放岗位：生产运行、数据信息、商业分析、职能管理、市场开发、专业技术等方向。工作地点：全国 32 个省、自治区、直辖市。', requirements:'2027 届应届生，电气、能动、新能源、计算机、经管等专业。', source_url:'https://campus.crpower.com.cn', apply_url:'https://campus.crpower.com.cn', aliases:['华润电力','CR Power'] },
  { company:'西部证券', title:'西部证券 2027 届校园招聘', city:'西安', industry:'证券', cohort:'2027 届', responsibilities:'开放岗位：研究员、机构销售、交易员、财富管理、研究助理等方向。工作地点：西安、上海、北京、深圳、南京、郑州、武汉等。', requirements:'2027 届应届生，金融、经济、数学、计算机等专业，硕士优先。', source_url:'https://www.west95582.com', apply_url:'https://www.west95582.com', aliases:['西部证券','Western Securities'] },
  { company:'上海交易集团', title:'上海交易集团 2027 届校园招聘', city:'上海', industry:'金融', cohort:'2027 届', responsibilities:'开放岗位：管培生、交易、结算、风控、合规、信息技术、职能等方向。工作地点：北京、上海、广州、深圳。', requirements:'2027 届应届生，金融、经济、法律、计算机等专业，硕士优先。', source_url:'https://www.sse.com.cn', apply_url:'https://www.sse.com.cn', aliases:['上海交易集团','上海交易所'] },
];
let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
