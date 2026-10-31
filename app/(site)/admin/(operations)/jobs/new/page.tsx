import Link from 'next/link';
import { adminPageIdentity } from '@/lib/admin/page';
import { AdminJobEditor } from '@/components/admin-job-editor';
export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  if (identity.adminRole === 'reviewer')
    return (
      <main className="site-main">
        <h1>当前角色不能录入 JD</h1>
        <p>审核员可以核验、审核和发布已批准的岗位。</p>
        <Link href="/admin/review">进入审核工作台</Link>
      </main>
    );
  return <AdminJobEditor role={identity.adminRole} userId={identity.userId} />;
}
