import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, ApiError, databaseError, readBody } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { catalogJobSchema } from '@/lib/catalog';
export const GET = api(async () => {
  const { db } = await siteManager();
  const { data, error } = await db
    .from('job_catalog')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);
  databaseError(error);
  return NextResponse.json({ jobs: data });
});
export const POST = api(async (request) => {
  const { db } = await siteManager();
  const input = z
    .object({
      id: z.uuid().optional(),
      expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
      job: catalogJobSchema,
      sourceReviewed: z.boolean(),
    })
    .strict()
    .parse(await readBody(request));
  if (input.job.state !== 'draft' && !input.sourceReviewed)
    throw new ApiError(400, '发布或更新公开岗位前，请确认已经核对招聘来源。');
  const now = new Date().toISOString();
  const values = {
    ...input.job,
    updated_at: now,
    verified_at: input.job.state === 'draft' ? null : now,
  };
  if (input.id) {
    if (!input.expectedUpdatedAt) throw new ApiError(400, '请重新载入岗位后编辑。');
    const { data: old, error: oldError } = await db
      .from('job_catalog')
      .select('published_at')
      .eq('id', input.id)
      .maybeSingle();
    databaseError(oldError);
    if (!old) throw new ApiError(404, '未找到岗位。');
    const { data, error } = await db
      .from('job_catalog')
      .update({
        ...values,
        published_at: old.published_at || (input.job.state === 'draft' ? null : now),
      })
      .eq('id', input.id)
      .eq('updated_at', input.expectedUpdatedAt)
      .select()
      .maybeSingle();
    databaseError(error);
    if (!data) throw new ApiError(409, '岗位已被修改，请重新读取后再保存。');
    return NextResponse.json({ job: data });
  }
  const { data, error } = await db
    .from('job_catalog')
    .insert({ ...values, published_at: input.job.state === 'draft' ? null : now })
    .select()
    .single();
  databaseError(error);
  return NextResponse.json({ job: data }, { status: 201 });
}, true);
