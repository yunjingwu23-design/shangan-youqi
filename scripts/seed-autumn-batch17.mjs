/**
 * 第十七批：建筑基建央企 + 军工央企 + 能源央企
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'中国建筑', title:'中国建筑 2027 届校园招聘', city:'北京', industry:'建筑/基建', cohort:'2027 届', responsibilities:'开放工程技术、设计、投融资、财务、法务、人力、党建等岗位，覆盖中建一至八局及专业公司，工作地点全国。', requirements:'2027 届本科、硕士毕业生，土木、建筑、工程管理、财务、法律等专业。', source_url:'https://recruit.cscec.com', apply_url:'https://recruit.cscec.com', aliases:['中国建筑','中建','CSCEC'] },
  { company:'中国中铁', title:'中国中铁 2027 届校园招聘', city:'北京', industry:'建筑/基建', cohort:'2027 届', responsibilities:'开放交运、勘察、土建、电气、信息、建筑、机械等专业技术设计岗位，工作地点全国 9 城。', requirements:'2027 届高校应届毕业生，硕士及以上学历，专业对口。', source_url:'https://www.crecg.com', apply_url:'https://www.crecg.com', aliases:['中国中铁','CREC'] },
  { company:'中国铁建', title:'中国铁建 2027 届校园招聘', city:'北京', industry:'建筑/基建', cohort:'2027 届', responsibilities:'开放工程、设计、技术、财务、管理、职能等岗位，工作地点全国。', requirements:'2027 届应届生，土木、建筑、机械、财务等专业。', source_url:'https://www.crcc.cn', apply_url:'https://www.crcc.cn', aliases:['中国铁建','CRCC'] },
  { company:'中国交建', title:'中国交建 2027 届校园招聘', city:'北京', industry:'建筑/基建', cohort:'2027 届', responsibilities:'开放水运/公路勘察设计、钢结构、检测、物流、数字化、AI、智慧交通等岗位，工作地点武汉等全国多地。', requirements:'2027 届应届生，土木、水利、桥梁、计算机、AI 等专业。', source_url:'https://www.ccccltd.cn', apply_url:'https://www.ccccltd.cn', aliases:['中国交建','CCCC'] },
  { company:'中国电建', title:'中国电建 2027 届校园招聘', city:'北京', industry:'建筑/基建', cohort:'2027 届', responsibilities:'开放水电、新能源、设计、工程、管理、职能等岗位，工作地点全国。', requirements:'2027 届应届生，水利、电气、土木、管理等专业。', source_url:'https://www.powerchina.cn', apply_url:'https://www.powerchina.cn', aliases:['中国电建','PowerChina'] },
  { company:'中国能建', title:'中国能建 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放能源规划、电力工程、设计、建设、运维、职能等岗位，工作地点全国。', requirements:'2027 届应届生，电气、能动、机械、管理等专业。', source_url:'https://www.ceec.net.cn', apply_url:'https://www.ceec.net.cn', aliases:['中国能建','CEEC'] },
  { company:'中国中冶', title:'中国中冶 2027 届校园招聘', city:'北京', industry:'建筑/基建', cohort:'2027 届', responsibilities:'开放冶金工程、建筑设计、施工、管理、职能等岗位，工作地点全国。', requirements:'2027 届应届生，冶金、土木、机械、管理等专业。', source_url:'https://www.mcc.com.cn', apply_url:'https://www.mcc.com.cn', aliases:['中国中冶','MCC'] },
  { company:'中国航天科技', title:'中国航天科技集团 2027 届校园招聘', city:'北京', industry:'军工/航天', cohort:'2027 届', responsibilities:'开放航空宇航、电子信息、计算机、自动化、机械、材料、职能管理等岗位，工作地点北京、武汉、深圳、南京等。', requirements:'2027 届应届生，航空宇航、电子、计算机、机械等专业，研发岗硕士优先。', source_url:'https://www.spacechina.com', apply_url:'https://www.spacechina.com', aliases:['中国航天科技','CASC'] },
  { company:'中国航天科工', title:'中国航天科工 2027 届校园招聘', city:'北京', industry:'军工/航天', cohort:'2027 届', responsibilities:'开放航空航天、电子信息、计算机、自动化、材料等岗位，工作地点全国。', requirements:'2027 届应届生，理工科专业，硕士及以上优先。', source_url:'https://www.casic.com.cn', apply_url:'https://www.casic.com.cn', aliases:['中国航天科工','CASIC'] },
  { company:'中国航空工业', title:'中国航空工业集团 2027 届校园招聘', city:'北京', industry:'军工/航空', cohort:'2027 届', responsibilities:'开放航空工程、电子、计算机、材料、机械、职能等岗位，工作地点全国。', requirements:'2027 届应届生，航空、电子、材料、机械等专业。', source_url:'https://www.avic.com', apply_url:'https://www.avic.com', aliases:['中国航空工业','AVIC'] },
  { company:'中国船舶', title:'中国船舶集团 2027 届校园招聘', city:'上海', industry:'军工/船舶', cohort:'2027 届', responsibilities:'开放船舶工程、海洋工程、电子、机械、材料、职能等岗位，工作地点全国。', requirements:'2027 届应届生，船舶、海洋、机械、电子等专业。', source_url:'https://www.cssc.net.cn', apply_url:'https://www.cssc.net.cn', aliases:['中国船舶','CSSC'] },
  { company:'中国兵器工业', title:'中国兵器工业集团 2027 届校园招聘', city:'北京', industry:'军工/兵器', cohort:'2027 届', responsibilities:'开放兵器、机械、材料、电子、计算机、职能等岗位，工作地点全国。', requirements:'2027 届应届生，机械、材料、电子、计算机等专业。', source_url:'https://www.norincogroup.com.cn', apply_url:'https://www.norincogroup.com.cn', aliases:['中国兵器工业','Norinco'] },
  { company:'中国电科', title:'中国电子科技集团 2027 届校园招聘', city:'北京', industry:'军工/电子', cohort:'2027 届', responsibilities:'开放电子、通信、雷达、软件、计算机、网络安全等岗位，工作地点全国。', requirements:'2027 届应届生，电子、通信、计算机、自动化等专业。', source_url:'https://www.cetc.com.cn', apply_url:'https://www.cetc.com.cn', aliases:['中国电科','CETC'] },
  { company:'中国航发', title:'中国航发 2027 届校园招聘', city:'北京', industry:'军工/航空发动机', cohort:'2027 届', responsibilities:'开放航空发动机研发、制造、材料、电子、职能等岗位，工作地点全国。', requirements:'2027 届应届生，航空、材料、机械、电子等专业。', source_url:'https://www.aecc.cn', apply_url:'https://www.aecc.cn', aliases:['中国航发','AECC'] },
  { company:'中核集团', title:'中核集团 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放核工程、核电、新能源、材料、机械、电气、职能等岗位，工作地点全国。', requirements:'2027 届应届生，核工程、能动、材料、机械、电气等专业。', source_url:'https://www.cnnc.com.cn', apply_url:'https://www.cnnc.com.cn', aliases:['中核集团','CNNC'] },
  { company:'国家能源集团', title:'国家能源集团 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放煤炭、电力、铁路、港口、化工等方向岗位，工作地点全国。', requirements:'2027 届应届生，电气、能动、采矿、化工、机械等专业。', source_url:'https://www.chnenergy.com.cn', apply_url:'https://www.chnenergy.com.cn', aliases:['国家能源集团','CHN Energy'] },
  { company:'国家电投', title:'国家电投 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放电力、新能源、核电、环保、职能等岗位，工作地点全国。', requirements:'2027 届应届生，电气、能动、新能源等专业。', source_url:'https://www.spic.com.cn', apply_url:'https://www.spic.com.cn', aliases:['国家电投','SPIC'] },
  { company:'中国华能', title:'中国华能 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放电力、新能源、煤炭、职能等岗位，工作地点全国。', requirements:'2027 届应届生，电气、能动、机械等专业。', source_url:'https://www.chng.com.cn', apply_url:'https://www.chng.com.cn', aliases:['中国华能','CHNG'] },
  { company:'中国华电', title:'中国华电 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放电力、新能源、供热、职能等岗位，工作地点全国。', requirements:'2027 届应届生，电气、能动、机械等专业。', source_url:'https://www.chd.com.cn', apply_url:'https://www.chd.com.cn', aliases:['中国华电','CHD'] },
  { company:'中国大唐', title:'中国大唐 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放电力、新能源、供热、职能等岗位，工作地点全国。', requirements:'2027 届应届生，电气、能动、机械等专业。', source_url:'https://www.china-cdt.com', apply_url:'https://www.china-cdt.com', aliases:['中国大唐','CDT'] },
  { company:'中国海油', title:'中国海油 2027 届校园招聘', city:'北京', industry:'能源电力', cohort:'2027 届', responsibilities:'开放海洋油气勘探、开发、生产、工程技术、科研等岗位，工作地点全国及海上平台。', requirements:'2027 届应届生，石油、地质、海洋工程、机械、电气等专业。', source_url:'https://www.cnooc.com.cn', apply_url:'https://www.cnooc.com.cn', aliases:['中国海油','CNOOC'] },
  { company:'三峡集团', title:'中国长江三峡集团 2027 届校园招聘', city:'武汉', industry:'能源电力', cohort:'2027 届', responsibilities:'开放水电、风电、光伏、抽水蓄能、储能、氢能等岗位，工作地点全国。', requirements:'2027 届应届生，电气、能动、水利、新能源等专业。', source_url:'https://www.ctg.com.cn', apply_url:'https://www.ctg.com.cn', aliases:['三峡集团','CTG'] },
  { company:'南方电网', title:'南方电网 2027 届校园招聘', city:'广州', industry:'能源电力', cohort:'2027 届', responsibilities:'开放电气工程、电力系统、通信、计算机、财务等岗位，覆盖广东、广西、云南、贵州、海南。', requirements:'2027 届应届生，电气、能动、计算机、财务等专业。', source_url:'https://zhaopin.csg.cn', apply_url:'https://zhaopin.csg.cn', aliases:['南方电网','CSG'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
