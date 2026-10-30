import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
export async function serverSupabase() {
  const jar = await cookies();
  const { url, key, secure } = config();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure, path: '/' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) =>
            jar.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure })
          );
        } catch {
          /* Server components cannot set cookies; proxy.ts refreshes them. */
        }
      },
    },
  });
}
