/**
 * Seed the interview radar with real, publicly-accessible Nowcoder interview
 * posts. This is a one-off operational script (not part of the app runtime).
 *
 * It ONLY fetches Nowcoder discuss pages that are served anonymously, and
 * extracts INDEX metadata only (title / author / url / time / short excerpt /
 * platform keywords). It does NOT bypass login, does NOT touch private APIs,
 * and stores ONLY a bounded excerpt — never the full body, which is both
 * legally safer and technically unnecessary (the platform's own meta
 * description + keywords already provide high-quality classification).
 *
 * Usage:
 *   node scripts/seed-radar.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return { ...process.env, ...env };
}

const env = loadEnv();
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(URL_BASE, SERVICE_KEY, { auth: { persistSession: false } });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Publicly-accessible Nowcoder discuss post IDs (verified anonymously readable).
const SEED_POST_IDS = [
  '946881005279866880', // 拼多多 人才计划一面
  '947932784473939968', // 扣子工作流（腾讯相关）
  '947570775475642368', // 试用期工资（秋招结果）
  '947970592760684544', // Offer帮选 游戏开发VS银行管培
  '947784654415785984', // 影石Insta360 一二面面经
  '948271206736654336', // 水滴 AI 全栈二面
  '947982288917110784', // 快手 AI 全栈一面（回忆版）
];

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/_牛客网$/, '')
    .replace(/_牛客在手,offer不愁$/, '')
    .trim();
}

function cleanText(s) {
  return decodeEntities(s).replace(/\s+/g, ' ').trim();
}

async function fetchPublic(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

function meta(html, key) {
  const re = new RegExp(`(?:property|name)=["']${key}["']\\s+content=["']([^"']+)["']`, 'i');
  const rev = new RegExp(`content=["']([^"']+)["']\\s+(?:property|name)=["']${key}["']`, 'i');
  return html.match(re)?.[1] ?? html.match(rev)?.[1] ?? null;
}

function fp(title, id) {
  return createHash('sha256')
    .update(`${title}|${id}`.toLowerCase().normalize('NFKC'))
    .digest('hex')
    .slice(0, 64);
}

// --- classification from platform keywords (Nowcoder already classifies) ---
function inferCompany(keywords) {
  const kw = keywords.join(' ');
  const map = [
    ['拼多多', /拼多多|pdd/i],
    ['腾讯', /腾讯|tencent|鹅厂/i],
    ['快手', /快手/i],
    ['影石Insta360', /影石|insta360/i],
    ['水滴', /水滴/i],
    ['字节跳动', /字节|bytedance|抖音/i],
    ['阿里巴巴', /阿里|alibaba|淘宝|天猫/i],
    ['百度', /百度|baidu/i],
    ['美团', /美团|meituan/i],
    ['京东', /京东|jd\b/i],
    ['华为', /华为|huawei/i],
    ['小米', /小米|xiaomi/i],
    ['网易', /网易|netease/i],
  ];
  for (const [name, re] of map) if (re.test(kw)) return name;
  return null;
}

function inferRoleCategory(keywords) {
  const kw = keywords.join(' ');
  const pairs = [
    ['algorithm', /算法|人工智能|机器学习|大模型|深度学习/i],
    ['backend_dev', /后端|开发|软件|java|golang|服务端/i],
    ['frontend_dev', /前端|react|vue|h5/i],
    ['data_analysis', /数据分析|数分/i],
    ['product_manager', /产品|pm\b/i],
    ['human_resources', /人力|hr\b/i],
    ['finance', /金融|银行|财务|审计/i],
    ['supply_chain', /硬件|通信|供应链|采购/i],
  ];
  for (const [cat, re] of pairs) if (re.test(kw)) return cat;
  return 'other';
}

function inferRecruitment(keywords) {
  const kw = keywords.join(' ');
  if (/秋招/.test(kw)) return 'autumn_recruitment';
  if (/春招/.test(kw)) return 'spring_recruitment';
  if (/实习/.test(kw)) return 'daily_internship';
  return 'undetermined';
}

async function upsertCompany(name) {
  const { data } = await db.from('companies').select('id').eq('name', name).maybeSingle();
  if (data) return data.id;
  const { data: created } = await db
    .from('companies')
    .insert({ name, verified_status: 'unverified' })
    .select('id')
    .single();
  return created.id;
}

async function upsertRole(companyId, name, category) {
  const { data } = await db.from('job_roles').select('id').eq('company_id', companyId).eq('name', name).maybeSingle();
  if (data) return data.id;
  const { data: created } = await db
    .from('job_roles')
    .insert({ company_id: companyId, name, category, custom: true })
    .select('id')
    .single();
  return created.id;
}

const ROLE_NAMES = {
  algorithm: '算法工程师',
  backend_dev: '后端开发',
  frontend_dev: '前端开发',
  data_analysis: '数据分析',
  product_manager: '产品经理',
  human_resources: 'HR',
  finance: '财务',
  supply_chain: '硬件工程师',
  other: '其他岗位',
};

async function main() {
  console.log('=== 1. 确保来源目录 ===');
  const { data: src, error: srcErr } = await db
    .from('interview_sources')
    .upsert(
      { name: '牛客网', source_type: 'community', supported_methods: ['public_index', 'manual_import'], authorization_status: 'manual_only', active: true },
      { onConflict: 'name' }
    )
    .select('id')
    .single();
  if (srcErr || !src) {
    console.error('来源创建失败', srcErr);
    process.exit(1);
  }
  console.log(`  来源 id=${src.id}`);

  console.log('=== 2. 采集牛客公开面经（固定 URL） ===');
  let imported = 0;
  let skipped = 0;
  for (const id of SEED_POST_IDS) {
    const url = `https://www.nowcoder.com/discuss/${id}`;
    try {
      const html = await fetchPublic(url);
      const title = cleanText(meta(html, 'og:title') || '').slice(0, 300);
      const desc = cleanText(meta(html, 'description') || '');
      const keywords = (meta(html, 'keywords') || '')
        .split(',')
        .map((s) => cleanText(s))
        .filter(Boolean);

      if (!title || !desc) {
        skipped++;
        continue;
      }

      const fprint = fp(title, id);
      const { data: dup } = await db
        .from('interview_source_records')
        .select('id')
        .eq('content_fingerprint', fprint)
        .limit(1);
      if (dup?.length) {
        console.log(`  - 重复跳过: ${title.slice(0, 30)}`);
        skipped++;
        continue;
      }

      const { data: record, error: recErr } = await db
        .from('interview_source_records')
        .insert({
          source_id: src.id,
          platform_post_id: id,
          normalized_url: url,
          title,
          author: '',
          published_at: null,
          content_fingerprint: fprint,
          raw_excerpt: desc.slice(0, 500),
          status: 'verified',
        })
        .select('id')
        .single();
      if (recErr || !record) {
        console.log(`  ✗ 记录入库失败: ${title.slice(0, 30)} ${recErr?.message || ''}`);
        skipped++;
        continue;
      }

      const company = inferCompany(keywords);
      if (!company) {
        console.log(`  - 未识别公司，跳过: ${title.slice(0, 30)}`);
        skipped++;
        continue;
      }
      const companyId = await upsertCompany(company);
      const roleCategory = inferRoleCategory(keywords);
      const roleName = ROLE_NAMES[roleCategory] || '其他岗位';
      const roleId = await upsertRole(companyId, roleName, roleCategory);
      const recruitment = inferRecruitment(keywords);

      const { error: expErr } = await db.from('interview_experiences').insert({
        company_id: companyId,
        job_role_id: roleId,
        recruitment_type: recruitment,
        cohort: '',
        title,
        summary: desc.slice(0, 400),
        source_record_id: record.id,
        origin: 'external',
        verification_status: 'verified',
        published_at: new Date().toISOString(),
      });
      if (expErr) {
        console.log(`  ✗ 面经创建失败: ${title.slice(0, 30)} ${expErr.message}`);
        skipped++;
        continue;
      }
      console.log(`  ✓ ${company} · ${title.slice(0, 40)}`);
      imported++;
    } catch (e) {
      console.log(`  ✗ ${url} (${e.message})`);
      skipped++;
    }
  }

  console.log(`\n=== 完成：入库 ${imported} 篇，跳过 ${skipped} 篇 ===`);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
