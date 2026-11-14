/**
 * 行业分类二次收敛：把细分标签统一到顶层大类
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// 细分 -> 顶层大类 映射
const map = {
  '制造/工程机械': '制造',
  '制造/电子': '制造',
  '制造/能源装备': '制造',
  '军工/航天': '军工',
  '军工/航空': '军工',
  '军工/船舶': '军工',
  '军工/兵器': '军工',
  '军工/电子': '军工',
  '军工/航空发动机': '军工',
  '互联网/物流': '互联网',
  '互联网安全': '互联网',
  '企业服务/安全': '企业服务',
  '企业服务/SaaS': '企业服务',
  '综合/食品': '综合',
  '物流/综合': '物流',
  '半导体显示': '半导体',
  '半导体/电子': '半导体',
  '医药/生物科技': '医药',
  '通信/智能硬件': '智能硬件',
  '通信/运营商': '通信/运营商',
  '旅游/消费': '消费',
  '金融科技/银行': '银行',
  '新能源': '新能源',
};

let updated = 0;
for (const [from, to] of Object.entries(map)) {
  const { data, error } = await db.from('job_catalog')
    .update({ industry: to })
    .eq('type', 'autumn_recruitment')
    .eq('industry', from)
    .select('id');
  if (error) { console.error('失败', from, error.message); continue; }
  if (data) { updated += data.length; console.log(`${from} -> ${to} (${data.length} 条)`); }
}
console.log(`\n完成：更新 ${updated} 条`);

// 最终分布
const { data: after } = await db.from('job_catalog').select('industry').eq('type', 'autumn_recruitment');
const m = {};
after.forEach(d => { m[d.industry] = (m[d.industry] || 0) + 1; });
console.log('\n=== 最终行业分布 ===');
Object.entries(m).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(k.padEnd(14), v));
