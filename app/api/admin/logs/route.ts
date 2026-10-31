import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { adminError } from '@/lib/admin/server';
export const GET = api(async (request) => {
  const identity = await siteManager(),
    query = new URL(request.url).searchParams,
    offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(query.get('offset') || 0);
  let select = identity.db
    .from('admin_audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + 49);
  if (query.get('job')) select = select.eq('job_id', z.uuid().parse(query.get('job')));
  const result = await select;
  adminError(result.error);
  return NextResponse.json({
    logs: result.data,
    total: result.count,
    nextOffset: offset + 50 < (result.count || 0) ? offset + 50 : null,
  });
});
