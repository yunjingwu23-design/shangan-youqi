import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await siteManager();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login?next=%2Fadmin');
    if (error instanceof ApiError && error.status === 403)
      return (
        <main className="site-main site-empty">
          <h1>管理后台</h1>
          <p>当前账号没有运营权限。后台仅向已授权管理员开放。</p>
          <Link href="/jobs" className="button secondary">
            返回找岗位
          </Link>
        </main>
      );
    throw error;
  }
  return children;
}
