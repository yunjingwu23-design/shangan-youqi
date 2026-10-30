import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, databaseError, readBody } from '@/lib/api';
import { adminSupabase } from '@/lib/supabase/admin';
export const DELETE = api(async (request) => {
  z.object({ confirmation: z.literal('注销账号') })
    .strict()
    .parse(await readBody(request));
  const { db, user } = await actor();
  // Require an OTP-verified login within 10 minutes; token refresh does not count.
  const { data, error: claimsError } = await db.auth.getClaims();
  if (claimsError || !data?.claims) throw new ApiError(401, '请重新登录后注销账号。');
  const methods = data.claims.amr as { method: string; timestamp: number }[] | undefined;
  const recent = methods?.some(
    (item) => item.method === 'otp' && Math.floor(Date.now() / 1000) - item.timestamp < 600
  );
  if (!recent) throw new ApiError(403, '为保护账号，请退出并重新验证邮箱后，在 10 分钟内注销。');
  // The target always comes from the validated session, never from request input.
  const { error } = await adminSupabase().auth.admin.deleteUser(user.id);
  databaseError(error);
  await db.auth.signOut({ scope: 'local' });
  return NextResponse.json({ deleted: true, redirectTo: '/login' });
}, true);
