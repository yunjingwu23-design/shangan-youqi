import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { listCompanies, listRoles, listSources } from '@/lib/interview-radar/server';
export const GET = api(async (req: Request) => {
  const url = new URL(req.url);
  const companyId = url.searchParams.get('companyId') || undefined;
  const [companies, sources, roles] = await Promise.all([
    listCompanies(),
    listSources(),
    companyId ? listRoles(companyId) : Promise.resolve([]),
  ]);
  return NextResponse.json({ companies, sources, roles });
});
