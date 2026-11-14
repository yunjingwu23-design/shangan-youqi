/**
 * 第二十九批：光伏新能源 + 医疗器械细分 + 基金
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'隆基绿能', title:'隆基绿能 2027 届校园招聘', city:'西安', industry:'新能源', cohort:'2027 届', responsibilities:'开放岗位：研发技术类（电力电子研发、储能系统研发、电气工程、嵌入式、电池材料研发、组件原型研发、模拟仿真、检测技术开发）、制造技术类（设备技术、工艺技术、质量工程、精益管理、EHS运营）、信息技术类（AI算法、系统开发、数据管理、IT开发）、营销市场类（产品解决方案、销售、储能解决方案、交付管理）、职能支持类（运营分析、审计、人力、法务、供应链、财务）。工作地点：西安（总部）、咸阳、银川、上海、江苏等全国基地。', requirements:'2027 届应届生，电气、材料、机械、电子信息、能源动力、计算机、经管等专业。', source_url:'https://career.longi.com', apply_url:'https://career.longi.com', aliases:['隆基绿能','隆基','LONGi'] },
  { company:'通威集团', title:'通威集团 2027 届校园招聘', city:'成都', industry:'新能源', cohort:'2027 届', responsibilities:'开放岗位：信息类、质量管理、工艺整合、生产设备工艺、光伏研发、高纯晶硅、水产饲料等方向。工作地点：成都（总部）、合肥、盐城、金堂、南通、乐山、包头、保山等基地。', requirements:'2027 届应届生，电气、机械、自动化、半导体、化学、材料、计算机、人工智能等专业。', source_url:'https://www.tongwei.com.cn', apply_url:'https://www.tongwei.com.cn', aliases:['通威集团','通威','Tongwei'] },
  { company:'天合光能', title:'天合光能 2027 届校园招聘', city:'常州', industry:'新能源', cohort:'2027 届', responsibilities:'开放岗位：产品管理管培生（光伏方向）、IT智能制造（工业仿真/AI预测/智能优化/大模型应用）、研发、工艺、储能、解决方案等方向。工作地点：常州（总部）及全国、海外。', requirements:'2027 届硕士为主，材料、物理、化学、电子、光电、新能源、计算机、AI、运筹等专业。', source_url:'https://www.trinasolar.com', apply_url:'https://www.trinasolar.com', aliases:['天合光能','Trina Solar'] },
  { company:'晶科能源', title:'晶科能源 2027 届校园招聘', city:'上饶', industry:'新能源', cohort:'2027 届', responsibilities:'开放岗位：研发、工艺、设备、质量、供应链、职能等方向，聚焦光伏组件与储能。工作地点：上饶（总部）、上海、海宁、玉环、太原等。', requirements:'2027 届应届生，材料、物理、电子、机械等专业。', source_url:'https://www.jinkosolar.com', apply_url:'https://www.jinkosolar.com', aliases:['晶科能源','JinkoSolar'] },
  { company:'阳光电源', title:'阳光电源 2027 届校园招聘', city:'合肥', industry:'新能源', cohort:'2027 届', responsibilities:'开放岗位：电力电子研发、储能、光伏逆变器、软件、硬件、算法、解决方案、营销、职能等方向。工作地点：合肥（总部）及全国、海外。', requirements:'2027 届应届生，电力电子、电气、软件、自动化等专业。', source_url:'https://www.sungrowpower.com', apply_url:'https://www.sungrowpower.com', aliases:['阳光电源','Sungrow'] },
  { company:'正泰电器', title:'正泰集团 2027 届校园招聘', city:'温州', industry:'新能源/电气', cohort:'2027 届', responsibilities:'开放岗位：电气研发、光伏、储能、智能电气、制造、营销、职能等方向。工作地点：温州（总部）、上海、杭州及全国。', requirements:'2027 届应届生，电气、自动化、机械、营销等专业。', source_url:'https://www.chint.com', apply_url:'https://www.chint.com', aliases:['正泰集团','正泰','Chint'] },
  { company:'特变电工', title:'特变电工 2027 届校园招聘', city:'昌吉', industry:'新能源/电气', cohort:'2027 届', responsibilities:'开放岗位：变压器研发、电力电子、新能源、工程、制造、营销、职能等方向。工作地点：昌吉（总部）、新疆、沈阳、衡阳、天津等。', requirements:'2027 届应届生，电气、机械、材料、自动化等专业。', source_url:'https://www.tbea.com', apply_url:'https://www.tbea.com', aliases:['特变电工','TBEA'] },
  { company:'微创医疗', title:'微创医疗 2027 届校园招聘', city:'上海', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、注册、质量（QA/SQE）、微生物/无菌保障、国内销售、临床等方向，旗下含微创骨科（关节/脊柱/创伤）、微创心律、微创医疗机器人等业务。工作地点：上海（总部）、苏州、全国。', requirements:'2027 届本科及硕士，生物、药学、机械、材料、生物医学工程、临床等专业。', source_url:'https://www.microport.com', apply_url:'https://www.microport.com', aliases:['微创医疗','微创','MicroPort'] },
  { company:'乐普医疗', title:'乐普医疗 2027 届校园招聘', city:'北京', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、注册、质量、销售、临床、职能等方向，聚焦心血管器械。工作地点：北京（总部）及全国。', requirements:'2027 届应届生，生物医学工程、医学、药学、材料等专业。', source_url:'https://www.lepumedical.com', apply_url:'https://www.lepumedical.com', aliases:['乐普医疗','乐普','Lepu'] },
  { company:'鱼跃医疗', title:'鱼跃医疗 2027 届校园招聘', city:'丹阳', industry:'医药', cohort:'2027 届', responsibilities:'开放岗位：研发、生产、质量、销售、电商、职能等方向，聚焦家用医疗器械。工作地点：丹阳（总部）、南京、上海等。', requirements:'2027 届应届生，生物医学工程、电子、机械、营销等专业。', source_url:'https://www.yuyue.com.cn', apply_url:'https://www.yuyue.com.cn', aliases:['鱼跃医疗','鱼跃','Yuwell'] },
  { company:'华安基金', title:'华安基金 2027 届秋季校园招聘', city:'上海', industry:'基金/资管', cohort:'2027 届', responsibilities:'开放岗位：投研、市场、运营、风控、信息技术、职能等方向。工作地点：上海、北京、深圳。', requirements:'2027 届应届生，金融、经济、数学、计算机等专业，硕士优先。', source_url:'https://www.huaan.com.cn', apply_url:'https://www.huaan.com.cn', aliases:['华安基金','Huaan Fund'] },
  { company:'万家基金', title:'万家基金 2027 届秋季校园招聘', city:'上海', industry:'基金/资管', cohort:'2027 届', responsibilities:'开放岗位：投研、市场、运营、风控、信息技术、职能等方向。工作地点：上海。', requirements:'2027 届应届生，金融、经济、数学、计算机等专业，硕士优先。', source_url:'https://www.wjasset.com', apply_url:'https://www.wjasset.com', aliases:['万家基金','Wanjia Fund'] },
  { company:'基恩士', title:'基恩士（中国）2027 届秋季校园招聘', city:'上海', industry:'工业自动化/传感器', cohort:'2027 届', responsibilities:'开放岗位：技术销售工程师、技术支持、应用工程师等方向，聚焦传感器与工业自动化。工作地点：全国 23 个办公室所在城市。', requirements:'2027 届应届生，机械、自动化、电子、电气等理工科专业。', source_url:'https://www.keyence.com.cn', apply_url:'https://www.keyence.com.cn', aliases:['基恩士','Keyence'] },
  { company:'新东方', title:'新东方 2027 届秋季校园招聘', city:'北京', industry:'教育', cohort:'2027 届', responsibilities:'开放岗位：教师（各学科）、学习管理师、课程顾问、运营、职能等方向。工作地点：北京（总部）、广州及华南区、全国各分校。', requirements:'2027 届应届生，专业不限，师范、语言、理科等优先。', source_url:'https://campus.xdf.cn', apply_url:'https://campus.xdf.cn', aliases:['新东方','New Oriental'] },
];
let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
