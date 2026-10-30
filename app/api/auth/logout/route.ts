import { NextResponse } from 'next/server';
import { api, ApiError } from '@/lib/api';
import { serverSupabase } from '@/lib/supabase/server';
export const POST = api(async () => {
  const db = await serverSupabase();
  const { error } = await db.auth.signOut({ scope: 'local' });
  if (error) throw new ApiError(503, '退出失败，请稍后重试。');
  return NextResponse.json({ redirectTo: '/login' });
}, true);
