import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { listQuestions } from '@/lib/interview-radar/server';
export const GET = api(async (req: Request) => {
  const url = new URL(req.url);
  const questions = await listQuestions({
    companyId: url.searchParams.get('companyId') || undefined,
    roleId: url.searchParams.get('roleId') || undefined,
    round: url.searchParams.get('round') || undefined,
    q: url.searchParams.get('q') || undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 200,
  });
  return NextResponse.json({ questions });
});
