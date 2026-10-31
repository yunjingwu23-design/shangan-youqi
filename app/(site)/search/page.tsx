import Link from 'next/link';
import { publishedCatalog } from '@/lib/catalog-server';
import { exampleJobs, filterJobs } from '@/lib/catalog';
import { preparationGuides } from '@/lib/preparation';
import { siteSession } from '@/lib/site-session';
import { actor } from '@/lib/api';
import { entryPresentation } from '@/lib/entry-presentation';
import type { Entry } from '@/lib/validation';
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams,
    q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const [catalog, user] = await Promise.all([publishedCatalog(), siteSession()]);
  const preview = !catalog.jobs.length,
    jobs = q
      ? filterJobs(preview ? exampleJobs : catalog.jobs, { q, mode: 'fuzzy' }).slice(0, 12)
      : [];
  const guides = q
    ? preparationGuides.filter((guide) =>
        `${guide.title} ${guide.summary} ${guide.category}`
          .toLocaleLowerCase()
          .includes(q.toLocaleLowerCase())
      )
    : [];
  let records: Entry[] = [],
    personalAvailable = true;
  if (user && q) {
    try {
      const { db, userId } = await actor();
      const { data, error } = await db
        .from('workspace_entries')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) personalAvailable = false;
      else
        records = (data || [])
          .filter((entry) =>
            `${entry.title} ${entry.company}`.toLocaleLowerCase().includes(q.toLocaleLowerCase())
          )
          .slice(0, 20);
    } catch {
      personalAvailable = false;
    }
  }
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">FIND YOUR NEXT STEP</p>
        <h1>全站搜索</h1>
        <p>搜索岗位与公司别名、免费面经，以及自己最近的求职记录。</p>
      </div>
      <form action="/search" className="ia-search-form" role="search">
        <label htmlFor="site-query" className="sr-only">
          搜索关键词
        </label>
        <input
          id="site-query"
          name="q"
          defaultValue={q}
          placeholder="公司、岗位、面经或记录标题"
          maxLength={100}
        />
        <button className="button primary">搜索</button>
      </form>
      {!q ? (
        <section className="site-empty">
          <h2>从一个关键词开始</h2>
          <p>例如：中金、产品、行为面试。</p>
        </section>
      ) : (
        <>
          <section className="ia-results-section">
            <h2>岗位 · {jobs.length}</h2>
            {preview && (
              <p className="ia-draft-note">正式岗位暂无可用结果时展示交互样品，非实时招聘。</p>
            )}
            {jobs.map((job) => (
              <Link
                href={`/jobs/${job.id}`}
                key={job.id}
                className="site-card"
                style={{ display: 'block' }}
              >
                <strong>{job.title}</strong>
                <p>
                  {job.company} · {job.city}
                  {preview ? ' · 样品' : ''}
                </p>
              </Link>
            ))}
            {!jobs.length && <p className="muted">没有匹配岗位。</p>}
            <Link className="site-text-link" href={'/jobs?q=' + encodeURIComponent(q)}>
              到找岗位继续筛选 →
            </Link>
          </section>
          <section className="ia-results-section">
            <h2>免费面经与指南 · {guides.length}</h2>
            {guides.map((guide) => (
              <Link
                className="site-card"
                style={{ display: 'block' }}
                href={'/resources/' + guide.slug}
                key={guide.slug}
              >
                <strong>{guide.title}</strong>
                <p>{guide.summary}</p>
              </Link>
            ))}
            {!guides.length && <p className="muted">没有匹配面经。</p>}
          </section>
          <section className="ia-results-section">
            <h2>我的记录 · {records.length}</h2>
            {!user ? (
              <p className="site-notice">
                <Link
                  href={'/login?next=' + encodeURIComponent('/search?q=' + encodeURIComponent(q))}
                >
                  登录后搜索自己的投递、简历和面试记录 →
                </Link>
              </p>
            ) : !personalAvailable ? (
              <p className="site-error">个人记录暂时无法加载，请稍后重试。</p>
            ) : (
              <>
                {records.map((entry) => (
                  <Link
                    className="site-card"
                    style={{ display: 'block' }}
                    key={entry.id}
                    href={
                      entryPresentation(entry).editor ||
                      (entry.kind === 'favorite'
                        ? '/workspace/favorites'
                        : entry.kind === 'resume'
                          ? '/resume?id=' + entry.id
                          : entry.kind === 'interview_review'
                            ? '/interview-center/notes?id=' + entry.id
                            : '/workspace?entry=' + entry.id)
                    }
                  >
                    <strong>{entry.title}</strong>
                    <p>{entry.company || '我的私人记录'}</p>
                  </Link>
                ))}
                {!records.length && (
                  <p className="muted">在最近 200 条个人记录的标题与公司中没有匹配结果。</p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
