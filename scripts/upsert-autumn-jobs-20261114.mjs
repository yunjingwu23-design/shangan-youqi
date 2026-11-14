// 秋招信息更新脚本（2026-11-14）：搜索最新秋招岗位并 upsert 到 job_catalog 表
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

// 本次新增的结构化秋招岗位数据（具体岗位级，与已有记录不重复）
const jobs = [
  {
    company: 'TikTok Shop',
    title: 'TikTok Shop 东南亚电商运营管培生计划 2027 校招',
    type: 'autumn_recruitment',
    city: '深圳、上海',
    industry: '电子商务/跨境电商',
    cohort: '2027届',
    responsibilities:
      'TikTok Shop 2027校招东南亚电商运营管培生计划，为高潜新人打造的东南亚电商运营管培项目，在高速迭代的电商生态中锤炼商业判断、数据分析与运营能力，完成轮岗后定岗东南亚电商关键岗位，未来成长为业务、运营、战略方向管理人才。与跨境电商运营管培生「起航计划」并行的另一条运营主线。',
    requirements:
      '2027届应届毕业生，优秀的英语沟通能力，对国际电商业务充满热情；网申时间2026年9月20日-11月17日。',
    source_url: 'https://campus.niuqizp.com/job-v8s5nnzCL.html',
    apply_url: 'https://jobs.bytedance.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: 'TikTok Shop',
    title: 'TikTok Shop AI产品线 2027 秋招（AI商家/AI商品/AI营销产品等）',
    type: 'autumn_recruitment',
    city: '深圳、上海',
    industry: '电子商务/跨境电商',
    cohort: '2027届',
    responsibilities:
      'TikTok Shop 2027校招AI产品线，覆盖AI商家产品、AI商品产品、AI营销导购产品、AI达人直播产品、AI商家资金产品、搜索推荐产品、开放平台产品等多条产品方向，围绕电商交易链路多点布局，推动AI能力融入商家运营、内容生产与智能导购等关键环节。',
    requirements:
      '2027届应届毕业生，具备产品思维、数据理解或技术理解，关注AI在电商场景落地；网申时间2026年9月20日-11月17日。',
    source_url: 'https://www.wondercv.com/xiaozhao/tiktok-shop-27-autumn-campus-16153-14f292/',
    apply_url: 'https://jobs.bytedance.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '快手',
    title: '快手 视频生成算法研究员/多模态理解算法 2027 校招',
    type: 'autumn_recruitment',
    city: '深圳、上海、北京',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '快手2027校招AIGC算法方向，含视频生成算法研究员（从事视频AIGC领域算法探索与落地，基础模型框架设计与预训练，重点解决低成本、高品质生成与可控编辑）、多模态理解算法研究员、音频/音乐AIGC算法工程师、视频生成强化学习算法工程师等岗位。',
    requirements:
      '2027届硕士及以上，计算机和数学相关专业，数理基础扎实；视频生成方向招聘截止2026年11月27日。',
    source_url: 'https://www.zhipin.com/job_detail/ad860f30d01a74640nJ80t-7GVJR.html',
    apply_url: 'https://zhaopin.kuaishou.cn',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '小红书',
    title: '小红书平台部 2027 校招（公共事务/安全运营/公共品牌）',
    type: 'autumn_recruitment',
    city: '北京、上海',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '小红书平台部2027秋季校园招聘，含公共事务校招生（追踪宏观政策与行业法规、输出分析简报与策略建议、参与面向机构与公众的沟通实践）、安全运营校招生（制定内容安全策略、搭建专项指标体系、分析行业政策与商业业务流程）、公共品牌与公众沟通校招生（通过媒体渠道宣传公司品牌与业务、策划精品传播）。',
    requirements:
      '2027届应届毕业生，专业不限，公共管理、社会学、法学、新闻传播、经济学、政治学等相关专业优先；有政策研究、公关、媒体、内容治理相关实习经验者优先。',
    source_url: 'https://job.xjtu.edu.cn/f/recruitmentinfo/show?recruitmentId=5339b090080a4eaab02702061de7ad9f',
    apply_url: 'https://job.xiaohongshu.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: 'Shopee',
    title: 'Shopee 研发类- Agent开发/AI基础设施研发工程师 2027 秋招',
    type: 'autumn_recruitment',
    city: '深圳、北京、上海',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      'Shopee 2027秋季校园招聘研发类岗位，含Agent开发工程师、AI基础设施研发工程师、AI训练/推理框架工程师、大数据开发工程师、Android/iOS开发工程师、SRE运维工程师、信息安全工程师、AI数据运营工程师等。招聘100人，每人仅可选择并投递1个志愿岗位。',
    requirements:
      '2027届毕业生，毕业时间2026年9月1日-2027年8月31日；本科及以上；研发类部分岗位笔试为AI Coding；网申2026年7月28日-11月30日。',
    source_url: 'https://24365.ah.smartedu.cn/Job.html?jid=324270',
    apply_url: 'https://app.mokahr.com/su/nykvgs',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '百度',
    title: '百度 AIDU 人才计划/管培生计划 2027 校招（全年开放）',
    type: 'autumn_recruitment',
    city: '北京、上海、深圳、广州、杭州',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '百度2027届校园招聘AIDU计划与管培生计划。AIDU计划2018年启动，以攻克AI领域前瞻性与突破性难题为核心使命，面向全球招募具备顶尖技术潜力的校园人才；管培生计划由百度集团高管亲自选、亲自带，培养AI时代科技创新企业的新一代年轻管理者。AI相关岗位占比超90%，覆盖大模型算法、智能体算法、AI Infra研发、自动驾驶算法、Agent Harness研发等。',
    requirements:
      '2027届毕业生（毕业时间2026年9月-2027年8月）；网申及内推2026年7月9日-2027年6月，全年开放，支持无限次投递；常规校园招聘、AIDU、管培生项目互不冲突。',
    source_url: 'https://talent.baidu.com/jobs/trend',
    apply_url: 'https://talent.baidu.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '水滴公司',
    title: '水滴 2027 届秋招 80 人（AI/技术/产品/运营/商分战略等）',
    type: 'autumn_recruitment',
    city: '北京、深圳、西安',
    industry: '互联网/保险科技',
    cohort: '2027届',
    responsibilities:
      '水滴公司2027届秋季校园招聘，招聘80人，开放AI类、技术类、产品类、运营类、商分战略类、职能类、金融类、保险产业类、销售客服类等岗位。水滴是中国领先的保险科技和医疗健康平台，旗下业务包括水滴筹、水滴保、深蓝保、翼帆医药、水滴金融等，2026年从使用AI的科技公司进化为AI原生的科技公司。',
    requirements:
      '毕业时间2026年1月-2027年12月的海内外应届毕业生，本科及以上，专业不限；简历投递截止2026年12月30日。',
    source_url: 'https://jy.scu.edu.cn/index/index/employjobdetail.html?data=MDAwMDAwMDAwMJG6n3_Ed6imi4qQtLh4Y5WKuLa2s4bddricp9CWi5qikaeWacSdqLqGfaK2w4iil5C4zNbGiL-E',
    apply_url: 'https://jobs.waterdrop-inc.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '腾讯音乐',
    title: '腾讯音乐 2027 技术大咖计划（后端/算法/数据/产品等）',
    type: 'autumn_recruitment',
    city: '深圳、北京、广州',
    industry: '互联网/音乐娱乐',
    cohort: '2027届',
    responsibilities:
      '腾讯音乐娱乐集团2027技术大咖计划全球启动，招募技术、运营、市场、产品及创意人才。岗位涵盖后端开发、数据、交互/设计、人工智能/算法、研发工程师、内容运营、用户运营、市场运营等方向。腾讯音乐旗下有QQ音乐、酷狗音乐、酷我音乐、全民K歌等产品，累计月活跃用户超8亿。',
    requirements:
      '本科及以上应届毕业生；网申时间2026年7月17日-9月17日（技术大咖计划）；不设置统一网申截止，采用招满即止。',
    source_url: 'https://campus.niuqizp.com/job-vkU5znZ5N.html',
    apply_url: 'https://join.qq.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
  },
  {
    company: '淘天集团',
    title: '淘天集团 AI 智能决策算法工程师 2027 届校招',
    type: 'autumn_recruitment',
    city: '杭州、北京',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      '淘天集团2027届应届生招聘算法工程师-AI智能决策方向，参与AI智能决策核心引擎的算法创新与落地，面向权益激励、货品优惠定价、广告出价、搜索/推荐流量机制等通用场景；通过因果推断建模、运筹决策算法、出价/流量机制策略等技术创新，探索生成式权益、LLMxUplift、AI Agent智能决策等方向。AI技术类岗位占比超90%。',
    requirements:
      '毕业时间2026年11月-2027年10月；每位同学可投递两个志愿岗位，仅有一次投递机会；网申2026年8月5日-11月，截止2026年11月30日。',
    source_url: 'https://www.chaojijianli.com/xiaozhao/taotian-group-ai-algorithm-engineer-2027-12345-eb5650',
    apply_url: 'https://talent.taotian.com',
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
