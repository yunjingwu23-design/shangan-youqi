import { NextResponse } from 'next/server';
import { api, ApiError, readBody } from '@/lib/api';
import { otpRequestSchema } from '@/lib/validation';
import { clientAddress, consumeLimit } from '@/lib/rate-limit';
import { serverSupabase } from '@/lib/supabase/server';
export const POST = api(async (request) => {
  const { email } = otpRequestSchema.parse(await readBody(request));
  await consumeLimit('send-ip', clientAddress(request), 30, 3600);
  await consumeLimit('send-email-hour', email, 5, 3600);
  await consumeLimit('send-email-minute', email, 1, 60);
  const db = await serverSupabase();
  const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    if (error.status === 429) throw new ApiError(429, '发送过于频繁，请稍后再试。', 60);
    throw new ApiError(503, '邮件暂时无法发送，请稍后重试。');
  }
  return NextResponse.json({ message: '验证码已发送，请查看收件箱或垃圾邮件。', retryAfter: 60 });
}, true);
