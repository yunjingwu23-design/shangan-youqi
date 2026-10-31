import { z } from 'zod';
import { NextResponse } from 'next/server';
import { api, actor, ApiError, databaseError, readBody } from '@/lib/api';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    z.uuid().parse(id);
    const { kind } = z
      .object({ kind: z.enum(['application', 'favorite']) })
      .strict()
      .parse(await readBody(request));
    const { db } = await actor();
    const { data, error } = await db.rpc('save_catalog_job', { job: id, entry_kind: kind });
    if (error?.message === 'JOB_NOT_FOUND') throw new ApiError(404, '岗位未发布或已结束。');
    databaseError(error);
    return NextResponse.json(data);
  }, true)(request);
}
