'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LoginForm } from '@/components/login-form';
import { adminCall } from '@/lib/admin/client';
import { adminRoles } from '@/lib/admin/model';
import type { InvitationDetails } from '@/lib/admin/invitations';

export function AdminAccept({
  token,
  email,
  invitation,
  codeSent,
  cooldown,
  unavailable,
}: {
  token: string;
  email: string | null;
  invitation: InvitationDetails | null;
  codeSent: boolean;
  cooldown: number;
  unavailable?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const claim = useRef<{ token: string; promise: Promise<unknown> } | null>(null);
  const matched = !!email && email.toLowerCase() === invitation?.email.toLowerCase();
  useEffect(() => {
    if (!matched || !invitation) return;
    if (invitation.state === 'accepted') {
      router.replace('/admin');
      router.refresh();
      return;
    }
    let active = true;
    if (!claim.current || claim.current.token !== token)
      claim.current = {
        token,
        promise: adminCall('/api/admin/invitations/accept', 'POST', { token }),
      };
    claim.current.promise
      .then(() => {
        if (active) {
          router.replace('/admin');
          router.refresh();
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [matched, token, invitation?.state, attempt, router]);
  return (
    <main className="site-main admin-main">
      <section className="site-card admin-invite-accept">
        <p className="site-eyebrow">JOIN THE OPERATIONS TEAM</p>
        <h1>加入上岸有期运营后台</h1>
        {!invitation ? (
          <p className="site-error" role="alert">
            {unavailable || '邀请不存在、已撤销或已过期，请联系邀请人重新发送。'}
          </p>
        ) : (
          <>
            <p>被邀请邮箱：{invitation.email}</p>
            <p>邀请角色：{adminRoles[invitation.role]}。验证此邮箱后，会自动完成邀请并进入后台。</p>
            {invitation.state === 'accepted' ? (
              <>
                <p>此邀请已使用。已加入的成员可直接登录后台，权限以当前账号设置为准。</p>
                <Link className="button primary" href="/admin">
                  进入管理后台
                </Link>
              </>
            ) : !email ? (
              <LoginForm
                nextPath={'/admin/accept?token=' + encodeURIComponent(token)}
                initialEmail={invitation.email}
                initialCodeSent={codeSent}
                initialCooldown={cooldown}
                lockEmail
                showAlternatives={false}
                verificationLabel="验证并进入后台"
              />
            ) : !matched ? (
              <>
                <p className="site-notice">当前登录邮箱：{email}。请切换为被邀请邮箱后继续。</p>
                <Link href="/workspace/settings" className="button secondary">
                  切换登录账号
                </Link>
              </>
            ) : !error ? (
              <p role="status" className="site-success">
                邮箱已验证，正在自动加入并进入后台…
              </p>
            ) : null}
          </>
        )}
        {error && (
          <>
            <p className="site-error" role="alert">
              {error}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                claim.current = null;
                setError('');
                setAttempt((value) => value + 1);
              }}
            >
              重试
            </button>
            <Link href="/admin" className="site-text-link">
              已有后台权限？直接进入
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
