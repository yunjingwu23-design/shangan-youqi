'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
import { adminCall } from '@/lib/admin/client';
import {
  feedbackKindLabels,
  feedbackStatusLabels,
  feedbackStatusOptions,
  type FeedbackItem,
  type FeedbackStatus,
} from '@/lib/feedback-options';

const filters: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  ...feedbackStatusOptions.map((item) => ({ value: item.value, label: item.label })),
];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = (await adminCall('/api/admin/feedback')) as { items?: FeedbackItem[] };
      setItems(data.items || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '反馈列表读取失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: items.length };
    for (const item of items) base[item.status] = (base[item.status] || 0) + 1;
    return base;
  }, [items]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.status === filter)),
    [items, filter]
  );

  async function changeStatus(item: FeedbackItem, status: FeedbackStatus) {
    if (item.status === status || savingId) return;
    setSavingId(item.id);
    const previous = items;
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, status } : entry))
    );
    try {
      await adminCall(`/api/admin/feedback/${item.id}`, 'PATCH', { status });
    } catch {
      setItems(previous);
      setError('状态更新失败，请稍后重试。');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="site-main">
      <div className="admin-page-head">
        <div>
          <h1>用户反馈</h1>
          <p>前台「意见反馈」提交的内容都汇总在这里，处理完顺手标一下状态。</p>
        </div>
        <button type="button" className="button secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      <div className="fb-admin-filters">
        {filters.map((entry) => (
          <button
            key={entry.value}
            type="button"
            className={filter === entry.value ? 'fb-filter fb-filter-active' : 'fb-filter'}
            onClick={() => setFilter(entry.value)}
          >
            {entry.label}
            <span>{counts[entry.value] || 0}</span>
          </button>
        ))}
      </div>

      {error && <p className="fb-error">{error}</p>}

      {loading ? (
        <p className="fb-admin-empty">正在读取…</p>
      ) : visible.length === 0 ? (
        <div className="fb-admin-empty">
          <Inbox size={26} />
          <p>{filter === 'all' ? '还没有人提交反馈。' : '这个状态下暂时没有反馈。'}</p>
        </div>
      ) : (
        <div className="fb-admin-list">
          {visible.map((item) => (
            <article key={item.id} className="fb-admin-item">
              <header>
                <span className={`fb-badge fb-badge-${item.kind}`}>{feedbackKindLabels[item.kind]}</span>
                <span className="fb-admin-state">{feedbackStatusLabels[item.status]}</span>
                <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
              </header>
              <p className="fb-admin-content">{item.content}</p>
              <div className="fb-admin-meta">
                {item.pagePath && <span>来自 {item.pagePath}</span>}
                {item.contact && <span>联系方式：{item.contact}</span>}
              </div>
              <div className="fb-admin-actions">
                {feedbackStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={savingId === item.id}
                    className={item.status === option.value ? 'button' : 'button secondary'}
                    onClick={() => void changeStatus(item, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
