'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Search, Bookmark, Plus } from 'lucide-react';
import { type CatalogJob, jobTypes, filterJobs } from '@/lib/catalog';
export function JobsExplorer({
  jobs,
  preview,
  signedIn,
  available,
}: {
  jobs: CatalogJob[];
  preview: boolean;
  signedIn: boolean;
  available: boolean;
}) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || ''),
    [type, setType] = useState(params.get('type') || ''),
    [mode, setMode] = useState(params.get('mode') || 'fuzzy'),
    [city, setCity] = useState(''),
    [industry, setIndustry] = useState(''),
    [cohort, setCohort] = useState('');
  const found = useMemo(
    () => filterJobs(jobs, { q, type, mode, city, industry, cohort }),
    [jobs, q, type, mode, city, industry, cohort]
  );
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">FIND YOUR NEXT OPPORTUNITY</p>
        <h1>岗位广场</h1>
        <p>把适合自己的机会，认真筛选出来。</p>
      </div>
      {preview && (
        <div className="site-notice">
          {available ? '当前尚无已发布的正式岗位。' : '正式岗位信息暂时无法加载。'}
          下面是原交付包的交互样品预览，所有样品均非实时招聘，不能用于实际投递。
        </div>
      )}
      <section className="site-card job-filters">
        <div className="job-search">
          <Search size={20} />
          <input
            aria-label="搜索公司或岗位"
            value={q}
            maxLength={100}
            onChange={(e) => setQ(e.target.value)}
            placeholder="公司、岗位关键词或城市"
          />
          <select aria-label="搜索方式" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="fuzzy">模糊搜索</option>
            <option value="exact">精准搜索</option>
          </select>
        </div>
        <div className="job-type-tabs" role="group" aria-label="招聘类型">
          {[['', '全部类型'], ...Object.entries(jobTypes)].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={type === key}
              className={type === key ? 'active' : ''}
              onClick={() => setType(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="job-selects">
          {[
            { label: '城市', value: city, set: setCity, field: 'city' },
            { label: '行业', value: industry, set: setIndustry, field: 'industry' },
            { label: '届别', value: cohort, set: setCohort, field: 'cohort' },
          ].map((item) => (
            <label key={item.field}>
              {item.label}
              <select
                aria-label={`筛选${item.label}`}
                value={item.value}
                onChange={(e) => item.set(e.target.value)}
              >
                <option value="">全部{item.label}</option>
                {[
                  ...new Set(
                    jobs
                      .map((job) => job[item.field as 'city' | 'industry' | 'cohort'])
                      .filter(Boolean)
                  ),
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>
      <div className="site-section-title">
        <p className="muted">
          {found.length} 个{preview ? '样品' : '已发布'}岗位
          {q && ` · ${mode === 'exact' ? '精准匹配' : '包含已收录别名匹配'}`}
        </p>
        <Link href="/workspace">管理我的投递 →</Link>
      </div>
      <div className="job-grid">
        {found.map((job) => (
          <article className="site-card job-card" key={job.id}>
            <div className="job-card-top">
              <span className="company-mark">{job.company.slice(0, 1)}</span>
              <span className="job-badge">{jobTypes[job.type]}</span>
            </div>
            <p className="job-company">{job.company}</p>
            <h2>
              <Link href={`/jobs/${job.id}`}>{job.title}</Link>
            </h2>
            <p className="muted">
              {job.city} · {job.industry} · {job.cohort || '届别见详情'}
            </p>
            <small>
              {preview
                ? '样品 · 来源与状态待核验'
                : `核验日期 ${new Date(job.verified_at!).toLocaleDateString('zh-CN')}`}
            </small>
            <div className="site-actions">
              <Link href={`/jobs/${job.id}`} className="button secondary">
                查看完整 JD
                <ArrowUpRight size={15} />
              </Link>
              {!preview && <JobActions job={job} signedIn={signedIn} compact />}
            </div>
          </article>
        ))}
      </div>
      {!found.length && (
        <section className="site-empty">
          <Search size={30} />
          <h2>没有找到匹配岗位</h2>
          <p>试试模糊搜索，或减少城市、届别等筛选条件。</p>
          <button
            className="button secondary"
            onClick={() => {
              setQ('');
              setType('');
              setCity('');
              setIndustry('');
              setCohort('');
            }}
          >
            清除筛选
          </button>
        </section>
      )}
    </main>
  );
}
export function JobActions({
  job,
  signedIn,
  compact = false,
}: {
  job: CatalogJob;
  signedIn: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function save(kind: 'application' | 'favorite') {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent('/jobs/' + job.id)}`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/jobs/${job.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent('/jobs/' + job.id)}`);
        return;
      }
      if (!response.ok) throw new Error(data.error);
      setMessage(
        data.created
          ? kind === 'application'
            ? '已加入工作台（尚未投递）'
            : '已保存到我的收藏'
          : '这条岗位已经保存过了。'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="job-actions">
      {job.preview ? (
        <p className="muted">样品预览不写入正式投递记录。</p>
      ) : (
        <div className="site-actions">
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void save('application')}
          >
            <Plus size={15} />
            {compact ? '加入工作台' : '加入我的工作台'}
          </button>
          {!compact && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void save('favorite')}
            >
              <Bookmark size={15} />
              收藏岗位
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="site-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="button secondary"
      onClick={() =>
        void navigator.clipboard
          .writeText(email)
          .then(() => setCopied(true))
          .catch(() => setCopied(false))
      }
    >
      {copied ? '已复制' : '复制邮箱'}
    </button>
  );
}
