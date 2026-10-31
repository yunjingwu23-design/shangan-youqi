'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import type { Entry } from '@/lib/validation';
async function call(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401 ? '请登录后使用个人资料。' : data.error || '操作失败，请重试。'
    );
  return data;
}
export function GuideSave({
  slug,
  title,
  signedIn,
}: {
  slug: string;
  title: string;
  signedIn: boolean;
}) {
  const [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      // Read all pages before creating another bookmark; no duplicate on repeated clicks.
      let offset: number | null = 0,
        found = false;
      while (offset !== null) {
        const data = await call(`/api/entries?kind=favorite&collection=resources&offset=${offset}`);
        found ||= data.entries.some((entry: Entry) => {
          try {
            return JSON.parse(entry.content).slug === slug;
          } catch {
            return false;
          }
        });
        offset = found ? null : data.nextOffset;
      }
      if (!found)
        await call('/api/entries', 'POST', {
          kind: 'favorite',
          title,
          content: JSON.stringify({ format: 'shangan-resource-v1', slug }),
          url: location.origin + '/resources/' + encodeURIComponent(slug),
        });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="site-actions">
      {signedIn ? (
        <button className="button secondary" disabled={busy || saved} onClick={() => void save()}>
          <Bookmark size={15} />
          {saved ? '已保存到我的资料' : '保存到我的资料'}
        </button>
      ) : (
        <Link
          className="button secondary"
          href={`/login?next=${encodeURIComponent('/resources/' + slug)}`}
        >
          登录并保存资料
        </Link>
      )}
      {saved && (
        <Link href="/resources/mine" className="site-text-link">
          查看我的资料 →
        </Link>
      )}
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function ResourceLibrary() {
  const [rows, setRows] = useState<Entry[]>([]),
    [next, setNext] = useState<number | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load(offset = 0) {
    setBusy(true);
    try {
      const data = await call(`/api/entries?kind=favorite&collection=resources&offset=${offset}`);
      setRows((old) => (offset ? [...old, ...data.entries] : data.entries));
      setNext(data.nextOffset);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败。');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">YOUR PERSONAL LIBRARY</p>
        <h1>我的资料</h1>
        <p>在免费面经中保存的资料，跨设备登录后继续阅读。付费资料购买尚未开放。</p>
      </div>
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
      <div className="ia-recent-list">
        {rows.map((row) => {
          let slug = '';
          try {
            slug = JSON.parse(row.content).slug || '';
          } catch {}
          return (
            <div className="ia-recent-item" key={row.id}>
              <div>
                <Link href={'/resources/' + encodeURIComponent(slug)}>{row.title}</Link>
                <small>保存于 {new Date(row.created_at).toLocaleDateString('zh-CN')}</small>
              </div>
              <button
                className="icon-button"
                aria-label={`移除资料 ${row.title}`}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void call('/api/entries', 'DELETE', { id: row.id })
                    .then(() => load())
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        {!rows.length && !busy && (
          <div className="ia-recent-item">
            <div>还没有保存的资料。</div>
            <Link href="/resources" className="site-text-link">
              阅读免费面经 →
            </Link>
          </div>
        )}
      </div>
      {next !== null && (
        <button className="button secondary" disabled={busy} onClick={() => void load(next)}>
          加载更多资料
        </button>
      )}
    </main>
  );
}
