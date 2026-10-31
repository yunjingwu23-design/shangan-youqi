import Link from 'next/link';
import { ArrowUpRight, BookOpen, Compass, MessageSquareText } from 'lucide-react';
import { preparationGuides } from '@/lib/preparation';
export default function GuidesPage() {
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">LEARN FROM EVERY CONVERSATION</p>
        <h1>免费面经与准备指南</h1>
        <p>把经验变成方法，把方法变成自己的练习。</p>
      </div>
      <div className="site-notice">
        以下为本站原创准备指南，不冒充某家公司真实面试题或实时抓取的社区面经。
      </div>
      <div className="guide-grid">
        {preparationGuides.map((guide) => (
          <Link className="site-card guide-card" key={guide.slug} href={`/resources/${guide.slug}`}>
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
    </main>
  );
}
