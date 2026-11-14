/**
 * 第二十二批：食品饮料 + 服装美妆消费
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'伊利集团', title:'伊利集团 2027 届校园招聘', city:'呼和浩特', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：生产培训生（液奶/冷饮/酸奶，生产操作、设备控制、管理赋能）、销售培训生（经销商管理、渠道拓展）、综合运营培训生、营销代表、设备专训生。工作地点：呼和浩特（总部）、合肥、成都、广州、苏皖等全国多地工厂及销售大区。', requirements:'2027 届本硕，食品、质量、机械、生物、化学、电气自动化、市场营销等专业优先，英语四级以上。', source_url:'https://campus.yili.com', apply_url:'https://campus.yili.com', aliases:['伊利','Yili'] },
  { company:'蒙牛乳业', title:'蒙牛乳业 2027 届校园招聘', city:'呼和浩特', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：市场、销售、供应链、研发、生产、职能等方向管培生。工作地点：北京、呼和浩特及全国。', requirements:'2027 届应届生，食品、营销、管理等相关专业。', source_url:'https://www.mengniu.com.cn', apply_url:'https://www.mengniu.com.cn', aliases:['蒙牛','Mengniu'] },
  { company:'农夫山泉', title:'农夫山泉 2027 届校园招聘', city:'杭州', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：市场、销售、研发、生产、供应链、职能等方向。工作地点：杭州（总部）及全国。', requirements:'2027 届应届生，专业不限，食品、营销、管理优先。', source_url:'https://www.nongfuspring.com', apply_url:'https://www.nongfuspring.com', aliases:['农夫山泉','Nongfu Spring'] },
  { company:'海天味业', title:'海天味业 2027 届校园招聘', city:'佛山', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、营销、电商、供应链、职能等方向。工作地点：佛山（总部）及全国。', requirements:'2027 届应届生，食品、生物、化工、营销等专业。', source_url:'https://www.haitian-food.com', apply_url:'https://www.haitian-food.com', aliases:['海天味业','Haitian'] },
  { company:'金龙鱼', title:'金龙鱼（益海嘉里）2027 届校园招聘', city:'上海', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：市场、销售、供应链、生产、研发、职能等方向。工作地点：上海、深圳、广州及全国工厂。', requirements:'2027 届应届生，食品、营销、管理、机械等专业。', source_url:'https://www.yihaikerry.net.cn', apply_url:'https://www.yihaikerry.net.cn', aliases:['金龙鱼','益海嘉里','Wilmar'] },
  { company:'双汇发展', title:'双汇发展 2027 届校园招聘', city:'漯河', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、营销、供应链、职能等方向。工作地点：漯河（总部）及全国。', requirements:'2027 届应届生，食品、生物、机械、营销等专业。', source_url:'https://www.shuanghui.net', apply_url:'https://www.shuanghui.net', aliases:['双汇','Shuanghui'] },
  { company:'元气森林', title:'元气森林 2027 届校园招聘', city:'北京', industry:'快消', cohort:'2027 届', responsibilities:'开放岗位：产品、品牌、电商运营、研发、供应链、职能等方向。工作地点：北京、上海等。', requirements:'2027 届应届生，专业不限，食品、营销、设计优先。', source_url:'https://www.genki-forest.com', apply_url:'https://www.genki-forest.com', aliases:['元气森林','Genki Forest'] },
  { company:'波司登', title:'波司登 2027 届校园招聘', city:'常熟', industry:'消费', cohort:'2027 届', responsibilities:'开放岗位：超级计划类、零售类、抖音类、电商类、外贸类、产品类、市场用户类、供应链类、物流管理类、职能类。工作地点：常熟总部、上海、杭州及全国 20+ 零售公司。', requirements:'2027 届毕业生（2026.9—2027.7），专业不限。', source_url:'https://campus.51job.com/BSD2027/', apply_url:'https://campus.51job.com/BSD2027/', aliases:['波司登','Bosideng'] },
  { company:'海澜之家', title:'海澜之家 2027 届校园招聘', city:'无锡', industry:'消费', cohort:'2027 届', responsibilities:'开放岗位：综合职能类（人事/行政/法务）、零售、电商、供应链、设计等方向。工作地点：无锡江阴（总部）及全国。', requirements:'2027 届本科及以上，行政管理、人力资源、法学、营销等专业。', source_url:'https://www.heilan.com.cn', apply_url:'https://www.heilan.com.cn', aliases:['海澜之家','海澜集团','Heilan'] },
  { company:'森马服饰', title:'森马服饰 2027 届校园招聘', city:'上海', industry:'消费', cohort:'2027 届', responsibilities:'开放岗位：设计、产品、电商、零售、品牌、供应链、职能等方向。工作地点：上海、温州及全国。', requirements:'2027 届应届生，设计、营销、管理等相关专业。', source_url:'https://www.semir.com', apply_url:'https://www.semir.com', aliases:['森马','Semir'] },
  { company:'太平鸟', title:'太平鸟 2027 届校园招聘', city:'宁波', industry:'消费', cohort:'2027 届', responsibilities:'开放岗位：设计、产品、电商、零售、品牌、供应链、职能等方向。工作地点：宁波（总部）、上海及全国。', requirements:'2027 届应届生，设计、营销、管理等相关专业。', source_url:'https://www.peacebird.com.cn', apply_url:'https://www.peacebird.com.cn', aliases:['太平鸟','Peacebird'] },
  { company:'珀莱雅', title:'珀莱雅 2027 届校园招聘', city:'杭州', industry:'消费', cohort:'2027 届', responsibilities:'开放岗位：产品、品牌、电商运营、研发、供应链、职能等方向。工作地点：杭州（总部）、上海等。', requirements:'2027 届应届生，化工、生物、营销、设计等相关专业。', source_url:'https://www.proya.com', apply_url:'https://www.proya.com', aliases:['珀莱雅','Proya'] },
  { company:'华熙生物', title:'华熙生物 2027 届校园招聘', city:'北京', industry:'消费', cohort:'2027 届', responsibilities:'开放岗位：研发、产品、品牌、电商、供应链、职能等方向，聚焦透明质酸与功效护肤。工作地点：北京、济南、上海等。', requirements:'2027 届应届生，生物、化学、药学、营销等相关专业。', source_url:'https://www.bloomagebiotech.com', apply_url:'https://www.bloomagebiotech.com', aliases:['华熙生物','Bloomage'] },
  { company:'海贝丽致', title:'海贝丽致（HEBE BEAUTY）2027 届校园招聘', city:'广州', industry:'消费', cohort:'2027 届', responsibilities:'开放岗位：海外电商管培生（Lazada/TikTok/Shopee）、全球品牌管培生、视觉创意设计管培生、数智化管理培生（SQL/Python）、全球销售管培生。工作地点：广州、上海、香港及印尼、菲律宾、泰国、马来西亚、越南等。', requirements:'25-27 届海内外毕业生，营销、设计、数据、语言等专业，可接受海外派驻。', source_url:'https://www.wondercv.com/xiaozhao/hebe-beauty-2027-campus-recruitment-20280-16ff04', apply_url:'https://www.wondercv.com/xiaozhao/hebe-beauty-2027-campus-recruitment-20280-16ff04', aliases:['海贝丽致','HEBE BEAUTY'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
