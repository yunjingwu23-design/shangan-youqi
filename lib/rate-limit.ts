import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { adminSupabase } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api';
export async function consumeLimit(
  scope: string,
  identifier: string,
  maximum: number,
  period: number
) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error('CONFIG_MISSING');
  const bucket = createHmac('sha256', secret).update(`${scope}:${identifier}`).digest('hex');
  const { data, error } = await adminSupabase().rpc('consume_auth_rate_limit', {
    bucket,
    maximum,
    period_seconds: period,
  });
  // Fail closed when the persistent limiter is unavailable.
  if (error || !data || typeof data.allowed !== 'boolean')
    throw new ApiError(503, '验证服务暂不可用，请稍后重试。');
  if (!data.allowed) throw new ApiError(429, '操作过于频繁，请稍后再试。', data.retry_after);
}
export function clientAddress(request: Request) {
  if (process.env.TRUST_PROXY !== 'true') return 'shared-untrusted-proxy';
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return address && isIP(address) ? address : 'shared-untrusted-proxy';
}
