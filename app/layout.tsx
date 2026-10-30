import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '上岸有期 · 让每一步，都离上岸更近',
  description: '属于你的求职工作空间。记录投递、整理简历，让每一次努力都有迹可循。',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
