import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';
export function adminSupabase() {
  const { url } = config();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('CONFIG_MISSING');
  // Only rate limiting and explicit account deletion use the administrator.
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
