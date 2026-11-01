import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api, actor, readBody, ApiError } from '@/lib/api';
import { clientAddress, consumeLimit } from '@/lib/rate-limit';
import { adminSupabase } from '@/lib/supabase/admin';
import { clientEventSchema } from '@/lib/analytics/model';
import {
  analyticsCookie,
  visitorHash,
  privacySignal,
  automatedRequest,
  storeEvent,
} from '@/lib/analytics/server';
export const POST = api(async (request) => {
  const input = clientEventSchema.parse(await readBody(request, 2048));
  const visitor = visitorHash((await cookies()).get(analyticsCookie)?.value);
  if (!visitor || privacySignal(request.headers) || automatedRequest(request.headers))
    return NextResponse.json({ accepted: false }, { status: 202 });
  await consumeLimit('analytics-visitor', visitor, 300, 60);
  await consumeLimit('analytics-ip', clientAddress(request), 1000, 60);
  let category = input.category,
    jobId = input.jobId;
  if (jobId) {
    const job = await adminSupabase()
      .from('job_catalog')
      .select('type,state,deadline_at')
      .eq('id', jobId)
      .maybeSingle();
    if (job.error) throw new ApiError(503, '统计暂不可用。');
    if (
      !job.data ||
      job.data.state !== 'published' ||
      (job.data.deadline_at && Date.parse(job.data.deadline_at) <= Date.now())
    )
      throw new ApiError(400, '仅统计有效的已发布岗位。');
    category = job.data.type;
  }
  let userId: string | undefined;
  try {
    userId = (await actor()).userId;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
  await storeEvent({
    id: input.id,
    visitor,
    userId,
    type: input.type,
    page: input.page,
    source: input.source,
    jobId,
    category,
    keyword: input.keyword,
    provenance: 'client',
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}, true);
