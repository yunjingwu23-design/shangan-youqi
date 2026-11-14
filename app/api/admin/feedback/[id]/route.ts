import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, api, readBody } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { feedbackUpdateSchema } from '@/lib/feedback';
import { adminSupabase } from '@/lib/supabase/admin';

export const PATCH = api(async (request) => {
  await siteManager();
  const id = z.uuid().parse(new URL(request.url).pathname.split('/').at(-1));
  const input = feedbackUpdateSchema.parse(await readBody(request, 4000));

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status) patch.status = input.status;
  if (input.adminNote !== undefined) patch.admin_note = input.adminNote || null;

  const { error } = await adminSupabase().from('user_feedback').update(patch).eq('id', id);
  if (error) throw new ApiError(503, '状态更新失败，请稍后重试。');
  return NextResponse.json({ ok: true });
}, true);
