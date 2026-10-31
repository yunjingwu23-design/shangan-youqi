import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { jobStates } from '@/lib/admin/model';
import { adminError } from '@/lib/admin/server';
export const GET = api(async () => {
  const identity = await siteManager(),
    states = Object.keys(jobStates),
    results = await Promise.all(
      states.map((state) =>
        identity.db
          .from('job_catalog')
          .select('id', { count: 'exact', head: true })
          .eq('state', state)
      )
    ),
    overdue = await identity.db
      .from('job_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'published')
      .lte('deadline_at', new Date().toISOString());
  for (const result of [...results, overdue]) adminError(result.error);
  const counts = Object.fromEntries(states.map((state, i) => [state, results[i].count || 0]));
  counts.published -= overdue.count || 0;
  return NextResponse.json({
    counts,
    overdue: overdue.count || 0,
    role: identity.adminRole,
    userId: identity.userId,
  });
});
export const POST = api(async () => {
  const identity = await siteManager(['super_admin', 'reviewer']),
    result = await identity.db.rpc('admin_expire_jobs');
  adminError(result.error);
  return NextResponse.json({ expired: result.data });
}, true);
