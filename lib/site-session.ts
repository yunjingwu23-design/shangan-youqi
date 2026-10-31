import 'server-only';
import { redirect } from 'next/navigation';
import { actor, ApiError } from '@/lib/api';
import { serverSupabase } from '@/lib/supabase/server';
export async function siteSession() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return null;
  try {
    const db = await serverSupabase();
    const { data, error } = await db.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}
export async function requireSiteUser(path: string) {
  try {
    return await actor();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect(`/login?next=${encodeURIComponent(path)}`);
    throw error;
  }
}
