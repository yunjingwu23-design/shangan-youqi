import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, readBody } from '@/lib/api';
import { salarySchema } from '@/lib/salary/model';
import { salaryError } from '@/lib/salary/server';
export const GET = api(async () => {
  const { db, userId } = await actor();
  const r = await db
    .from('salary_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  salaryError(r.error);
  return NextResponse.json({ reports: r.data });
});
export const POST = api(async (req) => {
  const input = salarySchema.parse(await readBody(req, 8000));
  const { db, userId } = await actor();
  const r = await db
    .from('salary_reports')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  salaryError(r.error);
  return NextResponse.json({ report: r.data }, { status: 201 });
}, true);
export const PATCH = api(async (req) => {
  const { id, version, ...input } = salarySchema
    .safeExtend({ id: z.uuid(), version: z.number().int().positive() })
    .parse(await readBody(req, 8000));
  const { db, userId } = await actor();
  const r = await db
    .from('salary_reports')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('version', version)
    .select()
    .maybeSingle();
  salaryError(r.error);
  if (!r.data) throw new ApiError(409, '记录已更新或不存在，请刷新后重试。');
  return NextResponse.json({ report: r.data });
}, true);
export const DELETE = api(async (req) => {
  const { id } = z
    .object({ id: z.uuid() })
    .strict()
    .parse(await readBody(req, 1000));
  const { db, userId } = await actor();
  const r = await db
    .from('salary_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  salaryError(r.error);
  if (!r.data) throw new ApiError(404, '记录不存在。');
  return NextResponse.json({ deleted: true });
}, true);
