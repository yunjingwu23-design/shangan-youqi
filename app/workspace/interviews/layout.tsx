import Link from 'next/link';
import './interviews.css';
export const dynamic = 'force-dynamic';
export default async function InterviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="interview-shell">
      {process.env.INTERVIEWS_ENABLED === 'true' ? (
        children
      ) : (
        <main className="interview-page">
          <h1>面试复盘内部测试暂未开放</h1>
          <Link className="button primary" href="/interview-center">
            返回面试中心
          </Link>
        </main>
      )}
    </div>
  );
}
