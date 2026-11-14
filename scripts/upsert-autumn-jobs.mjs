// 秋招信息更新脚本：搜索最新秋招岗位并 upsert 到 job_catalog 表
import { createClient } from '@supabase/supabase-js';

import fs from 'node:fs';

// 密钥不入库：优先读环境变量，其次回落到项目根目录的 .env.local
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = new URL('../.env.local', import.meta.url);
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const matched = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (matched && !process.env[matched[1]]) {
        process.env[matched[1]] = matched[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://lxecahdyvrdfezgtmbfp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  console.error('缺少 SUPABASE_SERVICE_ROLE_KEY，请在 .env.local 中配置后重试。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const now = new Date().toISOString();

// 结构化秋招岗位数据（公司、岗位、类型、城市、届别、职责、面向对象、投递链接、截止、来源）
const jobs = [
  {
    company: '小红书',
    title: '小红书 大商业工程 2027 秋招（后端/前端/算法/数据/产品）',
    type: 'autumn_recruitment',
    city: '上海、北京、深圳',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '负责小红书商业化核心系统（广告投放、交易结算、商家平台）的设计与研发，方向覆盖后端开发、前端开发、客户端（iOS/Android）、算法（广告/推荐/搜索/CV/NLP）、数据开发、测试开发、商业产品经理、UX/UI 设计、商业数据分析。',
    requirements:
      '2027届应届毕业生（毕业时间 2026年9月—2027年8月），计算机、软件工程、电子工程等相关专业优先，具备扎实的计算机基础或相关专业能力，有项目/实习/竞赛经历加分。',
    source_url: 'https://www.chaojijianli.com/xiaozhao/xiaohongshu-commercial-engineering-2027-campus-20427-bb92ad',
    apply_url: 'https://campus.xiaohongshu.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2027-01-02',
  },
  {
    company: '美团',
    title: '美团 食杂零售管培生计划 2027 届校招',
    type: 'autumn_recruitment',
    city: '北京、上海、广州、深圳、杭州、成都、武汉等全国多城；海外利雅得',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '深入一线门店/仓配/供应链，做即时零售与社区零售操盘；入职后按业务拆岗：门店/物流管理储备、商品运营、招商采购、商品品质管理、物流运营；业务场景覆盖前置仓、社区超市、餐饮供应链、B端采购、C端30分钟达、海外（利雅得）业务。',
    requirements:
      '2027届境内外应届生（毕业时间 2026.11–2027.10），本科及以上，专业不限（经管/理工/供应链/食品/物流/农学/新传优先），重零售热情+抗压+学习速度，需接受全国调配。',
    source_url: 'https://job.sit.edu.cn//page/positionzp.html?type=5&wid=8bc386db44894ddabd2e55d71cee9b12',
    apply_url: 'https://campus.meituan.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '招满即止',
  },
  {
    company: 'Shopee',
    title: 'Shopee 算法工程师-供应链智能决策 2027 秋招',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      '面向电商供应链中的仓储、物流、库存、履约等业务场景，结合机器学习、预测算法、运筹优化、强化学习、大模型与AI Agent技术，探索智能决策方案，完成数据分析、模型设计、算法开发及效果验证。',
    requirements:
      '2027届硕士及以上学历，计算机、人工智能、数学、统计学、运筹学、工业工程、物流工程等相关专业优先，扎实的算法基础和问题分析能力。',
    source_url: 'https://www.zhipin.com/job_detail/d03633b8226329700nx82du6FlRV.html',
    apply_url: 'https://careers.shopee.cn',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2026-11-30',
  },
  {
    company: 'Shopee',
    title: 'Shopee 算法工程师-搜广推大模型 2027 秋招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '电子商务',
    cohort: '2027届',
    responsibilities:
      '负责海外电商产品生成式模型及基础模型研发优化，探索LLM在搜索、推荐、广告场景应用；参与统一排序模型、Semantic ID、多模态表示学习等核心算法研发；参与智能Agent、AutoResearch等AI研发工具建设。',
    requirements:
      '2027届应届毕业生，本科及以上学历，机器学习、统计、模式识别等相关专业优先，扎实掌握机器学习/深度学习基础知识，熟悉Transformer。',
    source_url: 'https://www.zhipin.com/job_detail/ffb20d21b9395e080nJ72NW8F1NW.html',
    apply_url: 'https://careers.shopee.cn',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2026-12-01',
  },
  {
    company: '拼多多',
    title: '拼多多 AI Infra研发工程师 / 大模型算法工程师 2027 校招',
    type: 'autumn_recruitment',
    city: '上海',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '负责业务和平台架构设计与研发，解决高并发、高流量、分布式环境下的技术难题；大模型算法、AI Infra、服务端研发、算法、数据分析、安全等方向；承担新技术预研与方案选型。',
    requirements:
      '2027届毕业生（毕业时间 2026年9月-2027年8月），本科及以上，扎实的数据结构和算法能力，精通至少一种开发语言。',
    source_url: 'https://m.liepin.com/lptjob/85339441',
    apply_url: 'https://careers.pinduoduo.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2027-01-31',
  },
  {
    company: '快手',
    title: '快手 AI全栈开发工程师-数据平台 2027 校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '参与快手数据中台产品全栈研发，覆盖前端交互、后端服务、数据接入与计算全链路；前端基于React/Vue构建高性能数据平台Web应用；后端基于Java/Go设计实现高并发服务，对接Hive/Spark/Flink/ClickHouse/Doris等大数据引擎。',
    requirements:
      '2027届应届生，本科及以上，熟悉React/Vue等前端框架，掌握Java/Go等后端技术栈，了解大数据引擎。',
    source_url: 'https://www.zhipin.com/job_detail/63c4822421bd2fdb0nJ80t-7F1NX.html',
    apply_url: 'https://campus.kuaishou.cn',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2026-11-27',
  },
  {
    company: '快手',
    title: '快手 策略产品经理-商业化方向 2027 校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '负责快手商业化产品策略设计与落地，覆盖品牌广告、效果广告等类型；建立数据监控体系，通过数据分析实现需求挖掘、实验、分析，完成策略产品设计。',
    requirements:
      '2027届应届生，本科及以上，具备数据敏感度与产品思维，逻辑清晰。',
    source_url: 'https://www.zhipin.com/job_detail/7d07055358d73f1f0nJ80t-6EFBQ.html',
    apply_url: 'https://campus.kuaishou.cn',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2026-11-27',
  },
  {
    company: '水滴公司',
    title: '水滴 AI Native 产品经理 2027 校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网/保险科技',
    cohort: '2027届',
    responsibilities:
      '参与水滴 AI 战略产品方向，以 AI 为默认工作方式推动产品落地，与资深AI产品/产品专家mentor协作，跨技术、运营、业务、算法多团队协同。',
    requirements:
      '2027届毕业生（毕业时间2026年1月-2027年12月），对AI产品有热情，具备产品思维与跨团队协作能力。',
    source_url: 'https://m.liepin.com/lptjob/85424599',
    apply_url: 'https://jobs.waterdrop-inc.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2027-09-07',
  },
  {
    company: '水滴公司',
    title: '水滴 AI风控策略运营（水滴保质检）2027 校招',
    type: 'autumn_recruitment',
    city: '北京',
    industry: '互联网/保险科技',
    cohort: '2027届',
    responsibilities:
      '服务管理中心核心中后台，覆盖客服、质检、风险管理、核保、理赔五大板块；借助AI大模型驱动智能质检，构建保险客诉风险捕捉与处置体系，做风险建模。',
    requirements:
      '2027届应届生，本科及以上，具备数据分析与风险策略思维。',
    source_url: 'https://www.zhipin.com/job_detail/c5d013908d89ad600nN93ty7FlFV.html',
    apply_url: 'https://jobs.waterdrop-inc.com/campus',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2026-12-31',
  },
  {
    company: '淘天集团',
    title: '淘天集团 AI开发工程师 2027 届校招（秋招）',
    type: 'autumn_recruitment',
    city: '杭州、北京',
    industry: '互联网/电商',
    cohort: '2027届',
    responsibilities:
      '构建全域智能风控体系，守护天猫超市等淘天自营生态；依托策略算法与数据洞察，在复杂交易场景中精准识别风险。技术类岗位涵盖AI应用算法/研发、AI Infra、AI Agent优化等。',
    requirements:
      '2026年11月到2027年10月毕业的学生，数据结构和算法及计算机基础扎实，熟悉Java/C++/C/Python/Scala/Go中至少一种编程语言。',
    source_url: 'https://www.zhipin.com/job_detail/7157386433c039910nVy2t--GFRR.html',
    apply_url: 'https://talent.taotian.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '招满即止',
  },
  {
    company: '影石 Insta360',
    title: '影石 Insta360 传感器研发岗 2027 届校招',
    type: 'autumn_recruitment',
    city: '深圳、长沙',
    industry: '智能硬件',
    cohort: '2027届',
    responsibilities:
      '负责传感器新项目前期调研、技术可行性分析及预研，为产品立项提供数据支持；主导新研发项目的工艺开发与优化，解决关键技术难题。',
    requirements:
      '2027届博士，传感器、微电子、电子信息等相关专业。',
    source_url: 'https://www.zhipin.com/zhaopin/0f236af85cabba751nF72d-1FQ~~/',
    apply_url: 'https://www.insta360.com/cn/jobs',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '招满即止',
  },
  {
    company: '字节跳动',
    title: '字节跳动 AI全栈工程师-飞书项目 2027 校招',
    type: 'autumn_recruitment',
    city: '杭州',
    industry: '互联网',
    cohort: '2027届',
    responsibilities:
      '参与飞书项目核心模块前后端全链路研发，端到端负责功能设计、开发、测试与上线；探索新技术，参与系统架构演进、性能与稳定性优化；以AI为默认工作方式，深度实践AI Coding。',
    requirements:
      '2027届本科及以上应届生，计算机、软件工程等相关专业优先，扎实的数据结构/算法/操作系统/网络/数据库基础，熟悉React/Vue，掌握Go/TypeScript/Java/Python等语言。',
    source_url: 'https://www.zhipin.com/job_detail/7dce72af00f0ba570nJ43N21GVRY.html',
    apply_url: 'https://jobs.bytedance.com',
    contacts: [],
    state: 'published',
    verified_at: now,
    published_at: now,
    deadline: '2027-06-30',
  },
];

async function main() {
  // 查询现有 (company, title) 做去重
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
    // 移除 deadline 临时字段（表中无此列，deadline 归入 title 或忽略）
    const { deadline, ...payload } = job;
    // 确保 contacts 是数组
    payload.contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
    toInsert.push(payload);
  }

  if (toInsert.length === 0) {
    console.log('无新增岗位，全部已存在。');
    if (skipped.length) console.log('已存在(跳过):', skipped.join(' / '));
    return;
  }

  const { data, error } = await supabase
    .from('job_catalog')
    .upsert(toInsert, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    console.error('写入失败:', error.message, error.details);
    process.exit(1);
  }

  console.log(`成功写入 ${toInsert.length} 条新岗位：`);
  toInsert.forEach((j) => console.log(` - [${j.company}] ${j.title}`));
  if (skipped.length) console.log('\n已存在(跳过):', skipped.join(' / '));
}

main();
