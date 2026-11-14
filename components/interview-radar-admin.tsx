'use client';
import { useEffect, useState } from 'react';
import { Database, GitMerge, Inbox, ListChecks, Radar, Upload } from 'lucide-react';
import type { InterviewSource, SourceRecord, UserSubmission } from '@/lib/interview-radar/types';
import { verificationStatuses } from '@/lib/interview-radar/types';

async function getJSON(path: string) {
  const r = await fetch(path, { cache: 'no-store' });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '加载失败。');
  return data;
}

async function postJSON(path: string, body: unknown) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '操作失败。');
  return data;
}

type Tab = 'overview' | 'sources' | 'import' | 'records' | 'submissions';

export function InterviewRadarAdmin({ canReview }: { canReview: boolean }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [sources, setSources] = useState<InterviewSource[]>([]);
  const [records, setRecords] = useState<SourceRecord[]>([]);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  // Import form state
  const [importMode, setImportMode] = useState<'url' | 'csv' | 'collect'>('url');
  const [urlSourceId, setUrlSourceId] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [urlAuthor, setUrlAuthor] = useState('');
  const [csvText, setCsvText] = useState('');
  const [collectCount, setCollectCount] = useState('10');

  async function load() {
    setBusy(true);
    setError('');
    try {
      const [catalog, recs, subs] = await Promise.all([
        getJSON('/api/interview-radar/catalog'),
        getJSON('/api/interview-radar/admin/records'),
        getJSON('/api/interview-radar/admin/submissions'),
      ]);
      setSources(catalog.sources ?? []);
      setRecords(recs.records ?? []);
      setSubmissions(subs.submissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败。');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function doAction(action: string, payload: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postJSON('/api/interview-radar/admin', { action, payload });
      setNotice(successMsg);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败。');
    } finally {
      setBusy(false);
    }
  }

  async function importUrl() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postJSON('/api/interview-radar/import', {
        mode: 'url',
        input: {
          source_id: urlSourceId,
          url: urlValue,
          title: urlTitle,
          author: urlAuthor,
        },
      });
      setNotice('URL 导入成功，已进入待核实队列。');
      setUrlTitle('');
      setUrlValue('');
      setUrlAuthor('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败。');
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) throw new Error('请先粘贴 CSV 表头和数据行。');
      const header = lines[0].split(/[,\t]/).map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(/[,\t]/);
        const obj: Record<string, string> = {};
        header.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
        return {
          company: obj.company ?? '',
          role: obj.role ?? '',
          recruitment_type: (obj.recruitment_type ?? 'undetermined') as never,
          cohort: obj.cohort ?? '',
          title: obj.title ?? '',
          round: obj.round ?? '',
          question: obj.question ?? '',
          source_name: obj.source_name ?? '',
          source_url: obj.source_url ?? '',
          published_at: obj.published_at ?? '',
        };
      });
      const result = await postJSON('/api/interview-radar/import', { mode: 'csv', rows });
      setNotice(`CSV 导入完成：新增 ${result.imported} 条，跳过重复 ${result.skipped} 条。`);
      setCsvText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败。');
    } finally {
      setBusy(false);
    }
  }

  async function autoCollect() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const maxPosts = Math.max(1, Math.min(Number(collectCount) || 10, 20));
      const result = await postJSON('/api/interview-radar/import', { mode: 'collect', maxPosts });
      let msg = `自动采集完成：抓到 ${result.collected} 篇，AI 归纳 ${result.classified} 篇，导入 ${result.imported} 条，跳过重复 ${result.skipped} 条。`;
      if (result.aiError) msg += ` 注意：${result.aiError}`;
      setNotice(msg);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '采集失败。');
    } finally {
      setBusy(false);
    }
  }

  const verifiedCount = records.filter((r) => r.status === 'verified').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">INTERVIEW INTELLIGENCE</p>
        <h1>面经情报管理</h1>
        <p>管理来源、导入面经、审核线索与用户投稿。所有操作均记录管理员身份。</p>
      </div>

      <div className="admin-tabs">
        {(
          [
            ['overview', '覆盖概览', Radar],
            ['sources', '来源管理', Database],
            ['import', '面经导入', Upload],
            ['records', '待核验线索', ListChecks],
            ['submissions', '用户投稿', Inbox],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            <Icon size={15} />
            {label}
            {key === 'submissions' && pendingCount > 0 && (
              <span className="admin-count">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
      {notice && <p className="site-success">{notice}</p>}

      {tab === 'overview' && (
        <div className="admin-stat-grid">
          <section className="site-card">
            <h3>已发现来源</h3>
            <strong>{records.length}</strong>
          </section>
          <section className="site-card">
            <h3>已核实面经</h3>
            <strong>{verifiedCount}</strong>
          </section>
          <section className="site-card">
            <h3>待审核投稿</h3>
            <strong>{pendingCount}</strong>
          </section>
          <section className="site-card">
            <h3>接入来源</h3>
            <strong>{sources.length}</strong>
          </section>
          <div className="site-card admin-stat-note">
            <p>
              「已发现来源」不等于「已核实面经」。只有人工核验并发布的内容才会展示给用户。
            </p>
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <section className="site-card">
          <h2>来源目录</h2>
          <p className="site-hint">
            未获授权的平台明确标注「仅人工导入」，绝不伪装为已完成自动采集。
          </p>
          <div className="admin-source-list">
            {sources.map((s) => (
              <div className="admin-source-row" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <small>
                    {s.authorization_status === 'authorized'
                      ? '已授权'
                      : s.authorization_status === 'manual_only'
                        ? '仅人工导入'
                        : '未授权'}
                    {s.sync_status === 'error' ? ' · 同步异常' : ''}
                  </small>
                </div>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    doAction('source_toggle', { id: s.id, active: !s.active }, '来源状态已更新。')
                  }
                >
                  {s.active ? '停用' : '启用'}
                </button>
              </div>
            ))}
            {sources.length === 0 && <p>尚无来源。请在数据库中初始化来源目录。</p>}
          </div>
        </section>
      )}

      {tab === 'import' && (
        <section className="site-card">
          <h2>面经导入</h2>
          <div className="admin-tabs" style={{ marginBottom: 16 }}>
            <button className={importMode === 'url' ? 'active' : ''} onClick={() => setImportMode('url')}>
              手动 URL 导入
            </button>
            <button className={importMode === 'csv' ? 'active' : ''} onClick={() => setImportMode('csv')}>
              CSV 导入
            </button>
            <button className={importMode === 'collect' ? 'active' : ''} onClick={() => setImportMode('collect')}>
              自动采集 + AI 归纳
            </button>
          </div>

          {importMode === 'url' ? (
            <div className="radar-submit-form">
              <label>
                来源平台
                <select value={urlSourceId} onChange={(e) => setUrlSourceId(e.target.value)}>
                  <option value="">选择来源</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                帖子链接（HTTPS）
                <input
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://"
                />
              </label>
              <label>
                标题
                <input
                  type="text"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                />
              </label>
              <label>
                作者（可选）
                <input
                  type="text"
                  value={urlAuthor}
                  onChange={(e) => setUrlAuthor(e.target.value)}
                />
              </label>
              <button className="button primary" disabled={busy} onClick={() => void importUrl()}>
                导入并标记待核实
              </button>
            </div>
          ) : importMode === 'csv' ? (
            <div className="radar-submit-form">
              <p className="site-hint">
                粘贴 CSV（表头：company,role,recruitment_type,cohort,title,round,question,source_name,source_url,published_at），
                每行一条。
              </p>
              <textarea
                rows={10}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={'company,role,recruitment_type,cohort,title,round,question,source_name,source_url\n京东集团,采销,autumn_recruitment,2027届,京东采销一面面经,first_round,介绍一个你主导的项目,牛客网,https://...'}
              />
              <button className="button primary" disabled={busy} onClick={() => void importCsv()}>
                导入 CSV
              </button>
            </div>
          ) : (
            <div className="radar-submit-form">
              <p className="site-hint">
                自动抓取牛客网公开讨论区面经，调用 AI（DeepSeek）归纳公司、岗位、轮次与问题要点，
                写入待核实队列。只采集公开可访问内容，不存全文、不绕登录。
              </p>
              <label>
                采集篇数（1–20）
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={collectCount}
                  onChange={(e) => setCollectCount(e.target.value)}
                />
              </label>
              <button className="button primary" disabled={busy} onClick={() => void autoCollect()}>
                {busy ? '采集中…' : '开始采集并 AI 归纳'}
              </button>
            </div>
          )}
        </section>
      )}

      {tab === 'records' && (
        <section className="site-card">
          <h2>待核验线索</h2>
          <p className="site-hint">核对原文后，可标记为已核实；链接失效则标记为已失效。</p>
          <div className="admin-source-list">
            {records.map((r) => (
              <div className="admin-source-row" key={r.id}>
                <div>
                  <strong>{r.title}</strong>
                  <small>
                    {verificationStatuses[r.status] ?? r.status}
                    {r.author ? ` · ${r.author}` : ''}
                  </small>
                </div>
                <div className="admin-row-actions">
                  {r.normalized_url && (
                    <a
                      className="site-text-link"
                      href={r.normalized_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      原文
                    </a>
                  )}
                  {canReview && (
                    <>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          doAction('resolve_duplicate', { duplicate_id: r.id }, '已标记为重复/失效。')
                        }
                      >
                        标记失效
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {records.length === 0 && <p>暂无待核验线索。</p>}
          </div>
        </section>
      )}

      {tab === 'submissions' && (
        <section className="site-card">
          <h2>用户投稿审核</h2>
          <p className="site-hint">用户投稿与外部内容分开，审核通过后才可发布。</p>
          <div className="admin-source-list">
            {submissions.map((s) => (
              <div className="admin-source-row" key={s.id}>
                <div>
                  <strong>
                    {s.company_name} · {s.job_role_name}
                  </strong>
                  <small>
                    {s.status === 'pending'
                      ? '待审核'
                      : s.status === 'approved'
                        ? '已通过'
                        : '已驳回'}
                    {s.rounds?.length ? ` · 轮次：${s.rounds.join('、')}` : ''}
                  </small>
                  {s.review_text && <p>{s.review_text.slice(0, 120)}</p>}
                </div>
                {canReview && s.status === 'pending' && (
                  <div className="admin-row-actions">
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() =>
                        doAction(
                          'review_submission',
                          { id: s.id, status: 'approved', note: '审核通过' },
                          '投稿已通过。'
                        )
                      }
                    >
                      通过
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        doAction(
                          'review_submission',
                          { id: s.id, status: 'rejected', note: '不符合要求' },
                          '投稿已驳回。'
                        )
                      }
                    >
                      驳回
                    </button>
                  </div>
                )}
              </div>
            ))}
            {submissions.length === 0 && <p>暂无用户投稿。</p>}
          </div>
        </section>
      )}
    </main>
  );
}
