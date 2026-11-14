/**
 * 第十六批秋招岗位：国有六大行 + 政策行 + 主要股份行
 * Run: node scripts/seed-autumn-batch16.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();

const jobs = [
  { company:'中国工商银行', title:'中国工商银行 2027 届秋季校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行本部、直属机构、境内分行、子公司等岗位，覆盖管培生、科技、客服经理、客户经理、风控等方向，全球机构招录约 2 万人。', requirements:'26、27 届应届生，专业不限（客服经理岗不要求英语四级）。', source_url:'https://job.icbc.com.cn', apply_url:'https://job.icbc.com.cn', aliases:['工商银行','ICBC'] },
  { company:'中国建设银行', title:'中国建设银行 2027 届秋季校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放管培生、科技专项、客户经理、客服经理、外语专项等岗位，覆盖总行及全国分支机构，招录约 1.7 万人。', requirements:'26、27 届应届生，专业不限（县域岗位不要求英语四级）。', source_url:'https://job.ccb.com', apply_url:'https://job.ccb.com', aliases:['建设银行','CCB'] },
  { company:'中国农业银行', title:'中国农业银行 2027 届秋季校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及全国分支机构岗位，覆盖管培生、科技、客服、客户经理等方向，全球机构招录约 2 万人。', requirements:'26、27 届应届生，专业不限（部分岗位需英语四级）。', source_url:'https://career.abchina.com.cn', apply_url:'https://career.abchina.com.cn', aliases:['农业银行','ABC'] },
  { company:'中国银行', title:'中国银行 2027 届秋季校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行、直属机构、境内分行及海外机构岗位，覆盖管培生、科技、综合服务、外语等方向，全球机构招录约 1.3 万人。', requirements:'26、27 届应届生，专业不限（综合服务岗不要求四级）。', source_url:'https://campus.chinahr.com/pages/boc', apply_url:'https://campus.chinahr.com/pages/boc', aliases:['中国银行','BOC'] },
  { company:'交通银行', title:'交通银行 2027 届秋季校园招聘', city:'上海', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行应届生项目（业务/风控/综管）、总行金融科技、省直分行（营运/营销/科技）、子公司等岗位。', requirements:'2026.1—2027.7 毕业的境内外高校毕业生，IT 岗限计算机、数据、安全。', source_url:'https://job.bankcomm.com', apply_url:'https://job.bankcomm.com', aliases:['交通银行','BOCOM'] },
  { company:'中国邮政储蓄银行', title:'中国邮政储蓄银行 2027 届校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放 U 培生（管理/金融科技）、销售、客户服务经理、科技、风控等岗位，可兼报中邮理财、消金、投资子公司。', requirements:'2027 届境内外毕业生，专业不限，科技岗限 IT 类。', source_url:'https://psbc2027.zhaopin.com', apply_url:'https://psbc2027.zhaopin.com', aliases:['邮储银行','PSBC'] },
  { company:'国家开发银行', title:'国家开发银行 2027 届校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖信贷、风险、研究、科技、综合管理等方向。', requirements:'2027 届应届生，经济、金融、法律、理工等专业。', source_url:'https://www.cdb.com.cn', apply_url:'https://www.cdb.com.cn', aliases:['国家开发银行','国开行','CDB'] },
  { company:'中国农业发展银行', title:'中国农业发展银行 2027 届校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及省分行岗位，覆盖信贷、风险管理、财会、综合等方向，聚焦三农金融。', requirements:'2027 届应届生，经济、金融、财会、法律等专业。', source_url:'https://www.adbc.com.cn', apply_url:'https://www.adbc.com.cn', aliases:['农业发展银行','农发行','ADBC'] },
  { company:'中信银行', title:'中信银行 2027 届校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.citicbank.com', apply_url:'https://www.citicbank.com', aliases:['中信银行','CNCB'] },
  { company:'民生银行', title:'民生银行 2027 届校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.cmbc.com.cn', apply_url:'https://www.cmbc.com.cn', aliases:['民生银行','CMBC'] },
  { company:'浦发银行', title:'浦发银行 2027 届校园招聘', city:'上海', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.spdb.com.cn', apply_url:'https://www.spdb.com.cn', aliases:['浦发银行','SPDB'] },
  { company:'兴业银行', title:'兴业银行 2027 届校园招聘', city:'福州', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.cib.com.cn', apply_url:'https://www.cib.com.cn', aliases:['兴业银行','CIB'] },
  { company:'光大银行', title:'光大银行 2027 届校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.cebbank.com', apply_url:'https://www.cebbank.com', aliases:['光大银行','CEB'] },
  { company:'华夏银行', title:'华夏银行 2027 届校园招聘', city:'北京', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.hxb.com.cn', apply_url:'https://www.hxb.com.cn', aliases:['华夏银行','HXB'] },
  { company:'平安银行', title:'平安银行 2027 届校园招聘', city:'深圳', industry:'银行', type:'autumn_recruitment', cohort:'2027 届', responsibilities:'开放总行及分行岗位，覆盖管培生、科技、营销、运营等方向。', requirements:'2027 届应届生，专业不限。', source_url:'https://campus.pingan.com', apply_url:'https://campus.pingan.com', aliases:['平安银行','PAB'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
