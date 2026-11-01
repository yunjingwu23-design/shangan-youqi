import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { api, readBody, ApiError } from '@/lib/api';
import { clientAddress, consumeLimit } from '@/lib/rate-limit';
import { adminSupabase } from '@/lib/supabase/admin';
import {
  analyticsCookie,
  cookieOptions,
  privacySignal,
  visitorHash,
  visitorToken,
} from '@/lib/analytics/server';
export const GET = api(async (request) => {
  const value = (await cookies()).get(analyticsCookie)?.value;
  const signal = privacySignal(request.headers);
  return NextResponse.json({
    choice: signal ? 'reject' : visitorHash(value) ? 'accept' : value === 'deny' ? 'reject' : null,
    privacySignal: signal,
  });
});
export const POST = api(async (request) => {
  const { choice } = z
    .object({ choice: z.enum(['accept', 'reject']) })
    .strict()
    .parse(await readBody(request, 512));
  await consumeLimit('analytics-consent', clientAddress(request), 60, 3600);
  const jar = await cookies(),
    previous = visitorHash(jar.get(analyticsCookie)?.value);
  const accepted = choice === 'accept' && !privacySignal(request.headers);
  if (!accepted && previous) {
    const erased = await adminSupabase().rpc('erase_site_analytics', { visitor_hash: previous });
    if (erased.error) throw new ApiError(503, '统计数据暂时无法删除，请稍后重试。');
  }
  jar.set(
    analyticsCookie,
    accepted ? (previous ? jar.get(analyticsCookie)!.value : visitorToken()) : 'deny',
    cookieOptions()
  );
  return NextResponse.json({ choice: accepted ? 'accept' : 'reject' });
}, true);
