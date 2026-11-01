'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  analyticsPage,
  categories,
  safeSearchKeyword,
  trafficSource,
  type ClientEvent,
} from '@/lib/analytics/model';

function send(event: Omit<ClientEvent, 'id'>) {
  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, id: crypto.randomUUID() }),
    keepalive: true,
  }).catch(() => {});
}
export function AnalyticsTracker() {
  const path = usePathname(),
    params = useSearchParams();
  const [choice, setChoice] = useState<'accept' | 'reject' | null | undefined>(undefined);
  const [signal, setSignal] = useState(false),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const last = useRef(''),
    first = useRef(true),
    lastSearch = useRef('');
  const page = analyticsPage(path),
    rawType = params.get('type');
  const category = categories.find((value) => value === rawType);
  const keyword = ['/jobs', '/search'].includes(path) ? safeSearchKeyword(params.get('q')) : null;
  useEffect(() => {
    let alive = true;
    void fetch('/api/analytics/consent', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (alive) {
          setChoice(data.choice);
          setSignal(data.privacySignal);
        }
      })
      .catch(() => {
        if (alive) setChoice(null);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (choice !== 'accept') return;
    if (!page) {
      last.current = '';
      return;
    }
    const signature = path + ':' + (category || '');
    if (last.current === signature) return;
    last.current = signature;
    const id = path.match(/^\/jobs\/([a-f0-9-]{36})$/)?.[1];
    send({
      type: 'page_view',
      page,
      source: first.current ? trafficSource(document.referrer, location.origin) : 'internal',
      ...(id ? { jobId: id } : {}),
      ...(category ? { category } : {}),
    });
    first.current = false;
  }, [choice, page, path, category]);
  useEffect(() => {
    if (choice !== 'accept') return;
    if (!keyword || !page) {
      lastSearch.current = '';
      return;
    }
    const signature = page + ':' + keyword;
    if (lastSearch.current === signature) return;
    const timer = setTimeout(() => {
      lastSearch.current = signature;
      send({ type: 'search', page, keyword });
    }, 900);
    return () => clearTimeout(timer);
  }, [choice, keyword, page]);
  useEffect(() => {
    if (choice !== 'accept' || !page) return;
    const click = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        '[data-analytics-event],a[href]'
      );
      if (!target) return;
      const type = target.dataset.analyticsEvent;
      if (
        (type === 'job_click' || type === 'application_link_click') &&
        target.dataset.analyticsJob
      ) {
        send({ type, page, jobId: target.dataset.analyticsJob });
        return;
      }
      if (target instanceof HTMLAnchorElement) {
        const url = new URL(target.href, location.origin),
          value = categories.find((v) => v === url.searchParams.get('type'));
        if (url.origin === location.origin && url.pathname === '/jobs' && value)
          send({ type: 'category_click', page: '/jobs', category: value });
      }
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [choice, page]);
  async function choose(value: 'accept' | 'reject') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/analytics/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: value }),
      });
      if (!response.ok) throw new Error('暂时无法保存统计选择，请稍后重试。');
      const data = await response.json();
      last.current = '';
      lastSearch.current = '';
      setChoice(data.choice);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法保存选择。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="analytics-privacy-control">
      <Link href="/privacy">隐私与使用统计</Link>
      <button type="button" className="analytics-settings" onClick={() => setOpen((v) => !v)}>
        统计偏好
      </button>
      {(choice === null || open) && (
        <section className="analytics-consent" aria-label="使用统计选择">
          <div>
            <strong>帮助我们了解哪些功能更有用</strong>
            <p>
              由你选择是否允许站内使用统计。仅记录页面类型和操作次数，不采集简历、录音、复盘正文或原始搜索文本。拒绝不影响使用，可随时停止并删除本浏览器的统计。
            </p>
            {signal && <p>已遵循浏览器的“请勿跟踪”或全局隐私设置。</p>}
          </div>
          <div className="site-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void choose('reject')}
            >
              {choice === 'accept' ? '停止并删除本浏览器统计' : '仅使用必要功能'}
            </button>
            <button
              className="button primary"
              disabled={busy || signal}
              onClick={() => void choose('accept')}
            >
              允许使用统计
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </div>
  );
}
