import Link from 'next/link';
import { SiteHeader } from '@/components/site-navigation';
import { siteSession } from '@/lib/site-session';
import './site.css';
export const dynamic = 'force-dynamic';
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await siteSession();
  return (
    <div className="site-shell">
      <SiteHeader signedIn={Boolean(user)} />
      {children}
      <footer className="site-footer">
        <div>
          <strong>上岸有期</strong>
          <p>让每一步，都离上岸更近。</p>
        </div>
        <nav aria-label="页脚导航">
          <Link href="/jobs">找岗位</Link>
          <Link href="/resume">编辑简历</Link>
          <Link href="/mock">准备面试</Link>
          <Link href="/admin/jobs">岗位运营</Link>
        </nav>
        <small>招聘状态以原始来源为准，个人资料仅对自己可见。</small>
      </footer>
    </div>
  );
}
