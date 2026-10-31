import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  FileText,
  Headphones,
  BookOpen,
  Search,
} from 'lucide-react';
import { publishedCatalog } from '@/lib/catalog-server';
import { exampleJobs, jobTypes } from '@/lib/catalog';
import { siteSession } from '@/lib/site-session';
import { actor } from '@/lib/api';
import { type Entry, statusLabels } from '@/lib/validation';
export default async function Home() {
  const [catalog, user] = await Promise.all([publishedCatalog(), siteSession()]);
  const preview = !catalog.jobs.length;
  const jobs = (preview ? exampleJobs : catalog.jobs).slice(0, 3);
  let recent: Entry[] = [],
    recentAvailable = true;
  if (user) {
    try {
      const { db, userId } = await actor();
      const { data, error } = await db
        .from('workspace_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('kind', 'application')
        .order('updated_at', { ascending: false })
        .limit(3);
      if (error) recentAvailable = false;
      else recent = data || [];
    } catch {
      recentAvailable = false;
    }
  }
  const actions = [
    {
      href: '/jobs',
      title: '找一个好机会',
      text: '筛选实习与校招岗位',
      label: '找岗位',
      icon: BriefcaseBusiness,
    },
    {
      href: '/workspace',
      title: '推进我的求职',
      text: '跟进投递，打磨简历',
      label: '我的求职',
      icon: FileText,
    },
    {
      href: '/interview-center',
      title: '为面试做准备',
      text: '练习、复盘，持续进步',
      label: '面试中心',
      icon: Headphones,
    },
    {
      href: '/resources',
      title: '读一点好面经',
      text: '从经验里找到方法',
      label: '面经资料',
      icon: BookOpen,
    },
  ];
  return (
    <main className="site-main">
      <section className="ia-hero">
        <p className="site-eyebrow">YOUR CAREER, YOUR WAY</p>
        <h1>
          把下一步，<span>走得更清楚。</span>
        </h1>
        <p>
          从一份好机会，到一场有准备的面试。
          <br />
          按自己的节奏，向理想靠近。
        </p>
        <form action="/search" className="home-search" role="search">
          <Search size={20} />
          <label className="sr-only" htmlFor="home-query">
            全站搜索
          </label>
          <input
            id="home-query"
            name="q"
            placeholder="搜索岗位、公司、面经或我的记录"
            maxLength={100}
          />
          <button className="button primary" type="submit">
            搜索
            <ArrowRight size={16} />
          </button>
        </form>
      </section>
      <section className="ia-home-section" aria-labelledby="actions-heading">
        <div className="site-section-title">
          <h2 id="actions-heading">今天想先做哪一步？</h2>
        </div>
        <div className="ia-action-grid">
          {actions.map(({ href, title, text, label, icon: Icon }) => (
            <Link className="ia-action-card" href={href} key={href}>
              <Icon size={25} strokeWidth={1.6} />
              <h3>{title}</h3>
              <p>{text}</p>
              <span>
                {label}
                <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="ia-home-section" aria-labelledby="jobs-heading">
        <div className="site-section-title">
          <h2 id="jobs-heading">最新精选岗位</h2>
          <Link href="/jobs">
            查看全部
            <ArrowUpRight size={16} />
          </Link>
        </div>
        {preview && (
          <p className="ia-draft-note">
            {catalog.available ? '正式岗位正在准备中' : '正式岗位暂时无法加载'}
            ，以下为交互样品，非实时招聘。
          </p>
        )}
        <div className="ia-featured-grid">
          {jobs.map((job) => (
            <Link className="site-card" href={`/jobs/${job.id}`} key={job.id}>
              <span className="job-badge">{jobTypes[job.type]}</span>
              <h3>{job.title}</h3>
              <p>
                {job.company} · {job.city}
              </p>
              <small className="muted">
                {preview
                  ? '样品预览'
                  : `核验于 ${new Date(job.verified_at!).toLocaleDateString('zh-CN')}`}
              </small>
            </Link>
          ))}
        </div>
      </section>
      {user && (
        <section className="ia-home-section" aria-labelledby="recent-heading">
          <div className="site-section-title">
            <h2 id="recent-heading">近期求职事项</h2>
            <Link href="/workspace">
              进入工作台
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="ia-recent-list">
            {recent.map((entry) => (
              <Link className="ia-recent-item" key={entry.id} href={`/workspace?entry=${entry.id}`}>
                <div>
                  {entry.title}
                  <small>
                    {entry.company || '我的投递'} · 更新于{' '}
                    {new Date(entry.updated_at).toLocaleDateString('zh-CN')}
                  </small>
                </div>
                <span className={`status-badge ${entry.status}`}>{statusLabels[entry.status]}</span>
                <ArrowRight size={16} />
              </Link>
            ))}
            {!recent.length && (
              <div className="ia-recent-item">
                <div>
                  {recentAvailable
                    ? '还没有投递记录，从一个机会开始。'
                    : '近期事项暂时无法加载，请到工作台重试。'}
                </div>
                <Link className="site-text-link" href="/workspace">
                  打开工作台 →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
