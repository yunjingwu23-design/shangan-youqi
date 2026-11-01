import { NextResponse } from 'next/server';
import { api, ApiError, readBody } from '@/lib/api';
import { otpVerifySchema } from '@/lib/validation';
import { clientAddress, consumeLimit } from '@/lib/rate-limit';
import { serverSupabase } from '@/lib/supabase/server';
export const POST = api(async (request) => {
  const { email, token } = otpVerifySchema.parse(await readBody(request));
  await consumeLimit('verify-ip', clientAddress(request), 60, 600);
  await consumeLimit('verify-email', email, 10, 600);
  const db = await serverSupabase();
  const { data, error } = await db.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.user || !data.session)
    throw new ApiError(400, '验证码无效或已过期，请检查后重试。');
  const audit = await db.rpc('admin_record_login');
  if (audit.error && audit.error.code !== 'PGRST202') console.error('ADMIN_LOGIN_AUDIT_FAILED');
  return NextResponse.json({ redirectTo: '/workspace' });
}, true);
