import 'server-only';
export function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const origin = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
  if (!url || !key) throw new Error('CONFIG_MISSING');
  if (
    process.env.NODE_ENV === 'production' &&
    !origin.startsWith('https://') &&
    !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
  )
    throw new Error('CONFIG_MISSING');
  return { url, key, origin, secure: origin.startsWith('https://') };
}
