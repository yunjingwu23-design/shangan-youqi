/**
 * 第三十批：地方银行 + 工业自动化/光模块细分制造
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'江西银行', title:'江西银行 2027 校园招聘', city:'南昌', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：职能类总行部门经办岗（19人）、技能类直属中心操作岗（10人）、一线类分支行基层网点综合服务岗（110人）。工作地点：南昌、广州、九江、赣州、宜春、上饶、抚州等江西省内及省外分支机构。', requirements:'2027 届应届生，专业不限，经济金融、计算机等优先。', source_url:'https://jxyhxz2027.zhaopin.com', apply_url:'https://jxyhxz2027.zhaopin.com', aliases:['江西银行','JX Bank'] },
  { company:'潍坊银行', title:'潍坊银行 2027 届校园招聘（秋季）', city:'潍坊', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：总行管培生、总行金融科技岗（网络安全/软件开发/数据分析/人工智能/智能体研发）、分支机构管培生、营业网点业务岗。工作地点：潍坊、青岛、聊城、滨州、烟台、临沂。', requirements:'2027 届硕士为主（网点岗可 26/27 届本科），金融科技岗需计算机、AI、大数据、网络安全等专业。', source_url:'https://wfbank2027.zhaopin.com', apply_url:'https://wfbank2027.zhaopin.com', aliases:['潍坊银行','Weifang Bank'] },
  { company:'齐鲁银行', title:'齐鲁银行 2027 届校园招聘', city:'济南', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：总行管培生、总行数字金融生、分行管培生、综合柜员、客户经理。工作地点：济南（总行）及山东省内分行。', requirements:'2027 届应届生，管培生/数字金融生需硕士，经济金融、计算机、软件、数学统计等专业。', source_url:'https://xy.liepin.com/qlbank2027', apply_url:'https://xy.liepin.com/qlbank2027', aliases:['齐鲁银行','Qilu Bank'] },
  { company:'苏州银行', title:'苏州银行 2027 届校园招聘', city:'苏州', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：总行及分行管培生、科技、营销、运营、柜员等方向。工作地点：苏州及江苏省内。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.suzhoubank.com', apply_url:'https://www.suzhoubank.com', aliases:['苏州银行','Bank of Suzhou'] },
  { company:'厦门银行', title:'厦门银行 2027 届校园招聘', city:'厦门', industry:'银行', cohort:'2027 届', responsibilities:'开放岗位：总行及分行管培生、科技、营销、运营、柜员等方向。工作地点：厦门及福建省内。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.xmccb.com', apply_url:'https://www.xmccb.com', aliases:['厦门银行','Xiamen Bank'] },
  { company:'汇川技术', title:'汇川技术 2027 届校园招聘', city:'深圳', industry:'工业自动化', cohort:'2027 届', responsibilities:'开放岗位：功能安全工程师、电机驱动与控制、变频器/伺服/控制系统研发、工业视觉、运动控制、嵌入式软件、硬件、算法、销售工程师、职能等方向。工作地点：深圳（总部）、苏州、上海、西安等。', requirements:'2027 届硕士为主，电子信息、计算机、软件、通信、自动化、车辆等专业。', source_url:'https://campus.inovance.com', apply_url:'https://campus.inovance.com', aliases:['汇川技术','汇川','Inovance'] },
  { company:'中际旭创', title:'中际旭创（苏州旭创）2027 届校园招聘', city:'苏州', industry:'光通信/光模块', cohort:'2027 届', responsibilities:'开放岗位：管培生（机制建设方向/运营协同/精益改善/数字化转型）、高速光模块研发、光电技术、汽车光电子、算法、供应链等方向。工作地点：苏州（总部）、铜陵、成都及海外研发销售中心。', requirements:'2027 届硕士为主，光电、电子、通信、计算机、供应链、工业工程等专业。', source_url:'https://www.innolight.com', apply_url:'https://www.innolight.com', aliases:['中际旭创','旭创科技','InnoLight'] },
  { company:'新易盛', title:'新易盛通信 2027 届校园招聘', city:'成都', industry:'光通信/光模块', cohort:'2027 届', responsibilities:'开放岗位：光模块研发、生产、工艺、设备、测试、质量、职能等方向。工作地点：成都（总部）及苏州、深圳等。', requirements:'2027 届应届生，光电、电子、通信、自动化、机械等专业。', source_url:'https://www.eoptolink.com', apply_url:'https://www.eoptolink.com', aliases:['新易盛','Eoptolink'] },
  { company:'量旋科技', title:'量旋科技 2027 届秋季校园招聘', city:'深圳', industry:'量子计算/高端仪器', cohort:'2027 届', responsibilities:'开放岗位：量子计算、量子测控、软件、算法、硬件、高端仪器研发、职能等方向。工作地点：深圳（总部）。', requirements:'2027 届应届生，物理、量子信息、计算机、电子等专业，硕士及以上优先。', source_url:'https://www.spinq.cn', apply_url:'https://www.spinq.cn', aliases:['量旋科技','量旋','SpinQ'] },
  { company:'中信城开', title:'中信城开 2027 届校园招聘', city:'北京', industry:'地产', cohort:'2027 届', responsibilities:'开放岗位：城市开发运营、投资、工程、设计、营销、职能等方向。工作地点：北京、深圳、宁波、无锡、三亚。', requirements:'2027 届应届生，土木、建筑、经管、营销等专业。', source_url:'https://www.citictrust.com', apply_url:'https://www.citictrust.com', aliases:['中信城开','中信城市开发'] },
  { company:'广州新东方', title:'新东方（华南区）2027 届秋季校园招聘', city:'广州', industry:'教育', cohort:'2027 届', responsibilities:'开放岗位：教师、学习管理师、课程顾问、运营、职能等方向。工作地点：广州及华南区城市。', requirements:'2027 届应届生，专业不限。', source_url:'https://campus.xdf.cn', apply_url:'https://campus.xdf.cn', aliases:['广州新东方','新东方华南区'] },
];
let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
