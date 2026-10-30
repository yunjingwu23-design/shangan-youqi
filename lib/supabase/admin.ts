import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';
export function adminSupabase() {
  const { url } = config();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('CONFIG_MISSING');
  // Reserved for rate limiting, authenticated account deletion and private audio
  // capabilities/cleanup after ownership checks. Business rows use user sessions.
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
