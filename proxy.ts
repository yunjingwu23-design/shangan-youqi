import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();
  let response = NextResponse.next({ request });
  const secure = (process.env.APP_URL || '').startsWith('https://');
  const db = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure, path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure })
        );
      },
    },
  });
  // Verified remotely; never trust getSession() alone for authorization.
  await db.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: [
    '/',
    '/login',
    '/jobs/:path*',
    '/interviews/:path*',
    '/interview-center/:path*',
    '/resources/:path*',
    '/search',
    '/resume/:path*',
    '/review',
    '/mock',
    '/admin/:path*',
    '/workspace/:path*',
    '/api/:path*',
  ],
};
