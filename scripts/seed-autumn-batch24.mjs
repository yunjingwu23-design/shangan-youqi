/**
 * 第二十四批：外企快消 + 中药医药
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'雀巢中国', title:'雀巢中国 2027 届校园招聘', city:'北京', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：管培生多方向（市场营销、销售、研发、供应链、财务、人力资源、集团事务、跨境电商、技术、医学事务、商业管理），涉及咖啡、奶品、普瑞纳宠物、营养品、太太乐、徐福记等业务单元。工作地点：北京、上海、广州、东莞、成都、天津、武汉、西安、苏州、青岛、哈尔滨、沈阳、郑州。', requirements:'26/27 届本科及以上，专业不限，英语流利。', source_url:'https://www.nestle.com.cn', apply_url:'https://www.nestle.com.cn', aliases:['雀巢','Nestle'] },
  { company:'玛氏', title:'玛氏（Mars）2027 届校园招聘', city:'北京', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：管理培训生（市场、销售、供应链、研发、财务、人力资源等方向）。工作地点：北京、上海、广州、嘉兴等。', requirements:'2027 届本科及以上，专业不限，英语流利。', source_url:'https://careers.mars.com', apply_url:'https://careers.mars.com', aliases:['玛氏','Mars'] },
  { company:'欧莱雅', title:'欧莱雅（L\'Oréal）2027 届校园招聘', city:'上海', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：管理培训生（市场、电商、销售、供应链、研发、财务等方向）。工作地点：上海（总部）、广州等。', requirements:'2027 届本科及以上，专业不限，英语流利。', source_url:'https://careers.loreal.com', apply_url:'https://careers.loreal.com', aliases:['欧莱雅','L\'Oreal'] },
  { company:'百事可乐', title:'百事可乐 2027 届校园招聘', city:'上海', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：管理培训生（市场、销售、供应链、研发、财务等方向）。工作地点：上海、广州、武汉等。', requirements:'2027 届本科及以上，专业不限。', source_url:'https://www.pepsico.com.cn', apply_url:'https://www.pepsico.com.cn', aliases:['百事','百事可乐','PepsiCo'] },
  { company:'可口可乐', title:'可口可乐 2027 届校园招聘', city:'上海', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：管理培训生（市场、销售、供应链、研发、财务等方向），中粮可口可乐另设「潜翔计划」「启明星」项目。工作地点：上海、西安及全国装瓶厂。', requirements:'2027 届本科及以上，专业不限。', source_url:'https://www.coca-cola.com.cn', apply_url:'https://www.coca-cola.com.cn', aliases:['可口可乐','Coca-Cola'] },
  { company:'达能', title:'达能（Danone）2027 届校园招聘', city:'上海', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：管理培训生（市场、销售、供应链、研发、财务等方向）。工作地点：上海、广州等。', requirements:'2027 届本科及以上，专业不限。', source_url:'https://careers.danone.com', apply_url:'https://careers.danone.com', aliases:['达能','Danone'] },
  { company:'亿滋国际', title:'亿滋国际（Mondelēz）2027 届校园招聘', city:'上海', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：管理培训生（市场、销售、供应链、研发、财务等方向），旗下奥利奥、炫迈等品牌。工作地点：上海、广州、苏州等。', requirements:'2027 届本科及以上，专业不限。', source_url:'https://www.mondelezinternational.com', apply_url:'https://www.mondelezinternational.com', aliases:['亿滋','亿滋国际','Mondelez'] },
  { company:'东阿阿胶', title:'东阿阿胶 2027 届校园招聘', city:'济南', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：办公室管培生（党办/巡视巡察）、财务管培生、公共事务管培生、运营管理管培生、法律合规管培生、供应链管培生、智数管培生（AI/数据）、研发管培生、营销管培生、电商运营管培生、市场与品牌管培生、生产类管培生、原料类管培生。工作地点：济南、东阿、北京、杭州、深圳、内蒙古阿拉善、辽宁西丰、吉林东丰等。', requirements:'2027 届硕士为主（营销/生产岗本科可报），中药学、药学、财务、法学、人工智能、市场营销等专业。', source_url:'https://www.dongeejiao.com', apply_url:'https://www.dongeejiao.com', aliases:['东阿阿胶','DEEJ'] },
  { company:'华润三九', title:'华润三九 2027 届校园招聘', city:'深圳', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、营销、市场、供应链、职能等方向。工作地点：深圳（总部）及全国。', requirements:'2027 届应届生，药学、中药学、营销、管理等专业。', source_url:'https://www.999.com.cn', apply_url:'https://www.999.com.cn', aliases:['华润三九','999'] },
  { company:'白云山医药', title:'白云山医药 2027 届校园招聘', city:'广州', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、营销、职能等方向。工作地点：广州（总部）及全国。', requirements:'2027 届应届生，药学、中药学、化学等专业。', source_url:'https://www.gpc.com.cn', apply_url:'https://www.gpc.com.cn', aliases:['白云山','广药集团','Baiyunshan'] },
  { company:'片仔癀', title:'片仔癀 2027 届校园招聘', city:'漳州', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、营销、市场、职能等方向。工作地点：漳州（总部）及全国。', requirements:'2027 届应届生，药学、中药学、化学、营销等专业。', source_url:'https://www.pzhe.com', apply_url:'https://www.pzhe.com', aliases:['片仔癀','Pien Tze Huang'] },
  { company:'以岭药业', title:'以岭药业 2027 届校园招聘', city:'石家庄', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、营销、市场、职能等方向。工作地点：石家庄（总部）及全国。', requirements:'2027 届应届生，药学、中药学、医学、营销等专业。', source_url:'https://www.yiling.cn', apply_url:'https://www.yiling.cn', aliases:['以岭药业','Yiling'] },
  { company:'智飞生物', title:'智飞生物 2027 届校园招聘', city:'重庆', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、营销、市场、职能等方向，聚焦疫苗。工作地点：重庆（总部）及全国。', requirements:'2027 届应届生，生物、药学、医学、营销等专业。', source_url:'https://www.zhifeishengwu.com', apply_url:'https://www.zhifeishengwu.com', aliases:['智飞生物','Zhifei'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
