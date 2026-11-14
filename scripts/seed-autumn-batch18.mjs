/**
 * 第十八批：其他央企（烟草/铁路/汽车/制造/综合）+ 券商保险 + 地方国企
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const jobs = [
  { company:'中国烟草', title:'中国烟草 2027 届校园招聘', city:'北京', industry:'烟草', cohort:'2027 届', responsibilities:'开放各省市烟草专卖局（公司）、中烟工业及专业公司岗位，覆盖管理、技术、营销、生产等方向。', requirements:'2027 届应届生，专业不限，各地分批次发布公告。', source_url:'https://www.tobacco.gov.cn', apply_url:'https://www.tobacco.gov.cn', aliases:['中国烟草','烟草局'] },
  { company:'国家铁路集团', title:'中国国家铁路集团 2027 届校园招聘', city:'北京', industry:'铁路/交通', cohort:'2027 届', responsibilities:'开放铁路运输、机务、车辆、工务、电务、供电、信息等岗位，覆盖各铁路局集团。', requirements:'2027 届应届生，交通运输、机械、电气、计算机等专业。', source_url:'https://rczp.china-railway.com.cn', apply_url:'https://rczp.china-railway.com.cn', aliases:['国铁集团','中国铁路'] },
  { company:'中国一汽', title:'中国一汽 2027 届校园招聘', city:'长春', industry:'汽车', cohort:'2027 届', responsibilities:'开放整车研发、新能源、智能网联、制造、营销、职能等岗位。', requirements:'2027 届应届生，机械、车辆、电子、软件等专业。', source_url:'https://www.faw.com.cn', apply_url:'https://www.faw.com.cn', aliases:['中国一汽','FAW'] },
  { company:'东风汽车', title:'东风汽车 2027 届校园招聘', city:'武汉', industry:'汽车', cohort:'2027 届', responsibilities:'开放整车研发、新能源、智能网联、制造、营销、职能等岗位。', requirements:'2027 届应届生，机械、车辆、电子、软件等专业。', source_url:'https://www.dfmc.com.cn', apply_url:'https://www.dfmc.com.cn', aliases:['东风汽车','DFM'] },
  { company:'国机集团', title:'中国机械工业集团 2027 届校园招聘', city:'北京', industry:'制造', cohort:'2027 届', responsibilities:'开放机械、电气、自动化、材料、管理、职能等岗位，工作地点全国。', requirements:'2027 届应届生，机械、电气、材料、管理等专业。', source_url:'https://www.sinomach.com.cn', apply_url:'https://www.sinomach.com.cn', aliases:['国机集团','Sinomach'] },
  { company:'东方电气', title:'东方电气集团 2027 届校园招聘', city:'成都', industry:'制造/能源装备', cohort:'2027 届', responsibilities:'开放电气、机械、材料、能动、职能等岗位，聚焦发电装备制造。', requirements:'2027 届应届生，电气、机械、材料、能动等专业。', source_url:'https://www.dongfang.com', apply_url:'https://www.dongfang.com', aliases:['东方电气','DEC'] },
  { company:'华润集团', title:'华润集团 2027 届校园招聘', city:'深圳', industry:'综合', cohort:'2027 届', responsibilities:'开放华润置地、华润电力、华润燃气、华润万家、华润医药等多元业务岗位，覆盖管培生、专业岗。', requirements:'2027 届应届生，专业不限。', source_url:'https://campus.crc.com.hk', apply_url:'https://campus.crc.com.hk', aliases:['华润集团','CRC'] },
  { company:'招商局集团', title:'招商局集团 2027 届校园招聘', city:'深圳', industry:'综合', cohort:'2027 届', responsibilities:'开放招商银行、招商证券、招商蛇口、招商港口、招商公路等多元业务岗位。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.cmhk.com', apply_url:'https://www.cmhk.com', aliases:['招商局集团','China Merchants'] },
  { company:'中粮集团', title:'中粮集团 2027 届校园招聘', city:'北京', industry:'综合/食品', cohort:'2027 届', responsibilities:'开放粮油食品、贸易、地产、金融、职能等岗位，工作地点全国。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.cofco.com', apply_url:'https://www.cofco.com', aliases:['中粮集团','COFCO'] },
  { company:'国投集团', title:'国家开发投资集团 2027 届校园招聘', city:'北京', industry:'综合', cohort:'2027 届', responsibilities:'开放能源、金融、投资、健康、职能等岗位，工作地点全国。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.sdic.com.cn', apply_url:'https://www.sdic.com.cn', aliases:['国投集团','SDIC'] },
  { company:'中国旅游集团', title:'中国旅游集团 2027 届校园招聘', city:'北京', industry:'旅游/消费', cohort:'2027 届', responsibilities:'开放酒店、旅行、免税、地产、职能等岗位，工作地点全国。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.ctg.cn', apply_url:'https://www.ctg.cn', aliases:['中国旅游集团','CTG'] },
  { company:'中国人保', title:'中国人保 2027 届校园招聘', city:'北京', industry:'保险', cohort:'2027 届', responsibilities:'开放保险、精算、投资、科技、运营、职能等岗位。', requirements:'2027 届应届生，金融、保险、精算、计算机等专业。', source_url:'https://www.picc.com', apply_url:'https://www.picc.com', aliases:['中国人保','PICC'] },
  { company:'中国人寿', title:'中国人寿 2027 届校园招聘', city:'北京', industry:'保险', cohort:'2027 届', responsibilities:'开放保险、精算、投资、科技、运营、职能等岗位。', requirements:'2027 届应届生，金融、保险、精算、计算机等专业。', source_url:'https://www.chinalife.com.cn', apply_url:'https://www.chinalife.com.cn', aliases:['中国人寿','China Life'] },
  { company:'中国平安', title:'中国平安 2027 届校园招聘', city:'深圳', industry:'保险', cohort:'2027 届', responsibilities:'开放保险、银行、投资、科技、医疗、职能等岗位。', requirements:'2027 届应届生，专业不限。', source_url:'https://campus.pingan.com', apply_url:'https://campus.pingan.com', aliases:['中国平安','Ping An'] },
  { company:'中国太保', title:'中国太平洋保险 2027 届校园招聘', city:'上海', industry:'保险', cohort:'2027 届', responsibilities:'开放保险、精算、投资、科技、运营、职能等岗位。', requirements:'2027 届应届生，金融、保险、精算、计算机等专业。', source_url:'https://www.cpic.com.cn', apply_url:'https://www.cpic.com.cn', aliases:['中国太保','CPIC'] },
  { company:'华泰证券', title:'华泰证券 2027 届校园招聘', city:'南京', industry:'证券', cohort:'2027 届', responsibilities:'开放投行、研究、财富管理、金融科技等岗位，工作地点南京、北京、上海等。', requirements:'2027 届应届生，金融、经济、计算机等专业。', source_url:'https://job.htsc.com.cn', apply_url:'https://job.htsc.com.cn', aliases:['华泰证券','HTSC'] },
  { company:'中金公司', title:'中金公司 2027 届校园招聘', city:'北京', industry:'证券', cohort:'2027 届', responsibilities:'开放投行、研究、交易、财富管理、金融科技等岗位，工作地点北京、上海、深圳等。', requirements:'2027 届应届生，金融、经济、法律、计算机等专业。', source_url:'https://www.cicc.com', apply_url:'https://www.cicc.com', aliases:['中金公司','CICC'] },
  { company:'广发证券', title:'广发证券 2027 届校园招聘', city:'广州', industry:'证券', cohort:'2027 届', responsibilities:'开放投行、研究、财富管理、金融科技等岗位，工作地点广州、北京、上海等。', requirements:'2027 届应届生，金融、经济、计算机等专业。', source_url:'https://www.gf.com.cn', apply_url:'https://www.gf.com.cn', aliases:['广发证券','GF Securities'] },
  { company:'海通证券', title:'海通证券 2027 届校园招聘', city:'上海', industry:'证券', cohort:'2027 届', responsibilities:'开放投行、研究、财富管理、金融科技等岗位，工作地点上海、北京等。', requirements:'2027 届应届生，金融、经济、计算机等专业。', source_url:'https://www.htsec.com', apply_url:'https://www.htsec.com', aliases:['海通证券','Haitong'] },
  { company:'申万宏源', title:'申万宏源证券 2027 届校园招聘', city:'上海', industry:'证券', cohort:'2027 届', responsibilities:'开放投行、研究、财富管理、金融科技等岗位，工作地点上海、北京等。', requirements:'2027 届应届生，金融、经济、计算机等专业。', source_url:'https://www.swhysc.com', apply_url:'https://www.swhysc.com', aliases:['申万宏源','SWHY'] },
  { company:'中国邮政', title:'中国邮政集团 2027 届校园招聘', city:'北京', industry:'物流/综合', cohort:'2027 届', responsibilities:'开放邮政、快递物流、金融、电商、职能等岗位，工作地点全国。', requirements:'2027 届应届生，专业不限。', source_url:'https://www.chinapost.com.cn', apply_url:'https://www.chinapost.com.cn', aliases:['中国邮政','China Post'] },
];

let inserted=0, skipped=0;
for (const job of jobs) {
  const { data: existing } = await db.from('job_catalog').select('id').eq('company', job.company).eq('title', job.title).eq('type','autumn_recruitment').maybeSingle();
  if (existing) { skipped++; console.log('跳过:', job.company); continue; }
  const { error } = await db.from('job_catalog').insert({ ...job, type:'autumn_recruitment', state:'published', verified_at:now, published_at:now });
  if (error) { console.error('失败', job.company, error.message); } else { inserted++; console.log('已插入:', job.company); }
}
console.log(`\n完成：新增 ${inserted}，跳过 ${skipped}`);
