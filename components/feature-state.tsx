import Link from 'next/link';
export function FeatureState({
  title,
  description,
  details,
  href,
  action,
  status = '开发中',
}: {
  title: string;
  description: string;
  details: string[];
  href: string;
  action: string;
  status?: string;
}) {
  return (
    <main className="site-main ia-state-page">
      <div className="site-page-title">
        <p className="site-eyebrow">ONE STEP AT A TIME</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <section className="site-card">
        <span className="ia-status pending">{status}</span>
        <h2>我们正在准备这些能力</h2>
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
        <p>目前尚未开放，此页面保留功能位置。你可以先继续使用已开放的功能。</p>
        <Link className="button secondary" href={href}>
          {action} →
        </Link>
      </section>
    </main>
  );
}
