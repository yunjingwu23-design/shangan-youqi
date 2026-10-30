import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { interviewActor, interviewError } from '@/lib/interviews/server';
export const GET = api(async () => {
  const { db } = await interviewActor();
  const { data, error } = await db.rpc('interview_usage_summary');
  interviewError(error);
  return NextResponse.json({ usage: data });
});
