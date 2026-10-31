import type { Metadata } from 'next';
import './globals.css';
import './(site)/site.css';
import './ia.css';
import './resume-files.css';
import { SiteChrome } from '@/components/site-navigation';
import { siteSession } from '@/lib/site-session';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '上岸有期 · 让每一步，都离上岸更近',
  description: '属于你的求职工作空间。记录投递、整理简历，让每一次努力都有迹可循。',
  robots: { index: false, follow: false },
};
export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await siteSession();
  return (
    <html lang="zh-CN">
      <body>
        <SiteChrome signedIn={Boolean(user)} scope={user?.id || 'guest'}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
