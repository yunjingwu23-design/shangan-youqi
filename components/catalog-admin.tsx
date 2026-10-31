'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDraftState } from '@/components/drafts';
import { jobTypes, type CatalogJob } from '@/lib/catalog';
const blank = {
  company: '',
  title: '',
  type: 'daily_internship' as CatalogJob['type'],
  city: '',
  industry: '',
  cohort: '',
  responsibilities: '',
  requirements: '',
  source_url: '',
  apply_url: '',
  contacts: [] as { email: string; label: string }[],
  mail_subject: '',
  aliases: [] as string[],
  retention_evidence: '',
  state: 'draft' as CatalogJob['state'],
};
export function CatalogAdmin() {
  const [jobs, setJobs] = useState<CatalogJob[]>([]),
    [draft, setDraft] = useDraftState('admin:job', blank),
    [selected, setSelected] = useDraftState<CatalogJob | null>('admin:selected', null),
    [email, setEmail] = useDraftState('admin:contacts', ''),
    [aliases, setAliases] = useDraftState('admin:aliases', ''),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function call(method = 'GET', body?: unknown) {
    const response = await fetch('/api/admin/jobs', {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '岗位操作失败。');
    return data;
  }
  useEffect(() => {
    void call()
      .then((data) => setJobs(data.jobs))
      .catch((e) => setError(e.message));
  }, []);
  function open(job: CatalogJob | null) {
    setSelected(job);
    setDraft(job || blank);
    setEmail(job?.contacts.map((c) => c.email).join('\n') || '');
    setAliases(job?.aliases.join('、') || '');
    setReviewed(false);
    setNotice('');
    setError('');
  }
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">CATALOG OPERATIONS</p>
        <h1>岗位录入与发布</h1>
        <p>
          核对来源后再发布。普通账号只能查看公开岗位。未保存的文字在当前标签页临时保留，发布仍需重新确认核验。
        </p>
      </div>
      <div className="preparation-grid">
        <form
          className="site-card review-form"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            const { id, updated_at, published_at, verified_at, preview, ...rest } =
              draft as CatalogJob;
            void call('POST', {
              ...(selected ? { id: selected.id, expectedUpdatedAt: selected.updated_at } : {}),
              job: {
                ...rest,
                contacts: email
                  .split(/[\n,，]/)
                  .map((v) => v.trim())
                  .filter(Boolean)
                  .map((email) => ({ email, label: '投递邮箱' })),
                aliases: aliases
                  .split(/[、,，\n]/)
                  .map((v) => v.trim())
                  .filter(Boolean),
              },
              sourceReviewed: reviewed,
            })
              .then(async (data) => {
                setSelected(data.job);
                setDraft(data.job);
                setNotice('岗位已保存。');
                setJobs((await call()).jobs);
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <div className="site-section-title">
            <h2>{selected ? '编辑岗位' : '新增岗位'}</h2>
            <button className="site-text-link" type="button" onClick={() => open(null)}>
              新建
            </button>
          </div>
          <label>
            导入 JD 文本（TXT）
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 100 * 1024 || !file.name.toLowerCase().endsWith('.txt')) {
                  setError('请选择 100 KiB 以内的 TXT 文本。');
                  return;
                }
                try {
                  const text = (await file.text()).trim();
                  const combined = [draft.responsibilities, text].filter(Boolean).join('\n\n');
                  if (combined.length > 12000) {
                    setError('合并后的 JD 超过 12000 字，请先精简文本。');
                    return;
                  }
                  setDraft({ ...draft, responsibilities: combined });
                  setNotice('JD 文本已追加到岗位职责，请核对字段并保存。');
                } catch {
                  setError('无法读取文件，请改用粘贴文本。');
                }
              }}
            />
          </label>
          <div className="form-two-col">
            {[
              { key: 'company', label: '公司', max: 100 },
              { key: 'title', label: '岗位名称', max: 120 },
              { key: 'city', label: '城市', max: 60 },
              { key: 'industry', label: '行业', max: 60 },
              { key: 'cohort', label: '届别', max: 60 },
            ].map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  required={['company', 'title', 'city'].includes(field.key)}
                  value={String(draft[field.key as keyof typeof draft])}
                  maxLength={field.max}
                  onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                />
              </label>
            ))}
            <label>
              招聘类型
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as CatalogJob['type'] })}
              >
                {Object.entries(jobTypes).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            岗位职责
            <textarea
              required
              value={draft.responsibilities}
              maxLength={12000}
              rows={6}
              onChange={(e) => setDraft({ ...draft, responsibilities: e.target.value })}
            />
          </label>
          <label>
            任职要求
            <textarea
              required
              value={draft.requirements}
              maxLength={6000}
              rows={5}
              onChange={(e) => setDraft({ ...draft, requirements: e.target.value })}
            />
          </label>
          {draft.type === 'conversion_internship' && (
            <label>
              招聘来源中的留用说明原文
              <textarea
                value={draft.retention_evidence}
                maxLength={2000}
                onChange={(e) => setDraft({ ...draft, retention_evidence: e.target.value })}
              />
            </label>
          )}
          <label>
            招聘来源 HTTPS 链接
            <input
              type="url"
              value={draft.source_url}
              maxLength={2000}
              onChange={(e) => setDraft({ ...draft, source_url: e.target.value })}
            />
          </label>
          <label>
            官网投递 HTTPS 链接（选填）
            <input
              type="url"
              value={draft.apply_url}
              maxLength={2000}
              onChange={(e) => setDraft({ ...draft, apply_url: e.target.value })}
            />
          </label>
          <label>
            本岗位投递邮箱（选填，每行一个）
            <textarea
              value={email}
              maxLength={1500}
              rows={3}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            邮件标题要求（选填）
            <input
              value={draft.mail_subject}
              maxLength={200}
              onChange={(e) => setDraft({ ...draft, mail_subject: e.target.value })}
            />
          </label>
          <label>
            已核对的公司别名 / 搜索关键词
            <input
              value={aliases}
              maxLength={1800}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="使用顿号分隔"
            />
          </label>
          <label>
            保存状态
            <select
              value={draft.state}
              onChange={(e) => {
                setDraft({ ...draft, state: e.target.value as CatalogJob['state'] });
                setReviewed(false);
              }}
            >
              <option value="draft">草稿（不公开）</option>
              <option value="published">发布</option>
              <option value="closed">结束 / 下架</option>
            </select>
          </label>
          <label className="site-checkbox">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            我已核对当前招聘来源、岗位内容及投递方式，确认可以公开。
          </label>
          {error && (
            <p className="site-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="site-success" role="status">
              {notice}
            </p>
          )}
          <button className="button primary" type="submit" disabled={busy}>
            保存岗位
          </button>
        </form>
        <aside className="site-card">
          <h2>岗位列表</h2>
          {!jobs.length && <p className="muted">暂无岗位，从左侧录入并审核后发布。</p>}
          {jobs.map((job) => (
            <div key={job.id} className="review-history-row">
              <span className="job-badge">
                {{ draft: '草稿', published: '已发布', closed: '已结束' }[job.state]}
              </span>
              <h3>
                {job.company} · {job.title}
              </h3>
              <button className="site-text-link" onClick={() => open(job)}>
                编辑
              </button>
              {job.state === 'published' && (
                <Link className="site-text-link" href={`/jobs/${job.id}`}>
                  查看公开页面 →
                </Link>
              )}
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
