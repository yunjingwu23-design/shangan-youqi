/**
 * 第三十一批：物流快递 + 环保水务
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'德邦快递', title:'德邦快递 2027 届校园招聘（海豚计划）', city:'上海', industry:'物流', cohort:'2027 届', responsibilities:'开放岗位：海豚计划校招生（战区经营/运营方向，一线轮岗+双导师制，3-5年培养为中高层管理者）、总部运营规划、财务、人力、科技、储备干部等方向。工作地点：上海（总部）、全国各省市（江苏、安徽、湖北、云南等）。', requirements:'2026.9—2027.9 毕业的海内外本科，专业不限，统计、物流、经管优先。本科年薪 6-11 万、硕士 9-15 万、博士 36 万+。', source_url:'https://campus.deppon.com', apply_url:'https://campus.deppon.com', aliases:['德邦快递','德邦','Deppon'] },
  { company:'圆通速递', title:'圆通速递 2027 届校园招聘', city:'上海', industry:'物流', cohort:'2027 届', responsibilities:'开放岗位：经营管理、运营、供应链、财务、科技、职能等方向。工作地点：上海（总部）及全国。', requirements:'2027 届应届生，专业不限，物流、经管、计算机优先。', source_url:'https://www.yto.net.cn', apply_url:'https://www.yto.net.cn', aliases:['圆通速递','圆通','YTO'] },
  { company:'中通快递', title:'中通快递 2027 届校园招聘', city:'上海', industry:'物流', cohort:'2027 届', responsibilities:'开放岗位：经营管理、运营、供应链、财务、科技、职能等方向。工作地点：上海（总部）及全国。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.zto.com', apply_url:'https://www.zto.com', aliases:['中通快递','中通','ZTO'] },
  { company:'申通快递', title:'申通快递 2027 届校园招聘', city:'上海', industry:'物流', cohort:'2027 届', responsibilities:'开放岗位：经营管理、运营、供应链、财务、科技、职能等方向。工作地点：上海（总部）及全国。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.sto.cn', apply_url:'https://www.sto.cn', aliases:['申通快递','申通','STO'] },
  { company:'韵达快递', title:'韵达快递 2027 届校园招聘', city:'上海', industry:'物流', cohort:'2027 届', responsibilities:'开放岗位：经营管理、运营、供应链、财务、科技、职能等方向。工作地点：上海（总部）及全国。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.yundaex.com', apply_url:'https://www.yundaex.com', aliases:['韵达快递','韵达','Yunda'] },
  { company:'极兔速递', title:'极兔速递 2027 届校园招聘', city:'上海', industry:'物流', cohort:'2027 届', responsibilities:'开放岗位：经营管理、运营、供应链、财务、科技、职能等方向。工作地点：上海（总部）及全国、东南亚。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.jtexpress.cn', apply_url:'https://www.jtexpress.cn', aliases:['极兔速递','极兔','J&T Express'] },
  { company:'首创环保', title:'北京首创生态环保集团 2027 届校园招聘', city:'北京', industry:'环保', cohort:'2027 届', responsibilities:'开放岗位：水务运营、环境工程、给排水、大气治理、固废处理、节能降碳、电气自动化、计算机、财务、人力等方向。工作地点：北京（总部）及全国 29 省 190 余城。', requirements:'2027 届硕士及以上（部分京外岗本科可报），环境工程、给排水、大气科学、电气、能动、计算机、财务等专业。', source_url:'https://campus.51job.com/bjcapital2027', apply_url:'https://campus.51job.com/bjcapital2027', aliases:['首创环保','首创生态环保','Capital Water'] },
  { company:'北控水务', title:'北控水务集团 2027 届校园招聘', city:'北京', industry:'环保', cohort:'2027 届', responsibilities:'开放岗位：工艺AI解决方案岗、工艺AI算法岗、AI应用岗、审计、安全管理、体系管理、工程管理、计划管理、研发、创新、经营管理、数智运营、管网运营管理、投资、人力资源等。工作地点：北京（朝阳区北控水务大厦）。', requirements:'2027 届硕士/博士，人工智能、大数据、计算机、数学、物理、软件、安全、经济、统计、工程管理、机械、化学、环境工程、给排水、人力等专业。', source_url:'https://bewg.zhiye.com/campus/jobs', apply_url:'https://bewg.zhiye.com/campus/jobs', aliases:['北控水务','BEWG'] },
  { company:'碧水源', title:'碧水源 2027 届校园招聘', city:'北京', industry:'环保', cohort:'2027 届', responsibilities:'开放岗位：市场开发岗（水处理方向，市政供水/污水、工业废水、水环境治理、再生水）、膜材料研发、膜工艺、工程、运营、职能等方向。工作地点：北京（总部）及全国。', requirements:'2027 届硕士为主，环境工程、给排水、市场营销、材料等专业。', source_url:'https://www.originwater.com', apply_url:'https://www.originwater.com', aliases:['碧水源','Origin Water'] },
  { company:'光大环境', title:'光大环境 2027 届校园招聘', city:'深圳', industry:'环保', cohort:'2027 届', responsibilities:'开放岗位：垃圾焚烧发电、固废处理、环保工程、运营、职能等方向。工作地点：深圳（总部）及全国项目。', requirements:'2027 届应届生，环境工程、能动、机械、电气等专业。', source_url:'https://www.ebchinaintl.com', apply_url:'https://www.ebchinaintl.com', aliases:['光大环境','Everbright Environment'] },
  { company:'龙净环保', title:'龙净环保 2027 届校园招聘', city:'龙岩', industry:'环保', cohort:'2027 届', responsibilities:'开放岗位：大气污染治理、环保装备研发、工程、运营、职能等方向。工作地点：龙岩（总部）、上海、北京等。', requirements:'2027 届应届生，环境工程、机械、电气、化工等专业。', source_url:'https://www.longking.com.cn', apply_url:'https://www.longking.com.cn', aliases:['龙净环保','龙净','Longking'] },
];
let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
