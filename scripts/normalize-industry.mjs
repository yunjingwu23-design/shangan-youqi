/**
 * 秋招岗位行业分类规范化
 * 把碎片化行业标签统一为 15 个标准大类，让「找岗位」页面的行业筛选清晰可用
 * Run: node scripts/normalize-industry.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// 公司 -> 标准行业 映射（精确到公司级，覆盖全部已入库公司）
const companyIndustry = {
  // 互联网
  '腾讯': '互联网', '腾讯音乐': '互联网', '快手': '互联网', '字节跳动': '互联网', '美团': '互联网',
  '百度': '互联网', '网易': '互联网', '阿里巴巴': '互联网', '小红书': '互联网', '哔哩哔哩': '互联网',
  '携程': '互联网', '滴滴': '互联网', 'BOSS直聘': '互联网', '知乎': '互联网', '360集团': '互联网安全',
  // 电商 / 跨境电商
  '拼多多': '电商', '京东': '电商', '得物': '电商', '唯品会': '电商', '淘天集团': '电商', '盒马': '电商',
  'SHEIN': '跨境电商', 'Shopee': '跨境电商', 'TikTok Shop': '跨境电商', '安克创新': '跨境电商', 'Cider': '跨境电商',
  // 游戏
  '米哈游': '游戏', '莉莉丝游戏': '游戏', '三七互娱': '游戏', '网易游戏': '游戏', '虎牙': '游戏',
  '巨人网络': '游戏', '游卡': '游戏', '点点互动': '游戏', '淘米网络': '游戏', '吉比特': '游戏',
  '4399游戏': '游戏', 'TapTap（心动）': '游戏', '完美世界': '游戏', '网龙': '游戏',
  // 智能硬件 / 消费电子
  '影石 Insta360': '智能硬件', '小米': '智能硬件', 'OPPO': '智能硬件', 'vivo': '智能硬件', '荣耀': '智能硬件',
  '大疆': '智能硬件', '联想': '智能硬件', '华为': '智能硬件', '立讯精密': '智能硬件', '歌尔股份': '智能硬件',
  '海康威视': '智能硬件',
  // 半导体 / 芯片
  '中芯国际': '半导体', '寒武纪': '半导体', '海光信息': '半导体', '京东方': '半导体', '地平线': '半导体',
  // AI / 大模型
  '科大讯飞': '人工智能', '商汤科技': '人工智能', '月之暗面': '人工智能', '智谱AI': '人工智能', 'MiniMax': '人工智能',
  '昆仑万维': '人工智能', 'DeepSeek': '人工智能', '阶跃星辰': '人工智能', '百川智能': '人工智能',
  // 机器人 / 具身智能
  '宇树科技': '机器人', '优必选': '机器人', '埃夫特': '机器人', '极智嘉': '机器人',
  // 新能源汽车 / 汽车
  '比亚迪': '新能源汽车', '蔚来': '新能源汽车', '理想汽车': '新能源汽车', '小鹏汽车': '新能源汽车',
  '特斯拉': '新能源汽车', '宁德时代': '新能源', '欣旺达': '新能源',
  '广汽集团': '汽车', '吉利控股集团': '汽车', '上汽通用五菱': '汽车', '奇瑞汽车': '汽车',
  // 家电
  '美的': '家电', '海尔': '家电', '格力电器': '家电', 'TCL': '家电', '海信集团': '家电', '创维集团': '家电', '长虹控股集团': '家电',
  // 金融
  '招商银行': '银行', '平安银行': '银行', '微众银行': '银行', '蚂蚁集团': '金融科技', '水滴公司': '金融科技',
  '中信证券': '证券', '国泰海通证券': '证券', '招商证券': '证券',
  // 咨询 / 审计（四大）
  '德勤': '咨询/审计', '普华永道': '咨询/审计', '安永': '咨询/审计', '毕马威': '咨询/审计',
  // 快消 / 消费
  '宝洁': '快消', '联合利华': '快消', '沃尔玛': '快消', '光明食品集团': '快消',
  '名创优品': '消费', '海底捞': '消费', '泡泡玛特': '消费', '蜜雪冰城': '消费', '三只松鼠': '消费',
  '瑞幸咖啡': '消费', '安踏集团': '消费', '李宁': '消费',
  // 医药 / 医疗
  '恒瑞医药': '医药', '药明康德': '医药', '迈瑞医疗': '医药', '联影医疗': '医药',
  // 地产
  '华润置地': '地产', '保利发展': '地产', '万科': '地产',
  // 通信 / 运营商
  '中国移动': '通信/运营商', '中国电信': '通信/运营商', '中国联通': '通信/运营商',
  // 能源
  '国家电网': '能源电力', '中国石油': '能源电力', '中国石化': '能源电力',
  // 物流
  '顺丰集团': '物流', '京东物流': '物流',
  // 企业服务 / 软件 / 教育
  '金山办公': '企业服务', '慧策（掌上先机）': '企业服务', '微软': '企业服务',
  '网易有道': '教育科技', '同程旅行': '互联网', '去哪儿网': '互联网', '猎聘': '互联网',
};

let updated = 0, missing = 0;
const { data: jobs } = await db.from('job_catalog').select('id,company,industry').eq('type', 'autumn_recruitment');
const byId = new Map(jobs.map(j => [j.id, j]));

// 按公司更新（同一公司所有岗位统一行业）
const companies = [...new Set(jobs.map(j => j.company))];
for (const company of companies) {
  const target = companyIndustry[company];
  if (!target) {
    missing++;
    console.log('⚠️ 未映射公司:', company);
    continue;
  }
  const { error } = await db.from('job_catalog')
    .update({ industry: target })
    .eq('type', 'autumn_recruitment')
    .eq('company', company);
  if (error) {
    console.error('更新失败', company, error.message);
  } else {
    const n = jobs.filter(j => j.company === company).length;
    updated += n;
  }
}
console.log(`\n完成：更新 ${updated} 条岗位，${missing} 家公司未映射`);

// 输出最终行业分布
const { data: after } = await db.from('job_catalog').select('industry').eq('type', 'autumn_recruitment');
const m = {};
after.forEach(d => { m[d.industry] = (m[d.industry] || 0) + 1; });
console.log('\n=== 规范化后行业分布 ===');
Object.entries(m).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(k.padEnd(14), v));
