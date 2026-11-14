/**
 * 第二十六批：矿业有色 + 港口/地方国企
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'中国五矿', title:'中国五矿集团 2027 届校园招聘', city:'北京', industry:'矿业/有色', cohort:'2027 届', responsibilities:'开放岗位：会计核算、资金管理、财务综合、业绩管理、信息系统建设运维、人力资源、党建、投资支持、环保低碳、期货交易及市场研究、矿业项目支持、矿业运营优化、铜精矿/铅锌/锡镍/铝贸易业务员、供应链、管培生等。工作地点：北京（总部）及旗下中冶、五矿有色、五矿矿业、湖南有色、五矿地产、中钨高新等 19 家子企业遍布全国。', requirements:'2027 届本硕博及海外留学毕业生，矿产、冶金、建筑、材料、地质、环境、信息、机械、能源、财经、商贸、管理等专业。', source_url:'https://zhaopin.minmetals.com.cn', apply_url:'https://zhaopin.minmetals.com.cn', aliases:['中国五矿','五矿','Minmetals'] },
  { company:'紫金矿业', title:'紫金矿业 2027 届全球校园招聘', city:'龙岩', industry:'矿业/有色', cohort:'2027 届', responsibilities:'开放岗位：地质、采矿、选矿、冶金、机械、电气、安全、环保、新能源新材料、职能管理等方向，设「新能源新材料精匠班」定向培养。工作地点：龙岩（总部）、厦门及海内外矿山基地。', requirements:'2027 届应届生，地质、采矿、冶金、机械、电气、材料等专业。', source_url:'https://www.zjky.cn', apply_url:'https://www.zjky.cn', aliases:['紫金矿业','Zijin'] },
  { company:'江西铜业', title:'江西铜业集团 2027 届校园招聘', city:'南昌', industry:'矿业/有色', cohort:'2027 届', responsibilities:'开放岗位：采矿、选矿、冶金、机械、电气、自动化、贸易、金融、新材料、职能管理等方向，旗下含武山铜矿等矿山。工作地点：南昌（总部）、九江及全国矿山基地。', requirements:'2027 届应届生，采矿、冶金、机械、电气、材料、贸易等专业。', source_url:'https://www.jxcc.com', apply_url:'https://www.jxcc.com', aliases:['江西铜业','江铜','JCC'] },
  { company:'山东黄金', title:'山东黄金 2027 届校园招聘', city:'济南', industry:'矿业/有色', cohort:'2027 届', responsibilities:'开放岗位：地质、采矿、选矿、冶金、机械、电气、安全、环保、职能管理等方向。工作地点：济南（总部）及山东、内蒙古等矿山。', requirements:'2027 届应届生，地质、采矿、冶金、机械、电气等专业。', source_url:'https://www.sd-gold.com', apply_url:'https://www.sd-gold.com', aliases:['山东黄金','Shandong Gold'] },
  { company:'中国黄金', title:'中国黄金集团 2027 届校园招聘', city:'北京', industry:'矿业/有色', cohort:'2027 届', responsibilities:'开放岗位：地质、采矿、选矿、冶金、机械、电气、安全、环保、职能管理等方向。工作地点：北京（总部）及全国矿山。', requirements:'2027 届应届生，地质、采矿、冶金、机械、电气等专业。', source_url:'https://www.chinagoldgroup.com', apply_url:'https://www.chinagoldgroup.com', aliases:['中国黄金','China Gold'] },
  { company:'上港集团', title:'上港集团 2027 届校园招聘', city:'上海', industry:'港口/物流', cohort:'2027 届', responsibilities:'开放岗位：集团工培生、生产管理、设备技术、信息技术等多类岗位。工作地点：上海。', requirements:'2027 届应届生，大专至硕士不等，机械、电气、物流、计算机、管理等专业。', source_url:'https://sipg.zhaopin.com', apply_url:'https://sipg.zhaopin.com', aliases:['上港集团','SIPG'] },
  { company:'中储粮集团', title:'中储粮集团 2027 届校园招聘', city:'北京', industry:'综合/农业', cohort:'2027 届', responsibilities:'开放岗位：仓储管理、质检、财务、信息技术、综合管理等方向。工作地点：北京及全国直属库点。', requirements:'2027 届毕业生及符合条件的往届生、留学生，粮油、食品、物流、财务、计算机等专业。', source_url:'https://sinograin2027.iguopin.com', apply_url:'https://sinograin2027.iguopin.com', aliases:['中储粮','中储粮集团','Sinograin'] },
  { company:'招商港口', title:'招商港口 2027 届校园招聘', city:'深圳', industry:'港口/物流', cohort:'2027 届', responsibilities:'开放岗位：港口运营、设备技术、信息技术、财务、职能管理等方向。工作地点：深圳（总部）及全国港口。', requirements:'2027 届应届生，机械、电气、物流、计算机、财务等专业。', source_url:'https://www.cmport.com.hk', apply_url:'https://www.cmport.com.hk', aliases:['招商港口','China Merchants Port'] },
  { company:'中远海运', title:'中远海运集团 2027 届校园招聘', city:'上海', industry:'港口/物流', cohort:'2027 届', responsibilities:'开放岗位：航运、物流、财务、信息技术、职能管理等方向。工作地点：上海（总部）、北京及全国。', requirements:'2027 届应届生，航海、物流、财务、计算机、管理等专业。', source_url:'https://www.coscoshipping.com', apply_url:'https://www.coscoshipping.com', aliases:['中远海运','COSCO Shipping'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
