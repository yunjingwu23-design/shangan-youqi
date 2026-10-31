import Link from 'next/link';
import { preparationGuides } from '@/lib/preparation';
export default function Plan() {
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">MAKE ROOM FOR PREPARATION</p>
        <h1>面试准备计划</h1>
        <p>先读方法，再练表达，面试后及时复盘。</p>
      </div>
      <div className="ia-hub-grid">
        <section className="site-card">
          <span className="ia-status">现在可以开始</span>
          <h2>按这三个步骤准备</h2>
          <ol className="ia-plan-list">
            <li>对照真实 JD 和简历，梳理自己的经历与证据。</li>
            <li>做一次文字面试练习，检查回答是否具体。</li>
            <li>面试后整理实际问答，记录下一步行动。</li>
          </ol>
          <div className="site-actions">
            <Link href="/interview-center/practice" className="button primary">
              开始文字练习 →
            </Link>
            <Link href="/interview-center/notes" className="button secondary">
              写复盘笔记
            </Link>
          </div>
        </section>
        <section className="site-card">
          <span className="ia-status pending">个性化计划开发中</span>
          <h2>让准备更有节奏</h2>
          <p>按岗位制定任务、勾选完成情况、日程提醒仍在开发中，当前不会自动创建任务或发送提醒。</p>
          <h3>先读一份准备指南</h3>
          {preparationGuides.slice(0, 2).map((guide) => (
            <Link key={guide.slug} className="site-text-link" href={`/resources/${guide.slug}`}>
              {guide.title} →
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
