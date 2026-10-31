import Link from 'next/link';
import { notFound } from 'next/navigation';
import { preparationGuides } from '@/lib/preparation';
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = preparationGuides.find((g) => g.slug === slug);
  if (!guide) notFound();
  return (
    <main className="site-main site-reading">
      <Link href="/interviews" className="site-back">
        ← 返回面经中心
      </Link>
      <article className="site-card guide-article">
        <p className="site-eyebrow">上岸有期 · 原创准备指南</p>
        <h1>{guide.title}</h1>
        <p className="guide-intro">{guide.summary}</p>
        {guide.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
        <div className="site-actions">
          <Link className="button primary" href="/mock">
            练习一次回答
          </Link>
          <Link className="button secondary" href="/review">
            记录我的复盘
          </Link>
        </div>
      </article>
    </main>
  );
}
