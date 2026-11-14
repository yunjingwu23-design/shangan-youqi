import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { adminListSubmissions } from '@/lib/interview-radar/server';
export const GET = api(async () => {
  await siteManager();
  const submissions = await adminListSubmissions();
  return NextResponse.json({ submissions });
});
