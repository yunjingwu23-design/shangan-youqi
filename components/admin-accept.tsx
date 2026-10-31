'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminCall } from '@/lib/admin/client';
export function AdminAccept({ token, email }: { token: string; email: string | null }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <main className="site-main admin-main">
      <section className="site-card admin-invite-accept">
        <p className="site-eyebrow">JOIN THE OPERATIONS TEAM</p>
        <h1>领取管理员邀请</h1>
        <p>邀请仅限指定邮箱使用，角色由超级管理员确定。登录不会自动获得后台权限。</p>
        {!token ? (
          <p className="site-error">邀请链接缺少凭证，请使用完整邀请链接。</p>
        ) : !email ? (
          <Link
            className="button primary"
            href={'/login?next=' + encodeURIComponent('/admin/accept?token=' + token)}
          >
            使用被邀请邮箱登录
          </Link>
        ) : (
          <>
            <p>当前邮箱：{email}</p>
            <p>若与被邀请邮箱不同，请先切换到正确账号。</p>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError('');
                void adminCall('/api/admin/invitations/accept', 'POST', { token })
                  .then(() => {
                    router.push('/admin');
                    router.refresh();
                  })
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              验证并领取邀请
            </button>
          </>
        )}
        {error && (
          <p className="site-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
