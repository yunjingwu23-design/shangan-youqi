import { siteManager } from '@/lib/catalog-server';
export default async function System() {
  const { userId } = await siteManager();
  return (
    <main className="site-main ia-state-page">
      <div className="site-page-title">
        <p className="site-eyebrow">SYSTEM MANAGEMENT</p>
        <h1>系统管理</h1>
        <p>管理员身份与访问规则。</p>
      </div>
      <section className="site-card">
        <span className="ia-status">管理员身份已验证</span>
        <h2>当前运营账号</h2>
        <p className="site-prose">内部用户 ID：{userId}</p>
        <p>
          沿用原有 site_managers 授权与 PostgreSQL
          RLS。普通用户不能自行授予运营权限。管理员增删目前仍由项目所有者在数据库执行，权限管理界面待开发。
        </p>
        <p>密钥仅由服务端配置，不在后台页面展示或编辑。</p>
      </section>
    </main>
  );
}
