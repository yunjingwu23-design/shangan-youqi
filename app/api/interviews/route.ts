import { NextResponse } from 'next/server';
import { api, readBody } from '@/lib/api';
import { interviewActor, interviewError } from '@/lib/interviews/server';
import { uploadSchema, CONSENT_VERSION } from '@/lib/interviews/schema';
export const GET = api(async (request) => {
  const { db, userId } = await interviewActor();
  const offset = Math.max(
    0,
    Math.min(10000, Number(new URL(request.url).searchParams.get('offset')) || 0)
  );
  const { data, error, count } = await db
    .from('interviews')
    .select(
      'id,title,job_id,job_title,round,status,created_at,duration_seconds,transcript_version',
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + 19);
  interviewError(error);
  return NextResponse.json({
    interviews: data,
    total: count,
    nextOffset: offset + 20 < (count || 0) ? offset + 20 : null,
  });
});
export const POST = api(async (request) => {
  const { db } = await interviewActor();
  const details = uploadSchema.parse(await readBody(request));
  const { data, error } = await db.rpc('create_interview', {
    details: { ...details, consentVersion: CONSENT_VERSION },
  });
  interviewError(error);
  return NextResponse.json({ id: data }, { status: 201 });
}, true);
