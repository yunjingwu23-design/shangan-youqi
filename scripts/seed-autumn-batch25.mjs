/**
 * 第二十五批：家居建材 + 厨卫灯具
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'欧派家居', title:'欧派家居 2027 届校园招聘', city:'广州', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：营销、研发、设计、IT、制造、职能等方向，聚焦全屋定制。工作地点：广州（总部）及全国生产基地。', requirements:'2027 届应届生，设计、木材、材料、计算机、营销等专业。', source_url:'https://www.oppein.com', apply_url:'https://www.oppein.com', aliases:['欧派家居','欧派','Oppein'] },
  { company:'顾家家居', title:'顾家家居 2027 届校园招聘', city:'杭州', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：研发技术类（电气/结构/电子工程）、营销类（营销管理/商务拓展）、制造技术类（精益管理/生产制造管培生/供应链物流/质量控制）。工作地点：杭州（总部）及全国。', requirements:'2027 届本科及以上，电气、机电、自动化、化工、计算机等专业，年薪本科不低于 11 万、研究生不低于 12 万。', source_url:'https://app.mokahr.com/campus-recruitment/kuka/172508', apply_url:'https://app.mokahr.com/campus-recruitment/kuka/172508', aliases:['顾家家居','顾家','Kuka Home'] },
  { company:'索菲亚', title:'索菲亚集团 2027 届校园招聘', city:'广州', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：营销类（营销储备）、研发类（产品研发/工艺开发）、设计类（家居设计海外方向/设计培训师）、IT类（AI应用开发/CAD&CAM/产品/前端后端测试）、电商类（平台/内容/兴趣/渠道运营）、制造类（质量/精益制造/工艺/设备/生产/仓储）、职能类（客服/财务/采购/物流/人力）。工作地点：广州总部、增城/嘉善/廊坊/成都/兰考/黄冈/齐齐哈尔工厂。', requirements:'26/27 届本科及硕士，木材、材料、家具设计、产品设计、人工智能、计算机、工业工程等专业。', source_url:'https://campus.sfygroup.com', apply_url:'https://campus.sfygroup.com', aliases:['索菲亚','SfyGroup'] },
  { company:'尚品宅配', title:'尚品宅配 2027 届校园招聘', city:'广州', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：设计、营销、IT、制造、供应链、职能等方向，聚焦全屋定制。工作地点：广州（总部）及全国。', requirements:'2027 届应届生，设计、计算机、营销等专业。', source_url:'https://www.spzp.com', apply_url:'https://www.spzp.com', aliases:['尚品宅配','Shangpin'] },
  { company:'志邦家居', title:'志邦家居 2027 届校园招聘', city:'合肥', industry:'家居建材', cohort:'2027 届', responsibilities:'开放岗位：设计、营销、研发、制造、供应链、职能等方向，聚焦定制家居。工作地点：合肥（总部）及全国。', requirements:'2027 届应届生，设计、木材、材料、营销等专业。', source_url:'https://www.zbom.com', apply_url:'https://www.zbom.com', aliases:['志邦家居','志邦','Zbom'] },
  { company:'九牧集团', title:'九牧集团 2027 届校园招聘', city:'泉州', industry:'厨卫', cohort:'2027 届', responsibilities:'开放岗位：研发、设计、营销、制造、供应链、职能等方向，聚焦卫浴。工作地点：泉州（总部）、厦门及全国。', requirements:'2027 届应届生，机械、设计、材料、营销等专业。', source_url:'https://www.jomoo.com.cn', apply_url:'https://www.jomoo.com.cn', aliases:['九牧','Jomoo'] },
  { company:'箭牌家居', title:'箭牌家居集团 2027 届校园招聘', city:'佛山', industry:'厨卫', cohort:'2027 届', responsibilities:'开放岗位：研发、制造、营销三大类（含智能家居、产品创新、市场拓展），旗下 ARROW 箭牌、法恩莎、安华品牌。工作地点：广东佛山（总部，部分营销岗全国调配）。', requirements:'2027 届应届生，机械、电子、设计、营销等专业。', source_url:'https://arrowgroup.zhiye.com', apply_url:'https://arrowgroup.zhiye.com', aliases:['箭牌家居','箭牌','Arrow'] },
  { company:'恒洁集团', title:'恒洁集团 2027 届校园招聘', city:'佛山', industry:'厨卫', cohort:'2027 届', responsibilities:'开放岗位：集团管培生-IT（ERP/MES/WMS/OA 运维、数字化项目、数据可视化）、研发、设计、营销、制造等方向。工作地点：佛山（营销中心）、上海（总部）、潮州、深圳等。', requirements:'2027 届本科及以上，计算机、软件工程、信息管理、大数据、自动化等专业。', source_url:'https://www.hegii.com', apply_url:'https://www.hegii.com', aliases:['恒洁','恒洁集团','Hegii'] },
  { company:'欧普照明', title:'欧普照明 2027 届校园招聘', city:'上海', industry:'灯具照明', cohort:'2027 届', responsibilities:'开放岗位：研发、设计、营销、制造、供应链、职能等方向。工作地点：上海（总部）、苏州等。', requirements:'2027 届应届生，电子、设计、营销等专业。', source_url:'https://www.opple.com', apply_url:'https://www.opple.com', aliases:['欧普照明','欧普','Opple'] },
  { company:'三棵树', title:'三棵树 2027 届校园招聘', city:'莆田', industry:'建材', cohort:'2027 届', responsibilities:'开放岗位：经营管理类、供应链类、技术研发类、营销业务类、信息管理类、财务管理类、行政管理类等，设「菁英计划」「森计划」「技术应用」三大项目。工作地点：全国多地。', requirements:'2027 届应届生，材料、化工、营销、管理、财务、计算机等专业。', source_url:'https://www.3treesgroup.com', apply_url:'https://www.3treesgroup.com', aliases:['三棵树','3Trees'] },
  { company:'东方雨虹', title:'东方雨虹 2027 届校园招聘', city:'北京', industry:'建材', cohort:'2027 届', responsibilities:'开放岗位：服务运营经理（校招储备岗，纳入「虹途生」序列，服务商运营管理/合作开发/服务质量把控）、研发、营销、职能等方向。工作地点：北京、上海培养，后分配全国华东/华南/华北/西南区域。', requirements:'2027 届本科及以上，专业不限，土木工程、工程管理、市场营销、工商管理等优先。', source_url:'https://www.yuhong.com.cn', apply_url:'https://www.yuhong.com.cn', aliases:['东方雨虹','Yuhong'] },
  { company:'公牛集团', title:'公牛集团 2027 届校园招聘', city:'宁波', industry:'建材', cohort:'2027 届', responsibilities:'开放岗位：研发、制造、营销、供应链、职能等方向，聚焦民用电工。工作地点：宁波（总部）及全国。', requirements:'2027 届应届生，电子、机械、材料、营销等专业。', source_url:'https://www.gongniu.cn', apply_url:'https://www.gongniu.cn', aliases:['公牛','公牛集团','Gongniu'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
