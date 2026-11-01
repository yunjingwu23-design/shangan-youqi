import { createClient } from '@supabase/supabase-js';
async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing existing Supabase server configuration');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc('cleanup_site_analytics');
  if (error) throw new Error('ANALYTICS_CLEANUP_FAILED');
  console.log(`Removed ${data} expired analytics events.`);
}
void main().catch(() => {
  console.error('ANALYTICS_CLEANUP_FAILED');
  process.exitCode = 1;
});
