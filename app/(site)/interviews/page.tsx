import Link from 'next/link';
import { ArrowUpRight, BookOpen, Compass, MessageSquareText } from 'lucide-react';
import { preparationGuides } from '@/lib/preparation';
export default function GuidesPage() {
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">LEARN FROM EVERY CONVERSATION</p>
        <h1>面经与面试准备</h1>
        <p>把经验变成方法，把方法变成自己的练习。</p>
      </div>
      <div className="site-notice">
        以下为本站原创准备指南，不冒充某家公司真实面试题或实时抓取的社区面经。
      </div>
      <div className="guide-grid">
        {preparationGuides.map((guide) => (
          <Link
            className="site-card guide-card"
            key={guide.slug}
            href={`/interviews/${guide.slug}`}
          >
            <BookOpen size={23} />
            <span className="job-badge">{guide.category}</span>
            <h2>{guide.title}</h2>
            <p>{guide.summary}</p>
            <span className="site-text-link">
              阅读指南
              <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </div>
      <div className="home-modules">
        <section className="site-card">
          <Compass size={24} />
          <h2>面经发现与来源追踪</h2>
          <p>后续收录将保留来源与授权标识，当前不展示未经核验的转载或“实时抓取”内容。</p>
        </section>
        <section className="site-card">
          <MessageSquareText size={24} />
          <h2>从阅读走向练习</h2>
          <p>用文字模拟梳理回答，练习后保留自己的问题与复盘。</p>
          <Link href="/mock" className="button secondary">
            开始模拟练习 →
          </Link>
        </section>
        <section className="site-card">
          <h2>资料与导师服务</h2>
          <p>面经商城与真人导师预约尚未开放，不提供虚构库存、导师或付款入口。</p>
          <Link href="/mock#mentor" className="site-text-link">
            了解真人 Mock →
          </Link>
        </section>
      </div>
    </main>
  );
}
