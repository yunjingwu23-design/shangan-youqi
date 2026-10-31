import { redirect } from 'next/navigation';
import { safeReturnPath } from '@/lib/navigation';
import { serverSupabase } from '@/lib/supabase/server';
import { LoginForm } from '@/components/login-form';
import { Check, Layers3, LockKeyhole, MoveUpRight } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const nextPath = safeReturnPath((await searchParams).next);
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const db = await serverSupabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user) redirect(nextPath);
  }
  return (
    <div className="login-shell">
      <main className="login-main">
        <section className="login-story" aria-labelledby="story-heading">
          <p className="eyebrow">
            <span className="tiny-line" /> YOUR NEXT CHAPTER
          </p>
          <h1 id="story-heading">
            上岸有期，
            <br />
            未来<span className="underline-accent">可期。</span>
            <MoveUpRight className="hero-arrow" strokeWidth={1.1} />
          </h1>
          <p className="story-copy">
            让每一次投递有迹可循，
            <br />
            让每一份努力，离理想更近一步。
          </p>
          <div className="story-card">
            <div className="story-card-head">
              <span>
                <Layers3 size={16} /> 属于你的求职工作空间
              </span>
              <span className="live-dot">持续向前</span>
            </div>
            <div className="journey">
              <div className="journey-node done">
                <span>
                  <Check size={15} />
                </span>
                <b>发现机会</b>
                <small>保持好奇</small>
              </div>
              <div className="journey-line" />
              <div className="journey-node active">
                <span>02</span>
                <b>认真准备</b>
                <small>积累每一步</small>
              </div>
              <div className="journey-line" />
              <div className="journey-node">
                <span>03</span>
                <b>如期上岸</b>
                <small>遇见可能</small>
              </div>
            </div>
            <p>不必和别人比较进度，按自己的节奏前进。</p>
          </div>
          <div className="story-foot">
            <span>01 — 记录努力</span>
            <span>02 — 沉淀成长</span>
            <span>03 — 迎接机会</span>
          </div>
        </section>
        <section className="login-panel" aria-label="邮箱登录">
          <div className="login-panel-inner">
            <div className="panel-eyebrow">WELCOME TO YOUR WORKSPACE</div>
            <h2>下一站，从这里开始</h2>
            <p className="form-description">登录上岸有期，继续你的求职旅程。</p>
            <LoginForm nextPath={nextPath} />
            <div className="privacy-note">
              <LockKeyhole size={15} />
              <span>个人资料与求职记录，仅对你自己可见。</span>
            </div>
          </div>
        </section>
      </main>
      <footer className="login-footer">
        <span>© {new Date().getFullYear()} 上岸有期</span>
        <span>把不确定的未来，变成一步步的行动。</span>
        <span>MADE FOR YOUR NEXT STEP ↗</span>
      </footer>
    </div>
  );
}
