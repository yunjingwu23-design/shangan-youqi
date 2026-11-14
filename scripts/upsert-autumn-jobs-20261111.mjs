// 秋招信息更新脚本（2026-11-11）：搜索最新秋招岗位并 upsert 到 job_catalog 表
// 从 .env.local 读取数据库连接配置
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const envMap = {};
for (const line of envRaw.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0) envMap[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}

const SUPABASE_URL = envMap.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envMap.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('缺少数据库配置，请检查 .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const now = new Date().toISOString();

// 本次新增的结构化秋招岗位数据
const jobs = [
  {
    company: '京东',
    title: '京东 TGT 顶尖青年技术天才计划 2027 届校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      'TGT（Tech Genius Team）是京东发起的顶尖青年技术天才计划，面向全球高校本硕博及毕业两年内技术人才招募。方向覆盖多模态大模型与应用、空间与具身智能、机器学习、AI Infra、搜索推荐广告、高性能与云计算、安全、大数据等，基于京东丰富业务场景探索前沿技术。',
    requirements:
      'TGT校招生毕业时间在2024年10月1日-2027年9月30日；有顶会论文/专利/赛事奖项者优先；行业顶级薪酬回报与全面福利。',
    source_url: 'https://jyzx.scut.edu.cn/xjhxq/list.htm?id=ead96c57320a48ec9914c7197daaef91',
    apply_url: 'https://campus.jd.com/',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '京东',
    title: '京东物流 2027 届新锐之星（经营管理方向）校招',
    type: 'autumn_recruitment',
    city: '全国多地（北京/上海/广东/浙江/四川/重庆/湖北/湖南等）',
    industry: '物流',
    cohort: '2027届',
    responsibilities:
      '新锐之星为京东物流面向应届生的专项培养计划，经营管理方向（快递营业部/集配站负责人），负责客户拜访、营销工具推广、客户调研、线索收集，站点标准化管理执行、异常问题沟通处理、台账数据整理统计等。',
    requirements:
      '2027届毕业生，大专及以上（经营管理方向为全日制大专以上）；有持续学习热情，能主动思考解决问题。',
    source_url: 'https://zjc.sasu.edu.cn/info/1141/6636.htm',
    apply_url: 'https://campus.jd.com/',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '百度',
    title: '百度 P-STAR 产培生 2027 届校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '百度产品校招生培养计划，面向最具潜力的产品校招生，在核心应用战场发挥创造力；产运中管直接带教、专属导师培养制，量身定制学习课程；方向含用户/功能产品、C端产品、用增、社区、策略、AI产品、内容、社交产品等。',
    requirements:
      '2027届毕业生，本科及以上；对产品有热情，逻辑清晰，具备产品思维。',
    source_url: 'https://www.zhipin.com/job_detail/6ddc28d5f210e9b503x-2t-4FlFT.html',
    apply_url: 'https://talent.baidu.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '百度',
    title: '百度 AIDU 人才计划 AI异构计算（文心一言）2027 届校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '构建全球领先的AI异构计算加速引擎与平台，融合推理与训练的软硬件一体AI计算加速方案；负责大规模AI前向计算引擎框架与底层算子开发优化、AI计算通信库及算法开发、面向CPU/GPU/FPGA/ASIC的编译系统开发优化、异构高性能计算平台设计研发。',
    requirements:
      '2026年-2027年毕业，硕士及以上；精通C++/Python，具备独立开发能力，对AI算法和主流框架有丰富应用或开发经验。',
    source_url: 'https://www.zhipin.com/job_detail/d9d5782c662698250nB90ti5EVNS.html',
    apply_url: 'https://talent.baidu.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '小红书',
    title: '小红书 引擎架构部 REDstar 顶尖人才计划 2027 校招（搜广推方向）',
    type: 'autumn_recruitment',
    city: '北京、上海、深圳',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '小红书引擎架构部负责社区、电商、广告全核心业务的搜索/推荐/广告工程架构与机器学习 Infra，技术面覆盖百亿级流量分发、千亿级内容理解、生成式推荐、长序列建模、Agent、异构算力训推、湖流批一体数据底座。方向含搜广推 x AI应用工程师、机器学习框架工程师、索引存储架构工程师、数据计算引擎研发工程师。',
    requirements:
      '2027届本/硕/博应届生（毕业时间2026.9-2027.8），计算机、软件、人工智能、自动化、数据相关背景；REDstar顶尖人才计划同步向毕业两年内技术人才开放。',
    source_url: 'https://job.sit.edu.cn//page/positionzp.html?type=2&wid=eb6baebae65b425e9d35990a54495e92',
    apply_url: 'https://job.xiaohongshu.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '网易游戏',
    title: '网易游戏雷火 2027 届秋季校园招聘（游戏研发/策划）',
    type: 'autumn_recruitment',
    city: '杭州、成都',
    industry: '互联网/游戏',
    cohort: '2027届',
    responsibilities:
      '网易雷火是国内一流游戏研发团队，打造《逆水寒》《永劫无间》《倩女幽魂》《天谕》等爆款游戏。本次开放游戏研发类、游戏策划类、游戏测试类岗位；另有网易伏羲游戏人工智能实验室，专注游戏与泛娱乐AI研究与落地。',
    requirements:
      '27届海内外高校应届毕业生（毕业时间2026年9月1日-2027年8月31日）；网申10月16日截止，招满即止。',
    source_url: 'https://leihuo.163.com/campus/',
    apply_url: 'https://leihuo.163.com/campus/',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: 'Shopee',
    title: 'Shopee AI Agent 算法工程师 2027 秋招',
    type: 'autumn_recruitment',
    city: '北京、上海、深圳',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      'Shopee 2027届技术岗重点开放方向之一，聚焦AI Agent相关算法研发；同期开放研发工程师（深圳）、信息安全工程师、SRE运维工程师（深圳/北京）、算法工程师（搜广推/AI应用）、AI训练/推理框架工程师、AI产品经理培训生、AI数据分析培训生等岗位。',
    requirements:
      '2027届应届毕业生，具备海外顶尖院校AI相关项目经验者优先，技术岗需扎实的算法与工程基础。',
    source_url: 'https://blog.gaodingoffer.cn/cac38a0a627641e6b4d9349e23549bac',
    apply_url: 'https://app.mokahr.com/su/mipyep',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '腾讯',
    title: '腾讯子公司-云智研发 2027 届秋招',
    type: 'autumn_recruitment',
    city: '长沙、武汉、重庆、西安、厦门',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '腾讯子公司云智研发，聚焦云和智慧产业基础产品和行业标准产品的研发，支持腾讯云、腾讯地图/出行、腾讯安全等业务。招聘职类涵盖技术研发类、安全技术类、技术运营类、产品类、解决方案与服务类。',
    requirements:
      '2027届应届毕业生，本科及以上，计算机等相关专业优先。与腾讯主校招、腾讯音乐校招网申独立，可同时投递。',
    source_url: 'https://jy.jsu.edu.cn/detail/online?id=3631236&menu_id=40086',
    apply_url: 'https://join.tencent-cloud.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
];

async function main() {
  const { data: existing, error: fetchErr } = await supabase
    .from('job_catalog')
    .select('company, title')
    .eq('type', 'autumn_recruitment');

  if (fetchErr) {
    console.error('查询现有记录失败:', fetchErr.message);
    process.exit(1);
  }

  const existingSet = new Set((existing || []).map((r) => `${r.company}||${r.title}`));

  const toInsert = [];
  const skipped = [];
  for (const job of jobs) {
    const key = `${job.company}||${job.title}`;
    if (existingSet.has(key)) {
      skipped.push(job.title);
      continue;
    }
    // 确保 contacts 是 JSON 数组
    job.contacts = Array.isArray(job.contacts) ? job.contacts : [];
    toInsert.push(job);
  }

  if (toInsert.length === 0) {
    console.log('无新增岗位，全部已存在。');
    if (skipped.length) console.log('已存在(跳过):', skipped.join(' / '));
    return;
  }

  const { data, error } = await supabase.from('job_catalog').insert(toInsert);

  if (error) {
    console.error('写入失败:', error.message, error.details, error.hint);
    process.exit(1);
  }

  console.log(`成功写入 ${toInsert.length} 条新岗位：`);
  toInsert.forEach((j) => console.log(` - [${j.company}] ${j.title}`));
  if (skipped.length) console.log('\n已存在(跳过):', skipped.join(' / '));
}

main();
