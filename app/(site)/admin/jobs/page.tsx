import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { redirect } from 'next/navigation';
import { CatalogAdmin } from '@/components/catalog-admin';
export default async function AdminPage() {
  try {
    await siteManager();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login?next=%2Fadmin%2Fjobs');
    if (error instanceof ApiError && error.status === 403)
      return (
        <main className="site-main site-empty">
          <h1>岗位运营</h1>
          <p>当前账号没有岗位运营权限。</p>
          <Link href="/jobs" className="button secondary">
            返回岗位广场
          </Link>
        </main>
      );
    throw error;
  }
  return <CatalogAdmin />;
}
