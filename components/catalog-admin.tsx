'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminCall } from '@/lib/admin/client';
import {
  adminRoles,
  jobStates,
  beijingTime,
  type AdminRole,
  type AdminJob,
} from '@/lib/admin/model';
import { jobTypes } from '@/lib/catalog';
export function CatalogAdmin({ role, review = false }: { role: AdminRole; review?: boolean }) {
  const params = useSearchParams(),
    [query, setQuery] = useState(params.get('q') || ''),
    [state, setState] = useState(
      params.has('state') ? params.get('state')! : review ? 'pending_review' : ''
    ),
    [type, setType] = useState(params.get('type') || ''),
    [offset, setOffset] = useState(Math.max(0, Number(params.get('offset') || 0) || 0)),
    [jobs, setJobs] = useState<AdminJob[]>([]),
    [total, setTotal] = useState(0),
    [next, setNext] = useState<number | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      const path = review ? '/admin/review' : '/admin/jobs';
      if (window.location.pathname !== path) return;
      window.history.replaceState(
        null,
        '',
        path + '?' + new URLSearchParams({ q: query, state, type, offset: String(offset) })
      );
      setLoading(true);
      setError('');
      void adminCall(
        '/api/admin/jobs?' + new URLSearchParams({ q: query, state, type, offset: String(offset) })
      )
        .then((data) => {
          if (alive) {
            setJobs(data.jobs);
            setTotal(data.total);
            setNext(data.nextOffset);
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, state, type, offset]);
  return (
    <main className="site-main admin-main">
      <div className="site-page-title admin-title-row">
        <div>
          <p className="site-eyebrow">{review ? 'REVIEW DESK' : 'JD MANAGEMENT'}</p>
          <h1>{review ? '审核工作台' : '岗位 JD 管理'}</h1>
          <p>
            {review
              ? '先核验原文、来源和投递方式，再批准具体版本。'
              : '同一条岗位保留 JD、邮箱、投递说明及完整来源记录。'}{' '}
            当前角色：{adminRoles[role]}。
          </p>
        </div>
        {role !== 'reviewer' && (
          <Link className="button primary" href="/admin/jobs/new">
            新建 / 导入 JD
          </Link>
        )}
      </div>
      <div className="admin-filters">
        <label>
          搜索岗位
          <input
            aria-label="搜索后台岗位"
            value={query}
            placeholder="公司或岗位名称"
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
        </label>
        <label>
          岗位状态
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">全部状态</option>
            {Object.entries(jobStates).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          招聘类型
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">全部类型</option>
            {Object.entries(jobTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span>{loading ? '正在读取…' : `共 ${total} 条岗位`}</span>
      </div>
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
      <div className="admin-table-scroll">
        <table className="admin-jd-table">
          <thead>
            <tr>
              <th>公司 / 岗位</th>
              <th>招聘类型</th>
              <th>城市</th>
              <th>状态 / 修订</th>
              <th>本岗位投递邮箱</th>
              <th>原始来源</th>
              <th>最后核验（北京）</th>
              <th>最近更新（北京）</th>
              <th>操作人员</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <strong>{job.company}</strong>
                  <Link href={'/admin/jobs/' + job.id}>{job.title}</Link>
                </td>
                <td>{jobTypes[job.type]}</td>
                <td>{job.city || '待补充'}</td>
                <td>
                  <span className={'admin-state ' + job.state}>{jobStates[job.state]}</span>
                  <small>
                    内容 r{job.revision} · 版本 {job.version}
                  </small>
                </td>
                <td>
                  {job.contacts.map((c) => (
                    <div key={c.email}>{c.email}</div>
                  ))}
                  {!job.contacts.length && '—'}
                </td>
                <td>
                  {job.source_url ? (
                    <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                      查看来源 ↗
                    </a>
                  ) : (
                    '待补充'
                  )}
                </td>
                <td>{beijingTime(job.verified_at)}</td>
                <td>{beijingTime(job.updated_at)}</td>
                <td>
                  <code title={job.updated_by || ''}>
                    {job.updated_by?.slice(0, 8) || '历史记录'}
                  </code>
                </td>
                <td>
                  <Link href={'/admin/jobs/' + job.id}>
                    {review ? '核验 / 审核' : '查看 / 编辑'}
                  </Link>
                  {job.state === 'published' && <Link href={'/jobs/' + job.id}>前台页面 ↗</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !jobs.length && (
        <section className="site-card site-empty">
          <h2>没有匹配的岗位</h2>
          <p>调整筛选，或先新建一条真实草稿。</p>
        </section>
      )}
      <div className="admin-pagination">
        <button
          className="button secondary"
          disabled={!offset || loading}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          上一页
        </button>
        <span>第 {Math.floor(offset / 50) + 1} 页</span>
        <button
          className="button secondary"
          disabled={next === null || loading}
          onClick={() => setOffset(next!)}
        >
          下一页
        </button>
      </div>
    </main>
  );
}
