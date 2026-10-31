'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { preparationPayload } from '@/lib/preparation';
import { entryPresentation } from '@/lib/entry-presentation';
import type { Entry } from '@/lib/validation';
import type { InterviewRecord } from '@/lib/interviews/types';
export function PersonalInterviewHistory({ interviewsEnabled }: { interviewsEnabled: boolean }) {
  const [rows, setRows] = useState<Entry[]>([]),
    [audio, setAudio] = useState<InterviewRecord[]>([]),
    [next, setNext] = useState<number | null>(null),
    [audioNext, setAudioNext] = useState<number | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  async function call(path: string) {
    const response = await fetch(path, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '记录暂时无法加载。');
    return data;
  }
  async function load(offset = 0) {
    const data = await call('/api/entries?kind=interview_review&offset=' + offset);
    setRows((old) => (offset ? [...old, ...data.entries] : data.entries));
    setNext(data.nextOffset);
  }
  async function loadAudio(offset = 0) {
    const data = await call('/api/interviews?offset=' + offset);
    setAudio((old) => (offset ? [...old, ...data.interviews] : data.interviews));
    setAudioNext(data.nextOffset);
  }
  useEffect(() => {
    void Promise.allSettled([load(), ...(interviewsEnabled ? [loadAudio()] : [])])
      .then((results) => {
        const failed = results.find((r) => r.status === 'rejected');
        if (failed?.status === 'rejected') setError(failed.reason.message);
      })
      .finally(() => setLoading(false));
  }, [interviewsEnabled]);
  function remove(row: Entry) {
    if (!window.confirm('永久删除这条面试记录？')) return;
    void fetch('/api/entries', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setRows((old) => old.filter((item) => item.id !== row.id));
      })
      .catch((e) => setError(e.message));
  }
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">YOUR INTERVIEW JOURNEY</p>
        <h1>我的面试历史</h1>
        <p>在一个地方找回自己的准备、练习与复盘。</p>
        <div className="site-actions">
          <Link href="/interview-center/notes" className="button secondary">
            新建手动复盘
          </Link>
          <Link href="/workspace/interviews/new" className="button primary">
            上传录音做复盘 →
          </Link>
        </div>
      </div>
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
      {loading && <p role="status">正在同步面试历史…</p>}
      <section className="ia-results-section">
        <h2>录音与 AI 复盘</h2>
        {!interviewsEnabled ? (
          <p className="site-notice">录音复盘内测尚未开放，已有笔记和文字练习继续保留。</p>
        ) : (
          <>
            <div className="ia-recent-list">
              {audio.map((item) => (
                <Link
                  key={item.id}
                  className="ia-recent-item"
                  href={`/workspace/interviews/${item.id}/${item.status === 'complete' ? 'report' : item.status === 'review' ? 'transcript' : 'progress'}`}
                >
                  <div>
                    {item.title}
                    <small>
                      {item.round} · {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </small>
                  </div>
                  <span>查看 →</span>
                </Link>
              ))}
              {!audio.length && !loading && <p className="ia-recent-item">还没有录音复盘。</p>}
            </div>
            {audioNext !== null && (
              <button
                className="site-text-link"
                onClick={() => void loadAudio(audioNext).catch((e) => setError(e.message))}
              >
                加载更多录音记录
              </button>
            )}
          </>
        )}
      </section>
      <section className="ia-results-section">
        <h2>练习、笔记与 Mock 意向</h2>
        <div className="ia-recent-list">
          {rows.map((row) => {
            const payload = preparationPayload(row.content),
              format = payload?.format;
            const href =
              format === 'shangan-text-mock-v1'
                ? '/interview-center/practice?id=' + row.id
                : format === 'shangan-mock-interest-v1'
                  ? '/interview-center/mock'
                  : '/interview-center/notes?id=' + row.id;
            return (
              <div key={row.id} className="ia-recent-item">
                <div>
                  <Link href={href}>{row.title}</Link>
                  <small>{entryPresentation(row).summary.slice(0, 160)}</small>
                  {format === 'shangan-mock-interest-v1' &&
                    typeof payload.note === 'string' &&
                    payload.note && (
                      <p className="site-prose ia-draft-note">练习需求：{payload.note}</p>
                    )}
                  <small>
                    {new Date(row.updated_at).toLocaleDateString('zh-CN')}
                    {format === 'shangan-mock-interest-v1' ? ' · 仅意向，未确认预约' : ''}
                  </small>
                </div>
                <button className="site-text-link site-danger" onClick={() => remove(row)}>
                  删除
                </button>
              </div>
            );
          })}
          {!rows.length && !loading && (
            <div className="ia-recent-item">还没有记录，从一次练习或笔记开始。</div>
          )}
        </div>
        {next !== null && (
          <button
            className="site-text-link"
            onClick={() => void load(next).catch((e) => setError(e.message))}
          >
            加载更多历史记录
          </button>
        )}
      </section>
    </main>
  );
}
