import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, databaseError, readBody } from '@/lib/api';
import { entrySchema, entryPatchSchema, kindSchema } from '@/lib/validation';
export const GET = api(async (request) => {
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind') ? kindSchema.parse(params.get('kind')) : null;
  const offset = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .parse(params.get('offset') || 0);
  const { db, userId } = await actor();
  let query = db
    .from('workspace_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + 49);
  if (kind) query = query.eq('kind', kind);
  const { data, error, count } = await query;
  databaseError(error);
  return NextResponse.json({
    entries: data,
    total: count,
    nextOffset: offset + 50 < (count || 0) ? offset + 50 : null,
  });
});
export const POST = api(async (request) => {
  const input = entrySchema.parse(await readBody(request));
  const { db, userId } = await actor();
  const { data, error } = await db
    .from('workspace_entries')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  databaseError(error);
  return NextResponse.json({ entry: data }, { status: 201 });
}, true);
export const PATCH = api(async (request) => {
  const { id, ...input } = entryPatchSchema.parse(await readBody(request));
  const { db, userId } = await actor();
  const { data, error } = await db
    .from('workspace_entries')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, '记录不存在。');
  return NextResponse.json({ entry: data });
}, true);
export const DELETE = api(async (request) => {
  const { id } = z
    .object({ id: z.string().uuid() })
    .strict()
    .parse(await readBody(request));
  const { db, userId } = await actor();
  const { data, error } = await db
    .from('workspace_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, '记录不存在。');
  return NextResponse.json({ deleted: true });
}, true);
