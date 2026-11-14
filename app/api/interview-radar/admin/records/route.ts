import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { adminListRecords, adminListSubmissions } from '@/lib/interview-radar/server';
export const GET = api(async () => {
  await siteManager();
  const records = await adminListRecords();
  return NextResponse.json({ records });
});
