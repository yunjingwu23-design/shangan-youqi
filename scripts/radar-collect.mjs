/**
 * 面经雷达 · 每日采集脚本（2026-11-11）
 *
 * 用途：每天从「公开可直接访问」的页面上发现新的面经帖，抽取索引信息 + 原创归纳，
 * 写入 Supabase，供 /resources/radar 展示。
 *
 * 合规红线（与 docs/INTERVIEW_RADAR.md 一致）：
 *   1. 只请求匿名即可访问的页面，不登录、不破解、不碰私有接口、不做反爬对抗。
 *   2. 只保存索引信息（标题/来源/链接/作者/时间）+ 平台自带的分享摘要片段（≤400 字），
 *      不保存、不转载全文。
 *   3. AI 只做「基于给定摘录」的归纳，禁止推断原文没有的信息；拿不准就留空。
 *   4. 抓不到正文/摘要的页面，只登记索引、标记 pending_verification，不编造面经。
 *
 * 用法：
 *   node scripts/radar-collect.mjs                  # 默认：牛客公开列表发现 + 入库
 *   node scripts/radar-collect.mjs --limit 8        # 本次最多入库 8 篇
 *   node scripts/radar-collect.mjs --dry            # 只抓取不写库
 *   node scripts/radar-collect.mjs --candidates c.json
 *      其中 c.json = [{"url":"https://...","platform":"知乎"}, ...]
 *      （供定时任务把搜索引擎发现的候选链接一起送进来）
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---------------------------------------------------------------- env
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  } catch {}
  // 显式注入的环境变量优先（云端沙箱 / CI 没有 .env.local，靠 process.env 传入）
  return { ...env, ...process.env };
}
const env = loadEnv();
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE_KEY) {
  console.error('缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(SUPA_URL, SERVICE_KEY, { auth: { persistSession: false } });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// ---------------------------------------------------------------- cli
const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(`--${name}`);
}
function opt(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const DRY = flag('dry');
const LIMIT = Number(opt('limit', '12'));
const CANDIDATES_FILE = opt('candidates', '');

/**
 * 运行日志：定时任务跑没跑、跑到哪一步、为什么失败，全看这个文件。
 * 路径：<项目根>/logs/radar-collect.log（追加写，不覆盖）
 */
const LOG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'logs');
const LOG_FILE = resolve(LOG_DIR, 'radar-collect.log');
function logRun(line) {
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    const ts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
    appendFileSync(LOG_FILE, `[${ts}] ${line}\n`, 'utf8');
  } catch {
    /* 日志写不进去不影响采集 */
  }
}

// ---------------------------------------------------------------- 常量
const ROLE_CATEGORIES = [
  'product_manager', 'operations', 'procurement', 'marketing', 'backend_dev',
  'frontend_dev', 'algorithm', 'data_analysis', 'finance', 'audit', 'consulting',
  'human_resources', 'supply_chain', 'other',
];
const ROUNDS = [
  'written_test', 'ai_interview', 'online_assessment', 'group_interview', 'first_round',
  'second_round', 'third_round', 'professional_round', 'hr_round', 'final_round', 'other',
];
const QUESTION_CATEGORIES = [
  'self_intro', 'internship_experience', 'project_deep_dive', 'industry_knowledge',
  'professional_knowledge', 'behavioral', 'situational', 'case_interview', 'technical',
  'motivation', 'other',
];
const RECRUITMENT = [
  'daily_internship', 'conversion_internship', 'autumn_recruitment', 'spring_recruitment',
  'undetermined',
];
const DIFFICULTY_LABELS = { easy: '简单', medium: '中等', hard: '困难' };

const PLATFORMS = [
  [/nowcoder\.com/i, '牛客网'],
  [/(^|\.)zhihu\.com/i, '知乎'],
  [/xiaohongshu\.com|xhslink\.com/i, '小红书'],
  [/maimai\.cn/i, '脉脉'],
  [/juejin\.cn/i, '掘金'],
  [/csdn\.net/i, 'CSDN'],
  [/bilibili\.com/i, 'Bilibili'],
  [/(^|\.)v2ex\.com/i, 'V2EX'],
  [/segmentfault\.com/i, '思否'],
  [/cnblogs\.com/i, '博客园'],
  [/jianshu\.com/i, '简书'],
  [/douban\.com/i, '豆瓣'],
  [/weibo\.(com|cn)/i, '微博'],
];

function platformOf(url) {
  try {
    const host = new URL(url).hostname;
    for (const [re, name] of PLATFORMS) if (re.test(host)) return name;
  } catch {}
  return '其他公开网页';
}

