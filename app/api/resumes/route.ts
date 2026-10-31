import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, databaseError, readBody } from '@/lib/api';
import { resumeSaveSchema, readResume } from '@/lib/resume';
export const GET = api(async (request) => {
  const { db, userId } = await actor();
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (id) {
    z.uuid().parse(id);
    const { data, error } = await db
      .from('workspace_entries')
      .select('*')
      .eq('kind', 'resume')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();
    databaseError(error);
    if (!data) throw new ApiError(404, '未找到这份简历。');
    return NextResponse.json({ resume: { ...data, ...readResume(data.content, data.id) } });
  }
  const offset = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .parse(params.get('offset') || 0);
  const { data, error, count } = await db
    .from('workspace_entries')
    .select('id,title,company,updated_at', { count: 'exact' })
    .eq('kind', 'resume')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + 49);
  databaseError(error);
  return NextResponse.json({
    resumes: data,
    total: count,
    nextOffset: offset + 50 < (count || 0) ? offset + 50 : null,
  });
});
export const POST = api(async (request) => {
  const input = resumeSaveSchema.parse(await readBody(request));
  const { db, userId } = await actor();
  const values = {
    title: input.title,
    company: input.company,
    content: JSON.stringify(input.document),
  };
  if (input.id) {
    if (!input.expectedUpdatedAt) throw new ApiError(400, '保存前请读取当前简历版本。');
    const { data, error } = await db
      .from('workspace_entries')
      .update(values)
      .eq('id', input.id)
      .eq('kind', 'resume')
      .eq('user_id', userId)
      .eq('updated_at', input.expectedUpdatedAt)
      .select('id,title,company,updated_at')
      .maybeSingle();
    databaseError(error);
    if (!data)
      throw new ApiError(
        409,
        '简历已在其他页面修改，当前编辑内容仍保留。请另存为新版本或重新载入后再编辑。'
      );
    return NextResponse.json({ resume: data });
  }
  const { data, error } = await db
    .from('workspace_entries')
    .insert({ ...values, kind: 'resume', user_id: userId })
    .select('id,title,company,updated_at')
    .single();
  databaseError(error);
  return NextResponse.json({ resume: data }, { status: 201 });
}, true);
