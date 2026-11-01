import 'server-only';
import { cookies, headers } from 'next/headers';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { adminSupabase } from '@/lib/supabase/admin';
import { config } from '@/lib/config';
import type { BusinessEvent } from './model';
export const analyticsCookie = 'syq_analytics';
function hash(value: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error('CONFIG_MISSING');
  return createHmac('sha256', secret)
    .update('analytics:v1:' + value)
    .digest('hex');
}
export function visitorToken() {
  const id = randomUUID();
  return id + '.' + hash('cookie:' + id);
}
export function visitorHash(token: string | undefined) {
  if (!token || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token)) return null;
  const [id, signature] = token.split('.');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(hash('cookie:' + id)))) return null;
  return hash('visitor:' + id);
}
export function userHash(id: string) {
  return hash('user:' + id);
}
export function privacySignal(h: Headers) {
  return h.get('dnt') === '1' || h.get('sec-gpc') === '1';
}
export function automatedRequest(h: Headers) {
  return (
    /bot|crawler|spider|headless|lighthouse|preview/i.test(h.get('user-agent') || '') ||
    /prefetch|prerender/i.test(h.get('sec-purpose') || h.get('purpose') || '')
  );
}
export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config().secure,
  path: '/',
  maxAge: 90 * 86400,
});
export async function storeEvent(input: {
  id: string;
  visitor: string;
  userId?: string;
  type: string;
  page: string;
  source?: string;
  jobId?: string;
  category?: string;
  keyword?: string;
  provenance: 'client' | 'server';
}) {
  const result = await adminSupabase().rpc('record_site_event', {
    event_id: input.id,
    visitor_hash: input.visitor,
    user_hash: input.userId ? userHash(input.userId) : null,
    event_name: input.type,
    page: input.page,
    traffic_source: input.source || 'internal',
    job: input.jobId || null,
    job_category: input.category || null,
    search_term: input.keyword || null,
    event_provenance: input.provenance,
  });
  if (result.error) throw new Error('ANALYTICS_WRITE_FAILED');
}
export async function recordBusinessEvent(
  type: BusinessEvent,
  userId: string,
  page: string,
  jobId?: string,
  category?: string
) {
  try {
    const h = await headers();
    if (privacySignal(h) || automatedRequest(h)) return;
    const visitor = visitorHash((await cookies()).get(analyticsCookie)?.value);
    if (!visitor) return;
    await storeEvent({
      id: randomUUID(),
      visitor,
      userId,
      type,
      page,
      jobId,
      category,
      provenance: 'server',
    });
  } catch {
    console.error('ANALYTICS_WRITE_FAILED');
  }
}
export async function eraseAnalyticsUser(id: string) {
  const result = await adminSupabase().rpc('erase_site_analytics', { user_hash: userHash(id) });
  if (result.error) throw new Error('ANALYTICS_ERASE_FAILED');
}