// ---------------------------------------------------------------- 抓取
async function fetchPublic(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) return { ok: false, status: res.status, html: '' };
    return { ok: true, status: res.status, html: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, html: '', error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(s) {  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}
function cleanText(s) {
  return decodeEntities(String(s || ''))
    .replace(/\s+/g, ' ')
    .trim();
}
function metaOf(html, key) {
  const pats = [
    new RegExp(`property=["']${key}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`name=["']${key}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`content=["']([^"']*)["']\\s+property=["']${key}["']`, 'i'),
    new RegExp(`content=["']([^"']*)["']\\s+name=["']${key}["']`, 'i'),
  ];
  for (const p of pats) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return '';
}

function fingerprint(title, id) {
  return createHash('sha256')
    .update(`${title}|${id}`.toLowerCase().normalize('NFKC'))
    .digest('hex')
    .slice(0, 64);
}

// ---------------------------------------------------------------- 发现
const NOWCODER_LIST_URLS = [
  'https://www.nowcoder.com/discuss?type=1',
  'https://www.nowcoder.com/discuss?type=2',
  'https://www.nowcoder.com/discuss?type=3',
  'https://www.nowcoder.com/discuss?type=7',
];

// 牛客对同一 IP 的高频请求会返回「空壳页」（约 5KB，无帖子链接），
// 需要重试直到拿到服务端渲染的完整页面。
async function fetchListPage(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetchPublic(url);
    if (res.ok && /\/discuss\/\d{6,}/.test(res.html)) return res;
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 1200));
  }
  return { ok: false, status: 0, html: '' };
}

async function fetchPostPage(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetchPublic(url);
    if (res.ok && metaOf(res.html, 'og:title')) return res;
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 900));
  }
  return { ok: false, status: 0, html: '' };
}

async function discoverNowcoder() {
  const ids = [];
  const seen = new Set();
  for (const url of NOWCODER_LIST_URLS) {
    const { ok, status, html } = await fetchListPage(url);
    if (!ok) {
      console.warn(`  列表页抓取失败 ${url} → HTTP ${status}（多次重试仍为空壳页）`);
      continue;
    }
    for (const m of html.matchAll(/\/discuss\/(\d{6,})/g)) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids.map((id) => ({
    url: `https://www.nowcoder.com/discuss/${id}`,
    platform: '牛客网',
    platformPostId: id,
  }));
}

// ---------------------------------------------------------------- 多平台发现
// 只使用各站「匿名可访问的公开搜索/列表接口」，不登录、不带 Cookie、不破解签名。
// 拿到的候选统一成 { url, platform, platformPostId, title?, excerpt?, publishedAt? }，
// 带 title+excerpt 的平台（掘金/CSDN/V2EX）直接入库，其余按需抓详情页的 og 信息。
const SEARCH_TERMS = ['面经', '秋招 面试 一面', '实习 面试 面经'];

async function fetchJson(url, tries = 2) {
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
        signal: ctrl.signal,
      });
      if (res.ok) return await res.json();
    } catch {
      /* 重试 */
    } finally {
      clearTimeout(timer);
    }
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

function uniqByUrl(list) {
  const seen = new Set();
  return list.filter((c) => (c && c.url && !seen.has(c.url) ? (seen.add(c.url), true) : false));
}

/** 掘金：公开搜索接口，直接给标题 + 摘要，质量最好 */
async function discoverJuejin() {
  const out = [];
  for (const term of SEARCH_TERMS) {
    const j = await fetchJson(
      `https://api.juejin.cn/search_api/v1/search?query=${encodeURIComponent(term)}&id_type=0&cursor=0&limit=10&search_type=0`
    );
    for (const it of j?.data || []) {
      const a = it?.result_model?.article_info;
      if (!a?.article_id) continue;
      out.push({
        url: `https://juejin.cn/post/${a.article_id}`,
        platform: '掘金',
        platformPostId: String(a.article_id),
        title: cleanText(a.title),
        excerpt: cleanText(a.brief_content || ''),
        publishedAt: a.ctime ? new Date(Number(a.ctime) * 1000).toISOString() : null,
      });
    }
  }
  return uniqByUrl(out);
}

