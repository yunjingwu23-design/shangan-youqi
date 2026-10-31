import Link from 'next/link';
import { adminPageIdentity } from '@/lib/admin/page';
import { AdminTeam } from '@/components/admin-team';
import { adminRoles } from '@/lib/admin/model';
export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return (
    <main className="site-main admin-main">
      <div className="site-page-title">
        <p className="site-eyebrow">ADMINISTRATION</p>
        <h1>系统管理</h1>
        <p>管理员账号、角色和邀请管理。</p>
      </div>
      <section className="site-card">
        <span className="ia-status">管理员身份已验证</span>
        <h2>当前运营账号</h2>
        <p>
          {identity.user.email} · {adminRoles[identity.adminRole]}
        </p>
        <p>内部用户 ID：{identity.userId}</p>
        <Link className="site-text-link" href="/admin/logs">
          查看操作日志 →
        </Link>
      </section>
      {identity.adminRole === 'super_admin' ? (
        <AdminTeam />
      ) : (
        <section className="site-card">
          <h2>账号管理仅向超级管理员开放</h2>
          <p>
            当前角色可以继续进行岗位运营。管理员邀请、角色变更和停用由超级管理员执行，不能自行提权。
          </p>
        </section>
      )}
    </main>
  );
}
