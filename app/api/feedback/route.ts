import { NextResponse } from 'next/server';
import { ApiError, actor, api, readBody } from '@/lib/api';
import { feedbackInputSchema } from '@/lib/feedback';
import { consumeLimit } from '@/lib/rate-limit';
import { adminSupabase } from '@/lib/supabase/admin';

export const POST = api(async (request) => {
  const input = feedbackInputSchema.parse(await readBody(request, 8000));

  // 未登录用户共享一个限流桶，登录用户按账号独立计数。
  const identity = await actor().catch(() => null);
  await consumeLimit('feedback-submit', identity?.userId || 'anonymous', 10, 600);

  const { data, error } = await adminSupabase()
    .from('user_feedback')
    .insert({
      user_id: identity?.userId || null,
      kind: input.kind,
      content: input.content,
      contact: input.contact?.trim() || null,
      page_path: input.pagePath?.slice(0, 240) || null,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 400) || null,
    })
    .select('id')
    .single();

  if (error || !data?.id) throw new ApiError(503, '反馈暂时没能保存，请稍后重试。');
  return NextResponse.json({ id: data.id, status: 'new' }, { status: 201 });
}, true);
