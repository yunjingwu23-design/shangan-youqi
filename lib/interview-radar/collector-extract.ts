// Pure functions to extract interview-experience metadata and body text from
// Nowcoder public discuss pages. Kept free of `server-only` so it can be unit
// tested in isolation.
//
// These helpers only parse HTML that is ALREADY publicly served without login
// (Nowcoder discuss pages are server-rendered and readable anonymously). They
// never bypass authentication, never touch private APIs, and never store the
// full article body for republishing — the body is used only to derive an
// original AI summary.

export interface NowcoderPostMeta {
  title: string;
  author: string;
  publishedAt: string | null;
  bodyText: string;
  postId: string;
}

/**
 * Normalize whitespace and collapse HTML entities into readable text.
 */
export function cleanText(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|section)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractMeta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`property=["']${key}["']\\s+content=["']([^"']+)["']`, 'i'),
    new RegExp(`name=["']${key}["']\\s+content=["']([^"']+)["']`, 'i'),
    new RegExp(`content=["']([^"']+)["']\\s+property=["']${key}["']`, 'i'),
    new RegExp(`content=["']([^"']+)["']\\s+name=["']${key}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Extract the post body. Nowcoder discuss pages put the clean article body
 * inside a `nc-post-content` container (server-rendered, publicly readable).
 */
export function extractBody(html: string): string {
  // 1) The dedicated post content container is the most precise source.
  const content = html.match(/<[^>]+class="[^"]*nc-post-content[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i);
  if (content?.[1]) {
    const text = cleanText(content[1]);
    if (text.length > 60) return text;
  }

  // 2) Fallback to a generic content container.
  const generic = html.match(/<div[^>]+class=["'][^"']*(?:post-content|discuss-content|detail-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (generic?.[1]) {
    const text = cleanText(generic[1]);
    if (text.length > 100) return text;
  }

  return '';
}

/**
 * Extract the `description` meta tag, which Nowcoder fills with a clean
 * short summary of the post (suitable as an index excerpt).
 */
export function extractDescription(html: string): string {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return cleanText(m?.[1] ?? '');
}

/**
 * Extract the `keywords` meta tag as a tag list. Nowcoder fills this with
 * the company, role, and topic labels it already classified.
 */
export function extractKeywords(html: string): string[] {
  const m = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']keywords["']/i);
  if (!m?.[1]) return [];
  return m[1]
    .split(',')
    .map((s) => cleanText(s))
    .filter((s) => s && s.length <= 40);
}

/**
 * Parse a Nowcoder discuss detail page into structured metadata.
 * `postId` is derived from the URL path (/discuss/<id>).
 */
export function parseNowcoderPost(html: string, url: string): NowcoderPostMeta {
  const postId = (url.match(/\/discuss\/(\d+)/) ?? url.match(/\/(\d{15,})/) ?? [])[1] ?? '';

  const title =
    extractMeta(html, 'og:title') ??
    html.match(/<title>([^<]*)<\/title>/i)?.[1] ??
    '';
  const author =
    extractMeta(html, 'author') ??
    html.match(/class=["'](?:nick-name|user-name|nickname)["'][^>]*>([^<]+)</i)?.[1] ??
    '';

  let publishedAt: string | null = null;
  const timeMeta =
    html.match(/"publishTime"\s*:\s*"?(\d{4}-\d{2}-\d{2}[T ][^",}]+)"?/i) ??
    html.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?)/);
  if (timeMeta?.[1]) {
    const d = new Date(timeMeta[1]);
    if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
  }

  const bodyText = extractBody(html);

  return { title: cleanText(title).slice(0, 300), author: cleanText(author).slice(0, 100), publishedAt, bodyText, postId };
}

/**
 * Extract post links (id + title) from a Nowcoder discuss LIST page.
 * Links look like /discuss/<id> with an accompanying title.
 */
export function parseNowcoderList(html: string): { postId: string; title: string; url: string }[] {
  const seen = new Set<string>();
  const results: { postId: string; title: string; url: string }[] = [];
  const linkRe = /<a[^>]+href=["'](\/discuss\/(\d{15,}))[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    const postId = m[2];
    const rawTitle = cleanText(m[3]).slice(0, 300);
    if (!postId || !rawTitle || seen.has(postId)) continue;
    // Skip obvious non-article links (ads, nav) by requiring a reasonable title.
    if (rawTitle.length < 4 || /广告|投了吗|领取|会员/.test(rawTitle)) continue;
    seen.add(postId);
    results.push({ postId, title: rawTitle, url: `https://www.nowcoder.com${url}` });
  }
  return results;
}