/** CSDN：公开搜索接口，url 带一堆跟踪参数，去掉 query 再存 */
async function discoverCsdn() {
  const out = [];
  for (const term of SEARCH_TERMS) {
    const j = await fetchJson(
      `https://so.csdn.net/api/v3/search?q=${encodeURIComponent(term)}&t=blog&p=1`
    );
    for (const it of j?.result_vos || []) {
      const url = String(it.url || '').split('?')[0];
      if (!/^https:\/\/blog\.csdn\.net\//.test(url)) continue;
      out.push({
        url,
        platform: 'CSDN',
        platformPostId: String(it.articleid || url.match(/details\/(\d+)/)?.[1] || ''),
        title: cleanText(String(it.title || '').replace(/<\/?em>/g, '')),
        excerpt: cleanText(String(it.description || it.digest || '').replace(/<\/?em>/g, '')),
        publishedAt: it.create_time ? new Date(Number(it.create_time)).toISOString() : null,
      });
    }
  }
  return uniqByUrl(out);
}

/** V2EX：公开 API，求职节点 */
async function discoverV2ex() {
  const j = await fetchJson('https://www.v2ex.com/api/topics/show.json?node_name=jobs');
  return (j || []).map((t) => ({
    url: t.url || `https://www.v2ex.com/t/${t.id}`,
    platform: 'V2EX',
    platformPostId: String(t.id),
    title: cleanText(t.title),
    excerpt: cleanText(t.content || '').slice(0, 600),
    publishedAt: null,
  }));
}

/** 思否：搜索页是 SSR 的，先只取文章链接，标题交给详情页的 og:title */
async function discoverSegmentfault() {
  const out = [];
  for (const term of SEARCH_TERMS.slice(0, 2)) {
    const { ok, html } = await fetchPublic(
      `https://segmentfault.com/search?q=${encodeURIComponent(term)}`
    );
    if (!ok) continue;
    for (const m of html.matchAll(/href="\/a\/(\d{10,})"/g)) {
      out.push({
        url: `https://segmentfault.com/a/${m[1]}`,
        platform: '思否',
        platformPostId: m[1],
      });
    }
  }
  return uniqByUrl(out);
}

/**
 * 各平台轮流取，避免一次运行把配额全花在牛客上；
 * 同一平台内按发布时间倒序（新面经优先，没有时间的排后面）。
 */
function interleave(groups, perPlatformCap = 10) {
  const prepared = groups.map((g) =>
    [...g]
      .sort((a, b) => {
        const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return tb - ta;
      })
      .slice(0, perPlatformCap)
  );
  const out = [];
  const idx = new Array(prepared.length).fill(0);
  let more = true;
  while (more) {
    more = false;
    for (let i = 0; i < prepared.length; i++) {
      if (idx[i] < prepared[i].length) {
        out.push(prepared[i][idx[i]++]);
        more = true;
      }
    }
  }
  return out;
}

async function harvestCandidates() {
  const discoverers = [
    ['牛客网', discoverNowcoder],
    ['掘金', discoverJuejin],
    ['CSDN', discoverCsdn],
    ['V2EX', discoverV2ex],
    ['思否', discoverSegmentfault],
  ];
  const groups = [];
  for (const [name, fn] of discoverers) {
    try {
      const list = uniqByUrl(await fn());
      console.log(`  ${name}：${list.length} 条候选`);
      groups.push(list);
    } catch (e) {
      console.warn(`  ${name} 发现失败：${e.message}`);
    }
  }
  return interleave(groups);
}

function loadCandidates() {  if (!CANDIDATES_FILE || !existsSync(CANDIDATES_FILE)) return [];
  try {
    const raw = JSON.parse(readFileSync(CANDIDATES_FILE, 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.candidates || [];
    return list
      .map((it) => (typeof it === 'string' ? { url: it } : it))
      .filter((it) => it && /^https:\/\//.test(it.url))
      .map((it) => ({ ...it, platform: it.platform || platformOf(it.url) }));
  } catch (e) {
    console.warn('候选文件解析失败：', e.message);
    return [];
  }
}

// ---------------------------------------------------------------- 关键词兜底
const COMPANY_MAP = [
  ['字节跳动', /字节|bytedance|抖音|tiktok/i],
  ['腾讯', /腾讯|tencent|鹅厂|wxg|ieg|csig|pcg/i],
  ['阿里巴巴', /阿里|alibaba|淘宝|天猫|淘天|饿了么|支付宝|蚂蚁/i],
  ['百度', /百度|baidu/i],
  ['美团', /美团|meituan/i],
  ['京东', /京东|jingdong|jd\.com/i],
  ['拼多多', /拼多多|pdd/i],
  ['快手', /快手|kuaishou/i],
  ['网易', /网易|netease|网易雷火|网易游戏/i],
  ['华为', /华为|huawei|海思/i],
  ['小米', /小米|xiaomi/i],
  ['滴滴', /滴滴|didi/i],
  ['小红书', /小红书|rednote|xhs/i],
  ['哔哩哔哩', /b站|哔哩|bilibili/i],
  ['携程', /携程|trip\.com|ctrip/i],
  ['米哈游', /米哈游|miHoYo/i],
  ['影石Insta360', /影石|insta360/i],
  ['水滴', /水滴/i],
  ['理想汽车', /理想汽车|理想\b/i],
  ['蔚来', /蔚来|nio/i],
  ['比亚迪', /比亚迪|byd/i],
  ['大疆', /大疆|dji/i],
  ['科大讯飞', /讯飞|iflytek/i],
  ['商汤', /商汤|sensetime/i],
  ['中兴', /中兴|zte/i],
  ['中国移动', /中国移动|移动研究院/i],
  ['国家电网', /国家电网/i],
  ['招商银行', /招商银行|招行/i],
  ['中国平安', /平安|pingan/i],
  ['德勤', /德勤|deloitte/i],
  ['普华永道', /普华永道|pwc/i],
  ['安永', /安永|\bey\b/i],
  ['毕马威', /毕马威|kpmg/i],
  ['海尔', /海尔|haier/i],
  ['美的', /美的集团|\bmidea\b/i],
  ['格力', /格力|gree/i],
  ['联想', /联想|lenovo/i],
  ['顺丰', /顺丰|sf express|sf科技/i],
  ['中国电信', /中国电信|天翼云/i],
  ['中国联通', /中国联通|联通/i],
  ['中国移动', /中国移动|移动研究院|咪咕/i],
  ['海康威视', /海康|hikvision/i],
  ['大华', /大华股份|dahua/i],
  ['OPPO', /oppo/i],
  ['vivo', /vivo/i],
  ['荣耀', /荣耀终端|honor/i],
  ['传音', /传音|transsion/i],
  ['美图', /美图|meitu/i],
  ['涂鸦智能', /涂鸦|tuya/i],
  ['地平线', /地平线|horizon robotics/i],
  ['寒武纪', /寒武纪|cambricon/i],
  ['摩尔线程', /摩尔线程|moore threads/i],
  ['智谱', /智谱|zhipu|glm/i],
  ['月之暗面', /月之暗面|moonshot|kimi/i],
  ['MiniMax', /minimax/i],
  ['宇树科技', /宇树|unitree/i],
  ['银河通用', /银河通用|galbot/i],
  ['傅利叶', /傅利叶|fourier/i],
  ['追觅', /追觅|dreame/i],
  ['石头科技', /石头科技|roborock/i],
  ['旷视', /旷视|megvii/i],
  ['云从', /云从|cloudwalk/i],
  ['第四范式', /第四范式|4paradigm/i],
  ['浪潮', /浪潮|inspur/i],
  ['用友', /用友|yonyou/i],
  ['金蝶', /金蝶|kingdee/i],
  ['汇丰', /汇丰|hsbc/i],
  ['中信证券', /中信证券/i],
  ['中金', /中金公司|cicc/i],
  ['华泰证券', /华泰证券/i],
  ['字节跳动', /字节|bytedance|抖音|tiktok|今日头条/i],
];

const ROLE_MAP = [
  ['algorithm', /算法|机器学习|深度学习|大模型|llm|nlp|cv|推荐|搜索|ai工程/i, '算法工程师'],
  ['backend_dev', /后端|服务端|java|golang|go开发|c\+\+|后台开发/i, '后端开发'],
  ['frontend_dev', /前端|react|vue|h5|web开发/i, '前端开发'],
  ['data_analysis', /数据分析|数分|数据科学|bi\b/i, '数据分析'],
  ['product_manager', /产品经理|产品岗|产品策划|pm\b/i, '产品经理'],
  ['operations', /运营|内容运营|用户运营|电商运营/i, '运营'],
  ['marketing', /市场营销|品牌|广告|增长/i, '市场'],
  ['human_resources', /人力资源|hr\b|招聘|组织发展/i, 'HR'],
  ['finance', /金融|投研|行研|固收|量化/i, '金融'],
  ['audit', /审计|风控|合规/i, '审计'],
  ['consulting', /咨询|战略|顾问/i, '咨询'],
  ['supply_chain', /供应链|采购|物流|计划/i, '供应链'],
  ['procurement', /采购/i, '采购'],
];

const NOISE_RE = /(招聘公告|内推码|简历模板|培训班|课程推荐|广告|代写|买卖真题|求面经|搜集面经|面经汇总贴|有偿收|题库出售)/i;
const RELEVANT_RE = /(面经|面试|笔试|真题|凉经|一面|二面|三面|终面|hr面|offer|秋招|春招|实习)/i;
// 真正收进「面经」的强信号：标题或平台关键词必须指向面试记录本身。
// 只写「offer/开奖/时间线/速成指南」的帖子不算面经，避免把求职分享当面试题。
const INTERVIEW_RE = /(面经|面试|真题|凉经|笔试|一面|二面|三面|终面)/i;

// ---------------------------------------------------------------- AI 归纳
function aiConfig() {
  const provider = (env.AI_PROVIDER || '').toLowerCase();
  if (provider === 'hunyuan' && env.HUNYUAN_API_KEY) {
    return {
      base: 'https://api.hunyuan.cloud.tencent.com/v1',
      key: env.HUNYUAN_API_KEY,
      model: env.HUNYUAN_MODEL || 'hunyuan-turbos-latest',
    };
  }
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    return {
      base: 'https://api.openai.com/v1',
      key: env.OPENAI_API_KEY,
      model: env.OPENAI_REVIEW_MODEL || 'gpt-4.1-mini',
    };
  }
  return {
    base: 'https://api.deepseek.com',
    key: env.DEEPSEEK_API_KEY || '',
    model: env.DEEPSEEK_MODEL || 'deepseek-flash',
  };
}

const AI_SYSTEM = `你是面经信息结构化助手。你只会拿到帖子的标题、平台关键词、平台分享摘要（都不是完整正文）。
任务：基于这些有限信息做结构化归纳。硬性规则：
1. 只能使用给定材料中明确出现的信息，绝不推断、补充、编造。
2. 公司、岗位、招聘类型、轮次、面试题、难度、结果，材料没写就返回 null 或空数组。
3. summary 是你自己的客观归纳，固定按「面试背景 → 面试流程 → 考察重点」三段写（每段 1-2 句，合计 150-260 字），不得照抄原文长段落，不得虚构细节；材料缺少某段就省略该段。
4. questions 只收材料里明确以提问形式出现的内容；无法确认是真实面试题时 confidence 填 "inferred"。
5. difficulty 只在材料明确体现难度时填 easy/medium/hard，否则 null；result 只在作者明确公开结果时填（如「已通过」「未通过」「已录用」「进行中」），否则 null。
6. tags 用 3-6 个短标签（如「无八股」「手撕代码」「压力面」），材料不支持就少给。
7. 只输出 JSON 对象，不要 markdown 代码块，不要解释。

JSON 结构：
{"is_interview_post":boolean,"company":string|null,"job_role":string|null,"role_category":"${ROLE_CATEGORIES.join('|')}","recruitment_type":"${RECRUITMENT.join('|')}","cohort":string|null,"rounds":["${ROUNDS.join('"|"')}"],"questions":[{"text":string,"category":"${QUESTION_CATEGORIES.join('|')}","confidence":"verified|pending|inferred","round":"${ROUNDS.join('|')}"}],"summary":string,"difficulty":"easy|medium|hard"|null,"result":string|null,"tags":[string],"reason":string}`;

function parseJsonLoose(text) {
  let s = String(text || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) s = fence[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

async function aiStructure({ title, keywords, excerpt }) {
  const cfg = aiConfig();
  if (!cfg.key) return { error: '未配置 AI Key' };
  const user = `标题：${title}\n平台关键词：${keywords || '（无）'}\n平台分享摘要：${excerpt || '（无）'}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: AI_SYSTEM },
          { role: 'user', content: user },
        ],
        max_tokens: 1800,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { error: `AI HTTP ${res.status}` };
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '';
    if (!content) return { error: 'AI 返回空内容' };
    return { data: parseJsonLoose(content) };
  } catch (e) {
    return { error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- 入库辅助
async function ensureSource(name) {
  const { data } = await db.from('interview_sources').select('id').eq('name', name).maybeSingle();
  if (data) return data.id;
  const { data: created } = await db
    .from('interview_sources')
    .insert({
      name,
      source_type: name === '其他公开网页' ? 'other' : 'community',
      supported_methods: ['public_index', 'manual_import'],
      authorization_status: 'manual_only',
      active: true,
    })
    .select('id')
    .single();
  return created?.id ?? null;
}

async function ensureCompany(name) {
  const clean = cleanText(name).slice(0, 100);
  if (!clean) return null;
  const { data } = await db.from('companies').select('id').eq('name', clean).maybeSingle();
  if (data) return data.id;
  const { data: created, error } = await db
    .from('companies')
    .insert({ name: clean, verified_status: 'unverified' })
    .select('id')
    .single();
  if (error) return null;
  return created.id;
}

async function ensureRole(companyId, name, category) {
  const clean = cleanText(name).slice(0, 100);
  if (!clean) return null;
  const cat = ROLE_CATEGORIES.includes(category) ? category : 'other';
  const { data } = await db
    .from('job_roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', clean)
    .maybeSingle();
  if (data) return data.id;
  const { data: created, error } = await db
    .from('job_roles')
    .insert({ company_id: companyId, name: clean, category: cat, custom: true })
    .select('id')
    .single();
  if (error) return null;
  return created.id;
}

async function alreadyKnown(sourceId, postId, url, fprint) {
  if (postId) {
    const { data } = await db
      .from('interview_source_records')
      .select('id')
      .eq('source_id', sourceId)
      .eq('platform_post_id', postId)
      .limit(1);
    if (data?.length) return true;
  }
  if (url) {
    const { data } = await db
      .from('interview_source_records')
      .select('id')
      .eq('normalized_url', url)
      .limit(1);
    if (data?.length) return true;
  }
  if (fprint) {
    const { data } = await db
      .from('interview_source_records')
      .select('id')
      .eq('content_fingerprint', fprint)
      .limit(1);
    if (data?.length) return true;
  }
  return false;
}

/** 公司简称归一（AI 常写成「字节」「阿里」「华子」这类口语简称） */
const COMPANY_ALIAS = {
  字节: '字节跳动',
  头条: '字节跳动',
  阿里: '阿里巴巴',
  alibaba: '阿里巴巴',
  蚂蚁: '阿里巴巴',
  鹅厂: '腾讯',
  华子: '华为',
  华为技术: '华为',
  b站: '哔哩哔哩',
  bilibili: '哔哩哔哩',
  美团点评: '美团',
  pdd: '拼多多',
  小红书app: '小红书',
};

function canonCompany(name) {
  const raw = cleanText(name || '');
  const key = raw.toLowerCase().replace(/\s+/g, '');
  return COMPANY_ALIAS[key] || raw;
}

/**
 * AI 有时会把「头条、微信、Shopee、字节跳动」这种多公司串当成公司名。
 * 这种情况从词库里取第一个能识别的公司，取不到就返回空（宁可不收）。
 */
function normalizeCompany(raw, haystack) {
  const s = canonCompany(raw).trim();
  if (s && s.length <= 20 && !/[、,，/|+＆&]/.test(s)) return s;
  const hit = COMPANY_MAP.find(([, re]) => re.test(`${haystack} ${s}`));
  return hit ? hit[0] : '';
}

function pickRecruitment(text, aiValue) {  if (RECRUITMENT.includes(aiValue) && aiValue !== 'undetermined') return aiValue;
  if (/秋招/.test(text)) return 'autumn_recruitment';
  if (/春招/.test(text)) return 'spring_recruitment';
  if (/转正|留用/.test(text)) return 'conversion_internship';
  if (/实习/.test(text)) return 'daily_internship';
  return 'undetermined';
}

// ---------------------------------------------------------------- 主流程
async function main() {
  logRun(`===== 开始运行（${DRY ? 'dry 空跑' : '正常入库'}，limit=${LIMIT}）=====`);
  const report = {
    startedAt: new Date().toISOString(),
    dry: DRY,
    discovered: 0,
    skippedKnown: 0,
    skippedIrrelevant: 0,
    skippedStale: 0,
    indexOnly: 0,
    published: 0,
    failed: 0,
    items: [],
  };

  const candidates = [...loadCandidates(), ...(await harvestCandidates())];
  report.discovered = candidates.length;
  console.log(`发现候选 ${candidates.length} 条`);

  const sourceCache = new Map();
  let written = 0;

  for (const cand of candidates) {
    if (written >= LIMIT) break;
    const url = cand.url;
    const platform = cand.platform || platformOf(url);
    const postId = cand.platformPostId || (url.match(/discuss\/(\d{6,})/)?.[1] ?? '');

    if (!sourceCache.has(platform)) sourceCache.set(platform, await ensureSource(platform));
    const sourceId = sourceCache.get(platform);
    if (!sourceId) {
      report.failed++;
      continue;
    }

    const fprint = fingerprint(cand.title || url, postId || url);

    // 过旧的面经没有参考价值（CSDN/掘金搜索结果里常混进好几年前的校招帖）
    const STALE_BEFORE = Date.parse('2023-01-01T00:00:00Z');
    if (cand.publishedAt && Date.parse(cand.publishedAt) < STALE_BEFORE) {
      report.skippedStale++;
      report.items.push({ url, platform, title: cand.title, result: '发布时间过早，跳过' });
      continue;
    }

    if (!DRY && (await alreadyKnown(sourceId, postId, url, fprint))) {
      report.skippedKnown++;
      continue;
    }

    // 掘金/CSDN/V2EX 的搜索接口已经给出标题与摘要，直接用；其余平台抓详情页的 og 信息
    let title = '';
    let desc = '';
    let keywords = '';
    if (cand.title && cleanText(cand.excerpt || '').length >= 20) {
      title = cleanText(cand.title).slice(0, 300);
      desc = cleanText(cand.excerpt).slice(0, 700);
    } else {
      const page = await fetchPostPage(url, platform === '牛客网' ? 3 : 1);
      if (!page.ok) {
        report.failed++;
        report.items.push({ url, platform, result: `抓取失败 HTTP ${page.status}` });
        continue;
      }
      title = cleanText(metaOf(page.html, 'og:title') || metaOf(page.html, 'title'))
        .replace(/[_-]牛客网$/, '')
        .slice(0, 300);
      desc = cleanText(
        metaOf(page.html, 'og:description') || metaOf(page.html, 'description')
      ).replace(/[_-]牛客网(_牛客在手,offer不愁)?$/, '');
      keywords = cleanText(metaOf(page.html, 'keywords'));
    }

    if (!title) {
      report.failed++;
      report.items.push({ url, platform, result: '页面无标题（可能需登录/JS 渲染）' });
      continue;
    }

    const haystack = `${title} ${keywords} ${desc}`;
    if (NOISE_RE.test(haystack) || !RELEVANT_RE.test(haystack)) {
      report.skippedIrrelevant++;
      report.items.push({ url, platform, title, result: '与面经无关，跳过' });
      continue;
    }

    // 标题里写死年份的（如「alibaba 2015 校招面经」）同样按过旧处理
    const yearInTitle = title.match(/(19|20)\d{2}/)?.[0];
    if (yearInTitle && Number(yearInTitle) < 2023) {
      report.skippedStale++;
      report.items.push({ url, platform, title, result: `标题年份 ${yearInTitle} 过早，跳过` });
      continue;
    }

    // 同名面经已存在就不重复入库（不同平台会转载同一篇帖子）
    if (!DRY) {
      const { data: sameTitle } = await db
        .from('interview_experiences')
        .select('id')
        .eq('title', title)
        .limit(1);
      if (sameTitle?.length) {
        report.skippedKnown++;
        report.items.push({ url, platform, title, result: '同名面经已存在，跳过' });
        continue;
      }
    }

    // 只有索引信息、没有可用摘要 → 只登记索引，不生成面经
    if (desc.length < 60) {
      if (!DRY) {
        await db.from('interview_source_records').insert({
          source_id: sourceId,
          platform_post_id: postId,
          normalized_url: url,
          title,
          content_fingerprint: fprint,
          raw_excerpt: '',
          status: 'pending_verification',
        });
      }
      report.indexOnly++;
      report.items.push({ url, platform, title, result: '仅登记索引（摘要不足，待人工核验）' });
      written++;
      continue;
    }

    const ai = await aiStructure({ title, keywords, excerpt: desc.slice(0, 700) });
    const parsed = ai.data || {};
    const companyName = normalizeCompany(parsed.company, haystack) ||
      (COMPANY_MAP.find(([, re]) => re.test(haystack))?.[0] ?? '');
    // 判定：必须能识别公司，且标题/关键词明确指向面试记录
    // （AI 只看得到分享摘要，容易把「一面」类帖子判成非面经，所以标题信号优先）
    const titleLooksInterview = INTERVIEW_RE.test(`${title} ${keywords}`);
    const aiSaysInterview = parsed.is_interview_post !== false;
    if (!companyName || !titleLooksInterview || !aiSaysInterview) {
      report.skippedIrrelevant++;
      report.items.push({ url, platform, title, result: '不是面试记录或无法确定公司，跳过' });
      continue;
    }

    // 没有 AI 原创归纳（只拿到平台摘要）时，不生成面经条目，只留索引待人工核验，
    // 避免把平台摘要当成本站摘要直接公开。
    const aiSummary = cleanText(parsed.summary || '');
    if (aiSummary.length < 60) {
      if (!DRY) {
        await db.from('interview_source_records').insert({
          source_id: sourceId,
          platform_post_id: postId,
          normalized_url: url,
          title,
          content_fingerprint: fprint,
          raw_excerpt: desc.slice(0, 400),
          status: 'pending_verification',
        });
      }
      report.indexOnly++;
      report.items.push({ url, platform, title, company: companyName, result: '仅登记索引（AI 归纳不足）' });
      written++;
      continue;
    }
    const roleGuess = ROLE_MAP.find(([, re]) => re.test(haystack));
    const roleName = cleanText(parsed.job_role || '').trim() || roleGuess?.[2] || '未标注岗位';
    const roleCategory = ROLE_CATEGORIES.includes(parsed.role_category)
      ? parsed.role_category
      : roleGuess?.[0] || 'other';
    const recruitmentType = pickRecruitment(haystack, parsed.recruitment_type);
    const summary = aiSummary.slice(0, 1200);

    if (DRY) {
      report.published++;
      report.items.push({ url, platform, title, company: companyName, role: roleName, result: 'DRY-RUN 通过' });
      written++;
      console.log(`[dry] ${title.slice(0, 30)} | ${companyName} | ${roleName}`);
      continue;
    }

    // 1) 索引记录
    const { data: record, error: recErr } = await db
      .from('interview_source_records')
      .insert({
        source_id: sourceId,
        platform_post_id: postId,
        normalized_url: url,
        title,
        author: '',
        published_at: cand.publishedAt || null,
        content_fingerprint: fprint,
        raw_excerpt: desc.slice(0, 400),
        status: 'verified',
      })
      .select('id')
      .single();
    if (recErr || !record) {
      report.failed++;
      report.items.push({ url, platform, title, result: `索引写入失败：${recErr?.message || ''}` });
      continue;
    }

    // 2) 公司 / 岗位
    const companyId = await ensureCompany(companyName);
    const roleId = companyId ? await ensureRole(companyId, roleName, roleCategory) : null;
    if (!companyId || !roleId) {
      await db.from('interview_source_records').delete().eq('id', record.id);
      report.failed++;
      report.items.push({ url, platform, title, result: '公司/岗位写入失败' });
      continue;
    }

    // 3) 面经正文条目
    const { data: exp, error: expErr } = await db
      .from('interview_experiences')
      .insert({
        company_id: companyId,
        job_role_id: roleId,
        recruitment_type: recruitmentType,
        cohort: cleanText(parsed.cohort || '').slice(0, 40),
        title,
        summary,
        source_record_id: record.id,
        origin: 'external',
        verification_status: 'verified',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (expErr || !exp) {
      await db.from('interview_source_records').delete().eq('id', record.id);
      report.failed++;
      report.items.push({ url, platform, title, result: `面经写入失败：${expErr?.message || ''}` });
      continue;
    }

    // 4) 轮次
    const rounds = [...new Set((parsed.rounds || []).filter((r) => ROUNDS.includes(r)))];
    if (rounds.length) {
      await db.from('interview_rounds').insert(
        rounds.map((round, i) => ({ experience_id: exp.id, round, sort_order: i }))
      );
    }

    // 5) 题目
    const questions = (parsed.questions || [])
      .filter((q) => q && typeof q.text === 'string' && q.text.trim().length >= 4)
      .slice(0, 30)
      .map((q) => ({
        experience_id: exp.id,
        company_id: companyId,
        job_role_id: roleId,
        recruitment_type: recruitmentType,
        round: ROUNDS.includes(q.round) ? q.round : 'other',
        question_text: cleanText(q.text).slice(0, 2000),
        question_category: QUESTION_CATEGORIES.includes(q.category) ? q.category : 'other',
        confidence_level: ['verified', 'pending', 'inferred'].includes(q.confidence)
          ? q.confidence
          : 'inferred',
        source_record_id: record.id,
      }));
    if (questions.length) await db.from('interview_questions').insert(questions);

    // 6) 标签
    const tags = [...new Set((parsed.tags || []).map((t) => cleanText(t)).filter(Boolean))]
      .slice(0, 8)
      .map((tag) => ({ experience_id: exp.id, tag: tag.slice(0, 60) }));
    if (tags.length) await db.from('interview_tags').insert(tags);

    // 7) 难度 / 结果 → 原作者评价（仅当材料明确体现时写入）
    const difficultyRaw = String(parsed.difficulty || '').toLowerCase().trim();
    const difficulty =
      DIFFICULTY_LABELS[difficultyRaw] ||
      (['简单', '中等', '困难', '较难', '偏难'].includes(String(parsed.difficulty || '').trim())
        ? String(parsed.difficulty || '').trim()
        : null);
    const resultText = cleanText(parsed.result || '').slice(0, 100);
    if (difficulty || resultText) {
      await db.from('interview_reviews').insert({
        experience_id: exp.id,
        reviewer_kind: 'original_author',
        difficulty: difficulty || null,
        result: resultText || null,
        review_text: '',
      });
    }

    report.published++;
    written++;
    report.items.push({
      url, platform, title, company: companyName, role: roleName,
      rounds: rounds.length, questions: questions.length, result: '已发布',
    });
    console.log(`✓ ${title.slice(0, 34)} | ${companyName} / ${roleName} | 题 ${questions.length}`);
  }

  await db
    .from('interview_sources')
    .update({ last_sync_at: new Date().toISOString(), sync_status: 'synced', error_message: '' })
    .in('id', [...sourceCache.values()].filter(Boolean));

  report.finishedAt = new Date().toISOString();
  console.log('\n=== 本次采集汇总 ===');
  console.log(
    `发现 ${report.discovered} · 新增发布 ${report.published} · 仅索引 ${report.indexOnly} · ` +
    `已存在跳过 ${report.skippedKnown} · 无关跳过 ${report.skippedIrrelevant} · 过旧跳过 ${report.skippedStale} · 失败 ${report.failed}`
  );
  console.log('REPORT_JSON ' + JSON.stringify(report));
  logRun(
    `完成：发现 ${report.discovered} · 发布 ${report.published} · 仅索引 ${report.indexOnly} · ` +
    `已存在跳过 ${report.skippedKnown} · 无关跳过 ${report.skippedIrrelevant} · ` +
    `过旧跳过 ${report.skippedStale} · 失败 ${report.failed}`
  );
}

// ---------------------------------------------------------------- 历史回填
// 对已有 verified 面经重新跑 AI 归纳：补新格式摘要（背景→流程→考察重点）+ 难度/结果。
async function backfill() {
  console.log('===== 开始回填历史面经（新格式摘要 + 难度/结果）=====');
  const { data: exps, error: expErr } = await db
    .from('interview_experiences')
    .select('id,title,source_record_id')
    .eq('verification_status', 'verified')
    .order('published_at', { ascending: false });
  if (expErr) {
    console.error('查询面经失败：', expErr.message);
    process.exit(1);
  }
  const total = exps?.length || 0;
  console.log(`待回填 ${total} 条`);

  let updated = 0;
  let reviewed = 0;
  let skipped = 0;
  let failed = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < total; i++) {
    const exp = exps[i];
    if (!exp.source_record_id) {
      skipped++;
      continue;
    }
    const { data: rec } = await db
      .from('interview_source_records')
      .select('title,raw_excerpt')
      .eq('id', exp.source_record_id)
      .maybeSingle();
    const title = rec?.title || exp.title;
    const excerpt = rec?.raw_excerpt || '';
    if (!excerpt && !title) {
      skipped++;
      continue;
    }

    const { data: parsed, error: aiErr } = await aiStructure({ title, keywords: '', excerpt });
    if (aiErr || !parsed) {
      console.log(`✗ ${title.slice(0, 26)} | AI 失败：${aiErr || '返回空'}`);
      failed++;
      continue;
    }

    // 1) 更新 summary（新格式，长度达标才覆盖）
    const summary = cleanText(parsed.summary || '');
    let okSummary = false;
    if (summary.length >= 60) {
      const { error: upErr } = await db.from('interview_experiences').update({ summary }).eq('id', exp.id);
      if (!upErr) {
        updated++;
        okSummary = true;
      }
    }

    // 2) 难度 / 结果 → 原作者评价（upsert）
    const difficultyRaw = String(parsed.difficulty || '').toLowerCase().trim();
    const difficulty =
      DIFFICULTY_LABELS[difficultyRaw] ||
      (['简单', '中等', '困难', '较难', '偏难'].includes(String(parsed.difficulty || '').trim())
        ? String(parsed.difficulty || '').trim()
        : null);
    const result = cleanText(parsed.result || '').slice(0, 100);
    if (difficulty || result) {
      const { data: existing } = await db
        .from('interview_reviews')
        .select('id')
        .eq('experience_id', exp.id)
        .eq('reviewer_kind', 'original_author')
        .maybeSingle();
      const row = { difficulty: difficulty || null, result: result || null };
      if (existing) {
        await db.from('interview_reviews').update(row).eq('id', existing.id);
      } else {
        await db
          .from('interview_reviews')
          .insert({ experience_id: exp.id, reviewer_kind: 'original_author', ...row, review_text: '' });
      }
      reviewed++;
    }

    console.log(
      `✓ ${title.slice(0, 26)} | 摘要${okSummary ? '✓' : '—'} 难度/结果${difficulty || result ? '✓' : '—'}`
    );
    if ((i + 1) % 4 === 0) await sleep(600);
  }

  console.log(
    `回填完成：更新摘要 ${updated} · 写评价 ${reviewed} · 跳过 ${skipped} · 失败 ${failed}`
  );
}

if (argv.includes('--backfill')) {
  backfill().catch((e) => {
    console.error('回填异常：', e);
    process.exit(1);
  });
} else {
  main().catch((e) => {
    console.error('采集异常：', e);
    logRun(`异常中断：${(e && (e.stack || e.message)) || String(e)}`);
    process.exit(1);
  });
}
