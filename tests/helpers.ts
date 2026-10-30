import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { setTimeout } from 'node:timers/promises';
process.loadEnvFile('.env.local');
export const base = process.env.APP_URL || 'http://localhost:3000';
export const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// These tests intentionally create/delete data; refuse a hosted target.
if (new URL(dbUrl).hostname !== '127.0.0.1' || new URL(base).hostname !== 'localhost')
  throw new Error('Tests only run against the local development stack');
export const admin = createClient(dbUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export async function mailboxCode(email: string, previousCode?: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch('http://127.0.0.1:54324/api/v1/messages');
    const data = await response.json();
    const message = data.messages?.find((item: { To: { Address: string }[] }) =>
      item.To.some((to) => to.Address === email)
    );
    if (message) {
      const body = await (
        await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)
      ).json();
      const code = (body.Text || body.HTML || '').match(/\b[0-9]{6,10}\b/)?.[0];
      if (code && code !== previousCode) return code as string;
    }
    await setTimeout(250);
  }
  throw new Error('No OTP email delivered to local mailbox');
}
export class SessionClient {
  cookies = new Map<string, string>();
  async request(path: string, method = 'GET', body?: unknown, origin: string | null = base) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
    };
    if (origin !== null) headers.Origin = origin;
    const response = await fetch(base + path, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const first = cookie.split(';')[0];
      const i = first.indexOf('=');
      const key = first.slice(0, i);
      const value = first.slice(i + 1);
      if (value) this.cookies.set(key, value);
      else this.cookies.delete(key);
    }
    const data = await response.json();
    return { response, data };
  }
  async authenticate(email: string) {
    const send = await this.request('/api/auth/otp', 'POST', { email });
    if (send.response.status !== 200)
      throw new Error(`OTP request failed: ${JSON.stringify(send.data)}`);
    const code = await mailboxCode(email);
    const verify = await this.request('/api/auth/verify', 'POST', { email, token: code });
    if (verify.response.status !== 200)
      throw new Error(`OTP verify failed: ${JSON.stringify(verify.data)}`);
    return code;
  }
  async database() {
    const ssr = createServerClient(dbUrl, anonKey, {
      cookies: {
        getAll: () => [...this.cookies].map(([name, value]) => ({ name, value })),
        setAll: () => {},
      },
    });
    const {
      data: { session },
    } = await ssr.auth.getSession();
    if (!session) throw new Error('No authenticated session');
    const db = createClient(dbUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { db, session };
  }
}
