import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, readBody } from '@/lib/api';
import { schedulePatchSchema } from '@/lib/validation';
import { scheduleSchemaMissing, scheduleWriteError } from '@/lib/schedule-server';

type Context = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid('日程不存在');

export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    const id = idSchema.parse((await context.params).id);
    const input = schedulePatchSchema.parse(await readBody(request));
    if (Object.keys(input).length === 0) throw new ApiError(400, '没有需要更新的内容。');
    const { db, userId } = await actor();
    const { data, error } = await db
      .from('schedule_events')
      .update({
        ...input,
        ...(input.starts_at ? { starts_at: new Date(input.starts_at).toISOString() } : {}),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    scheduleWriteError(error);
    if (!data) throw new ApiError(404, '日程不存在或已被删除。');
    return NextResponse.json({ event: data });
  }, true)(request);
}

export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    const id = idSchema.parse((await context.params).id);
    const { db, userId } = await actor();
    const { data, error } = await db
      .from('schedule_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (scheduleSchemaMissing(error)) throw new ApiError(503, '日程功能尚未初始化。');
    if (error) throw new ApiError(503, '暂时无法删除日程，请稍后重试。');
    if (!data) throw new ApiError(404, '日程不存在或已被删除。');
    return NextResponse.json({ deleted: true });
  }, true)(request);
}
