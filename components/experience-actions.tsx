'use client';
import { useState } from 'react';
import { Bookmark, Star } from 'lucide-react';

async function call(path: string, method = 'GET', body?: unknown) {
  const r = await fetch(path, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '操作失败。');
  return data;
}

export function ExperienceActions({ experienceId }: { experienceId: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function save() {
    setBusy(true);
    setError('');
    try {
      await call('/api/interview-radar/save', 'POST', { experienceId, saved: !saved });
      setSaved(!saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : '收藏失败。');
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    setBusy(true);
    setError('');
    try {
      await call('/api/interview-radar/reviews', 'POST', {
        experienceId,
        difficulty,
        rating,
        text,
      });
      setSubmitted(true);
      setShowForm(false);
      setDifficulty('');
      setRating(null);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site-actions">
      <button className="button secondary" disabled={busy} onClick={() => void save()}>
        <Bookmark size={15} />
        {saved ? '已收藏' : '收藏面经'}
      </button>
      <button className="button secondary" disabled={busy} onClick={() => setShowForm(!showForm)}>
        补充我的评价
      </button>
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
      {showForm && !submitted && (
        <div className="site-card" style={{ marginTop: 12, width: '100%' }}>
          <h3>补充我的面试评价</h3>
          <p className="site-hint">你的评价与原作者评价分开展示，请基于真实经历填写。</p>
          <div className="radar-review-form">
            <label>
              面试难度
              <input
                type="text"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                placeholder="如：中等、较难"
              />
            </label>
            <label>
              体验评分（1-5）
              <div className="radar-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={rating && rating >= n ? 'active' : ''}
                    onClick={() => setRating(n)}
                    aria-label={`${n} 分`}
                  >
                    <Star size={18} />
                  </button>
                ))}
              </div>
            </label>
            <label>
              评价内容
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="分享你的面试流程、体验与感受…"
              />
            </label>
            <button className="button primary" disabled={busy} onClick={() => void submitReview()}>
              提交评价
            </button>
          </div>
        </div>
      )}
      {submitted && <p className="site-hint">感谢你的补充，评价已提交。</p>}
    </div>
  );
}
