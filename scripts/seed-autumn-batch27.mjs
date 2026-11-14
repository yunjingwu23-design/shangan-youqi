/**
 * 第二十七批：农业央企 + 云计算/安全 + 大疆补强
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'中国农发集团', title:'中国农业发展集团 2027 届校园招聘', city:'北京', industry:'农业/食品', cohort:'2027 届', responsibilities:'开放岗位：农业科技类（育种研发/生物技术/动植物营养/水产养殖/智慧农业）、产业经营类（市场营销/供应链/国际贸易/品牌运营）、职能支持类（财务/人力/法务/党建）、工程技术类（海洋工程/船舶管理/食品工程/机械自动化/环保）。工作地点：北京、上海、天津、山东、江苏、浙江、广东、海南、黑龙江等全国农业产区及海外基地。', requirements:'2027 届本科及以上，农学、生物、食品、机械、经管、财会等专业。', source_url:'https://campus.chinaagri.com.cn', apply_url:'https://campus.chinaagri.com.cn', aliases:['中国农发集团','中国农业发展集团','China Agri'] },
  { company:'中粮集团', title:'中粮集团 2027 届校园招聘', city:'北京', industry:'农业/食品', cohort:'2027 届', responsibilities:'开放岗位：信息技术与数智化、科创研发、物流供应链、品牌营销、投资研究、大宗贸易、农业技术、食品工艺、生产制造、战略规划、运营管理、财会审计、人事行政、质量安全、法律风控、党群纪检等 16 大类。工作地点：北京、上海、广州、深圳、武汉、天津、成都等全国。', requirements:'2027 届海内外毕业生，食品、发酵、生物、经管、计算机、贸易等专业。', source_url:'https://campus.51job.com/cofco', apply_url:'https://campus.51job.com/cofco', aliases:['中粮集团','中粮','COFCO'] },
  { company:'北大荒集团', title:'北大荒农垦集团 2027 届校园招聘', city:'哈尔滨', industry:'农业/食品', cohort:'2027 届', responsibilities:'开放岗位：粮食加工、仓储、农技、食品、农机、管理等方向。工作地点：黑龙江及全国垦区。', requirements:'2027 届应届生，粮食工程、食品、农学、机械等专业。', source_url:'https://www.chinabdh.com', apply_url:'https://www.chinabdh.com', aliases:['北大荒集团','北大荒','Beidahuang'] },
  { company:'首农食品集团', title:'首农食品集团 2027 届校园招聘', city:'北京', industry:'农业/食品', cohort:'2027 届', responsibilities:'开放岗位：乳品、畜禽加工、质检、食品研发、供应链、职能等方向。工作地点：北京。', requirements:'2027 届应届生，食品、动物科学、质检、管理等专业。', source_url:'https://www.snfood.com.cn', apply_url:'https://www.snfood.com.cn', aliases:['首农食品集团','首农','Shounong'] },
  { company:'网宿科技', title:'网宿科技 2027 届校园招聘', city:'厦门', industry:'云计算/安全', cohort:'2027 届', responsibilities:'开放岗位：网络安全算法工程师（异常流量识别/攻击分析/机器学习检测）、后端开发（C/C++/Go）、CDN/边缘计算、产品等方向。工作地点：厦门、上海、北京等。', requirements:'2027 届本科及以上，计算机、网络安全、AI、数据科学等专业，掌握 Python/C/C++/Go。', source_url:'https://www.wangsu.com', apply_url:'https://www.wangsu.com', aliases:['网宿科技','网宿','Wangsu'] },
  { company:'安恒信息', title:'安恒信息 2027 届校园招聘', city:'杭州', industry:'云计算/安全', cohort:'2027 届', responsibilities:'开放岗位：网络安全、研发、算法、产品、销售、职能等方向。工作地点：杭州（总部）、北京、上海等。', requirements:'2027 届应届生，计算机、网络安全等专业。', source_url:'https://www.dbappsecurity.com.cn', apply_url:'https://www.dbappsecurity.com.cn', aliases:['安恒信息','安恒','DBAPPSecurity'] },
  { company:'卫宁健康', title:'卫宁健康 2027 届校园招聘', city:'上海', industry:'企业服务/医疗IT', cohort:'2027 届', responsibilities:'开放岗位：研发、实施、产品、销售、咨询等方向，聚焦医疗信息化。工作地点：上海（总部）及全国。', requirements:'2027 届应届生，计算机、软件、医学信息等专业。', source_url:'https://www.winning.com.cn', apply_url:'https://www.winning.com.cn', aliases:['卫宁健康','卫宁','Winning'] },
  { company:'韶音科技', title:'韶音科技（Shokz）2027 届校园招聘', city:'深圳', industry:'智能硬件', cohort:'2027 届', responsibilities:'开放岗位：研发、算法、硬件、结构、营销、海外业务等方向，聚焦骨传导耳机。工作地点：深圳（总部）及海外。', requirements:'2027 届应届生，电子、声学、机械、营销等专业。', source_url:'https://www.shokz.com.cn', apply_url:'https://www.shokz.com.cn', aliases:['韶音科技','韶音','Shokz'] },
  { company:'百疆集团', title:'百疆集团 2027 届校园招聘', city:'南京', industry:'消费电子/分销', cohort:'2027 届', responsibilities:'开放岗位：业务管培生（GTM/零售管理/渠道销售/电商运营/供应链管理轮岗，次年在国内或海外定岗），大疆核心一级代理商。工作地点：南京（总部）及美国、加拿大、墨西哥、菲律宾、巴西等 15+ 国家。', requirements:'2027 届本科及硕士，专业不限，可接受海外派驻。', source_url:'https://www.bjvis.com', apply_url:'https://www.bjvis.com', aliases:['百疆集团','百疆'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
