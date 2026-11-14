import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { listExperiences } from '@/lib/interview-radar/server';
export const GET = api(async (req: Request) => {
  const url = new URL(req.url);
  const experiences = await listExperiences({
    companyId: url.searchParams.get('companyId') || undefined,
    roleId: url.searchParams.get('roleId') || undefined,
    recruitmentType: url.searchParams.get('recruitmentType') || undefined,
    round: url.searchParams.get('round') || undefined,
    q: url.searchParams.get('q') || undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 100,
  });
  return NextResponse.json({ experiences });
});
