import 'server-only';
import { createHash } from 'node:crypto';
import { ApiError } from '@/lib/api';
import { parseNowcoderList, parseNowcoderPost } from './collector-extract';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export interface CollectedPost {
  source_id: string;
  platform_post_id: string;
  normalized_url: string;
  title: string;
  author: string;
  published_at: string | null;
  content_fingerprint: string;
  // raw_excerpt stores a SHORT original excerpt (index purpose only), never the
  // full body. The full body is used transiently for AI summarization.
  raw_excerpt: string;
  body_text: string;
}

/**
 * Fetch a public URL with a bounded timeout and a browser-like UA.
 * This only requests pages that are publicly served without authentication.
 */
async function fetchPublic(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(502, `抓取失败（${res.status}）。`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function fingerprint(title: string, postId: string): string {
  return createHash('sha256').update(`${title}|${postId}`.toLocaleLowerCase().normalize('NFKC')).digest('hex').slice(0, 64);
}

/**
 * Collect a batch of public Nowcoder discuss posts.
 *
 * `listUrl`   — a public discuss list page (e.g. https://www.nowcoder.com/discuss).
 * `maxPosts`  — cap on how many detail pages to fetch in one run.
 *
 * Returns collected posts WITHOUT writing to the DB. Writing happens in the
 * caller (import layer), which also applies authorization rules and duplicate
 * checks. This keeps the collector a pure, testable fetch.
 */
export async function collectNowcoder(listUrl: string, maxPosts = 10): Promise<CollectedPost[]> {
  const listHtml = await fetchPublic(listUrl);
  const items = parseNowcoderList(listHtml).slice(0, maxPosts);

  const posts: CollectedPost[] = [];
  for (const item of items) {
    try {
      const html = await fetchPublic(item.url);
      const meta = parseNowcoderPost(html, item.url);
      if (!meta.title || !meta.bodyText || meta.bodyText.length < 60) continue;
      posts.push({
        source_id: '', // filled by caller after resolving the source row
        platform_post_id: meta.postId || item.postId,
        normalized_url: item.url,
        title: meta.title,
        author: meta.author,
        published_at: meta.publishedAt,
        content_fingerprint: fingerprint(meta.title, meta.postId || item.postId),
        raw_excerpt: meta.bodyText.slice(0, 500),
        body_text: meta.bodyText,
      });
    } catch {
      // Skip individual failures; do not abort the whole batch.
      continue;
    }
  }
  return posts;
}
