import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { adminSaveSchema, jobStateSchema } from '@/lib/admin/model';
import { adminError, adminJob, adminJobs } from '@/lib/admin/server';
import { jobTypeSchema } from '@/lib/catalog';
export const GET = api(async (request) => {
  const identity = await siteManager(),
    query = new URL(request.url).searchParams;
  if (query.has('id'))
    return NextResponse.json(await adminJob(identity, z.uuid().parse(query.get('id'))));
  if (query.get('state')) jobStateSchema.parse(query.get('state'));
  if (query.get('type')) jobTypeSchema.parse(query.get('type'));
  return NextResponse.json(await adminJobs(identity, query));
});
export const POST = api(async (request) => {
  const identity = await siteManager(['super_admin', 'editor']);
  const input = adminSaveSchema.parse(await readBody(request, 280000));
  const result = await identity.db.rpc('admin_save_job', {
    job_id: input.id || null,
    expected_version: input.expectedVersion || null,
    payload: input.job,
  });
  adminError(result.error);
  return NextResponse.json(
    { ...(await adminJob(identity, result.data.id)), duplicates: result.data.duplicates },
    { status: input.id ? 200 : 201 }
  );
}, true);
