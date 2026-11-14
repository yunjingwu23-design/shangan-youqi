// 秋招信息更新脚本（2026-11-12）：搜索最新秋招岗位并 upsert 到 job_catalog 表
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

// 本次新增的结构化秋招岗位数据（具体岗位级，与已有汇总型记录不重复）
const jobs = [
  {
    company: '美团',
    title: '美团 AI Agent 开发工程师 2027 届校招（软硬件服务）',
    type: 'autumn_recruitment',
    city: '北京、上海、深圳、成都',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '美团软硬件服务2027届秋招AI方向岗位之一，面向2027届（毕业时间2026年11月-2027年10月）。同期热招AI全栈工程师、AI数据开发工程师、自动驾驶数据工程研发、AI Infra/推理系统工程师、无人配送/机器人软件开发工程师、大模型应用算法工程师、自动驾驶算法工程师、运筹优化算法工程师、智能决策算法工程师、AI产品经理、智能商业分析师等AI原生岗位。',
    requirements:
      '2027届本科及以上，AI Agent开发方向需扎实的LLM应用与工程能力；网申2026年9月29日起，长期有效，招满即止。',
    source_url: 'https://miaoruzhi.com/recruitment/2c2bc012-87e4-4984-ba6d-bd219ef0f4cf',
    apply_url: 'https://zhaopin.meituan.com/web/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '小红书',
    title: '小红书 REDstar 基础模型算法工程师（Post-training）2027 校招',
    type: 'autumn_recruitment',
    city: '北京、上海、杭州',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '小红书REDstar顶尖人才计划岗位，聚焦LLM Post-training方向，通过先进的强化学习、对齐、工具使用等技术提升大语言模型核心能力。要求深入理解Transformer架构及大模型训练全流程，熟悉主流VLM架构，在CV/多模态/视频理解或Search/Code/tool-use/alignment/RL方向有积累。',
    requirements:
      '本科及以上，计算机、人工智能、数学等相关专业；熟练PyTorch，有DeepSpeed/Megatron-LM/Ray等大规模分布式训练实战经验；顶会论文（NeurIPS/ICML/ICLR/CVPR等）为加分项。',
    source_url: 'https://www.mianshima.com/job/15/20888',
    apply_url: 'https://job.xiaohongshu.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '小红书',
    title: '小红书 REDstar Agent 应用算法工程师（创新业务）2027 校招',
    type: 'autumn_recruitment',
    city: '北京、杭州、上海',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '小红书REDstar顶尖人才计划岗位，聚焦LLM/Agent创新业务应用。要求熟悉RAG、Tool Use、Planning、Memory、Evaluation等一个或多个方向，熟练Python、PyTorch、Transformers技术栈，有相关科研、项目或实习经历者优先。',
    requirements:
      '本科及以上，计算机、人工智能、数学等相关专业，具备扎实机器学习/深度学习基础，熟悉Transformer、大语言模型基本原理。',
    source_url: 'https://www.mianshima.com/job/15/22487',
    apply_url: 'https://job.xiaohongshu.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '拼多多',
    title: '拼多多集团-PDD 2027 届服务端研发/算法工程师校招（3000+ Offer）',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      '拼多多集团-PDD 2027届校招正式启动，面向2027届（毕业时间2026年9月-2027年8月）。服务端研发工程师负责业务和平台架构设计；算法工程师利用机器学习/深度学习/图计算优化app内外搜索、推荐、广告。3000+ Offer机会，网申&内推2026年9月2日-2027年1月31日。',
    requirements:
      '2027届应届毕业生，本科及以上；获评奖评优、竞赛奖项或论文成果者可申请免技术笔试；同一批次每位同学仅1次投递机会。',
    source_url: 'https://www.zhipin.com/job_detail/47e7aeda35ad053d0nZ70969GVZR.html',
    apply_url: 'https://campus.pinduoduo.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '拼多多',
    title: '拼多多集团-PDD 2027 届仓配运营/质控/HR管培生校招',
    type: 'autumn_recruitment',
    city: '上海、成都、厦门',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      '拼多多集团-PDD面向2027届开放运营与职能类管培生岗位，含27届仓配运营管培生（成都青白江）、质控管培生（区域业务）、HR管培生（小语种/英语-上海）、物流运营管培生（上海）、运营管培生（成都）等。覆盖仓储、物流、区域运营等多业务场景。',
    requirements:
      '2027届本科及以上，专业不限；仓配/质控/运营方向需抗压能力与快速学习能力；HR管培生（小语种）需英语或小语种能力。',
    source_url: 'https://xxgc.sicau.edu.cn/info/1091/20224.htm',
    apply_url: 'https://campus.pinduoduo.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '京东',
    title: '京东 JD STAR 新星计划 2027 校园招聘（800+ Offer）',
    type: 'autumn_recruitment',
    city: '北京、上海、广州、深圳、成都、武汉、杭州',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      'JD STAR新星计划是京东集团自2015年启动的长期人才发展项目，面向2027届本科、硕博研究生（毕业时间2026年10月1日-2027年9月30日）。岗位方向涵盖采销、物流、技术、产品、运营、设计、健康、工程、职能、保险与金融、市场与商务等11个方向。网申8月3日-11月30日，今年首次引入AI面试。',
    requirements:
      '2027届本科及以上，海内外院校均以毕业证时间为准；通过简历筛选后1天内收到测评通知；TGT管理培训生与JD YOUNG实习生计划可同步投递。',
    source_url: 'https://jy.buu.edu.cn/art/2026/11/11/art_29313_840903.html',
    apply_url: 'https://campus.jd.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '字节跳动',
    title: '字节跳动 Data 2027 届秋招（搜索/广告/推荐/多模态算法）',
    type: 'autumn_recruitment',
    city: '北京、上海、杭州、深圳、成都、广州',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '字节跳动Data 2027届秋招正式启动，面向2027届（毕业时间2026年9月-2027年8月）。热招搜索/广告/推荐模型算法、机器学习、AI Infra、多模态、语音、计算机视觉、自然语言处理、推荐/搜索/广告架构、前端、后端、客户端、运维、存储、硬件、数据库、测试开发、AI产品、数据科学等岗位。',
    requirements:
      '2027届本科及以上，IT/技术类、人工智能类岗位需扎实的算法与工程基础；网申2026年9月22日起，长期有效。',
    source_url: 'https://miaoruzhi.com/recruitment/1af20868-8d35-4dfd-97fc-9865af680dd8',
    apply_url: 'https://jobs.bytedance.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '快手',
    title: '快手 社科线-推荐模型算法工程师 2027 校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '快手社科线推荐模型算法工程师，负责生成与排序模型中心（支撑快手国内与海外Kwai短视频推荐系统），深耕生成式推荐、模型参数与用户行为序列scaling、用户长期价值建模LLM4REC等前沿技术；营收模型中心持续优化电商、直播、广告投放及用户增长等核心营收场景模型。',
    requirements:
      '2027届硕士及以上，精通C/C++、Python，熟悉大模型算法、强化学习、推荐算法；招聘截止2026年11月30日。',
    source_url: 'https://www.zhipin.com/job_detail/2c05cf72163414bd0nJ_39m_EVVR.html',
    apply_url: 'https://zhaopin.kuaishou.cn',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: 'Shopee',
    title: 'Shopee 算法工程师-AIGC基模方向 2027 秋招（深圳）',
    type: 'autumn_recruitment',
    city: '深圳',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      'Shopee 2027届秋招算法工程师-AIGC基模方向，参与图像/视频生成基础大模型研发，负责模型架构设计、预训练、后训练及算法优化；参与训练体系建设（数据管道、数据质量、评测体系）；参与大规模生成模型预训练infra建设，持续优化训练与推理效率；跟踪AIGC与多模态大模型前沿技术。',
    requirements:
      '2027届应届毕业生，计算机、人工智能、数学等相关专业硕士及以上；熟悉Transformer、Diffusion、Flow Matching等技术，具备机器学习/深度学习扎实基础。',
    source_url: 'https://www.zhipin.com/job_detail/2d8d88d01b60c4d20nx92ty6F1dR.html',
    apply_url: 'https://careers.shopee.sg/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '水滴公司',
    title: '水滴 AI全栈工程师（人才专项）2027 校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网/保险科技',
    cohort: '2027届',
    responsibilities:
      '水滴公司AI全栈工程师人才专项，面向AI重度用户与动手实践者。期望深度使用AI编程工具、主动研究AI如何改变开发/解题方式；搭建Agent/工作流/自动化应用并做成可运行作品；独立负责完整项目或创业经历；有技术竞赛获奖、技术文章或开源项目贡献。',
    requirements:
      '2027届本科及以上，计算机相关专业；全栈项目经验，招聘截止2026年12月31日。',
    source_url: 'https://www.zhipin.com/job_detail/7fff5158470521da0nJ93dm0FFpU.html',
    apply_url: 'https://jobs.waterdrop-inc.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: 'SHEIN',
    title: 'SHEIN 2027 届商品平台类岗位（买手/服装设计/商品企划）校招',
    type: 'autumn_recruitment',
    city: '广州、南京、深圳、上海、佛山、江门、肇庆',
    industry: '电子商务/跨境电商',
    cohort: '2027届',
    responsibilities:
      'SHEIN 2027届校招商品平台类岗位，含买手（女装/童装/男装/内睡）、服装设计（女装/童装）、商品企划。同期开放信息技术类（算法、Agent开发、Java开发、APP开发、产品、数据分析）、服装供应链类（供应商管理、服装质量、服装工程、面辅料开发/跟单、外贸跟单、招商）、国际物流与仓储类、全球运营类（管培生、商家运营、KOL营销、平台运营）等。',
    requirements:
      '2027届毕业生（毕业时间2026年9月1日-2027年8月31日）；每位同学3次投递机会，岗位招满即关；9月4日起投递。',
    source_url: 'https://careers.shein.cn',
    apply_url: 'https://careers.shein.cn/Students-&-Graduates',
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
