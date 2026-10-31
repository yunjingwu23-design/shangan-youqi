import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import { clientAddress, consumeLimit } from '@/lib/rate-limit';
import { adminSupabase } from '@/lib/supabase/admin';
import { adminError } from './server';
import type { AdminRole } from './model';

export function invitationUrl(token: string, emailed = false) {
  return (
    config().origin +
    '/admin/accept?' +
    new URLSearchParams({ token, ...(emailed ? { sent: '1' } : {}) })
  );
}
export async function sendInvitationEmail(request: Request, email: string, token: string) {
  await consumeLimit('admin-invite-email-ip', clientAddress(request), 30, 3600);
  await consumeLimit('send-email-hour', email, 5, 3600);
  await consumeLimit('send-email-minute', email, 1, 60);
  const { url, key } = config();
  // Stateless public Auth client: reuse project SMTP without changing inviter cookies.
  const mailer = createClient(url, key, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
  const { error } = await mailer.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: invitationUrl(token, true),
    },
  });
  if (error?.status === 429) throw new ApiError(429, '邀请邮件发送过于频繁，请稍后重试。', 60);
  if (error) throw new ApiError(503, '邀请已创建，邮件暂时发送失败。可复制下方链接，或稍后重试。');
}
export type InvitationDetails = {
  email: string;
  role: AdminRole;
  state: 'pending' | 'accepted';
  createdAt: string;
};
export async function invitationDetails(token: string): Promise<InvitationDetails | null> {
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(token)) return null;
  const trusted = adminSupabase();
  const result = await trusted
    .from('admin_invitations')
    .select('email,role,state,created_at,expires_at,created_by')
    .eq('token_hash', createHash('sha256').update(token).digest('hex'))
    .maybeSingle();
  adminError(result.error);
  const record = result.data;
  if (
    !record ||
    !record.created_by ||
    record.state === 'revoked' ||
    new Date(record.expires_at).getTime() <= Date.now()
  )
    return null;
  const inviter = await trusted
    .from('admin_memberships')
    .select('role,active')
    .eq('user_id', record.created_by)
    .maybeSingle();
  adminError(inviter.error);
  if (!inviter.data?.active || inviter.data.role !== 'super_admin') return null;
  return {
    email: record.email,
    role: record.role,
    state: record.state,
    createdAt: record.created_at,
  };
}
