import Link from 'next/link';
import { redirect } from 'next/navigation';
import { actor, ApiError } from '@/lib/api';
import { Brand } from '@/components/brand';
import './interviews.css';
export const dynamic = 'force-dynamic';
export default async function InterviewLayout({ children }: { children: React.ReactNode }) {
  try {
    await actor();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login?reason=expired');
    throw error;
  }
  return (
    <div className="interview-shell">
      <header className="interview-header">
        <Brand />
        <nav>
          <Link href="/workspace">求职工作台</Link>
          <Link href="/workspace/interviews">复盘记录</Link>
          <span className="interview-badge">内部测试</span>
        </nav>
      </header>
      {process.env.INTERVIEWS_ENABLED === 'true' ? (
        children
      ) : (
        <main className="interview-page">
          <h1>面试复盘内部测试暂未开放</h1>
          <Link className="button primary" href="/workspace">
            返回工作台
          </Link>
        </main>
      )}
    </div>
  );
}
