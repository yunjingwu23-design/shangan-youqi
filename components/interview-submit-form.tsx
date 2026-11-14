'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { interviewRounds, recruitmentTypes } from '@/lib/interview-radar/types';

export function InterviewSubmitForm() {
  const [form, setForm] = useState({
    company_name: '',
    job_role_name: '',
    recruitment_type: 'undetermined',
    cohort: '',
    rounds: [] as string[],
    questions: [{ text: '' }],
    review_text: '',
    source_url: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function toggleRound(round: string) {
    setForm((old) => ({
      ...old,
      rounds: old.rounds.includes(round)
        ? old.rounds.filter((r) => r !== round)
        : [...old.rounds, round],
    }));
  }

  function updateQuestion(index: number, text: string) {
    setForm((old) => {
      const questions = old.questions.map((q, i) => (i === index ? { ...q, text } : q));
      return { ...old, questions };
    });
  }

  function addQuestion() {
    setForm((old) => ({ ...old, questions: [...old.questions, { text: '' }] }));
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/interview-radar/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          questions: form.questions.filter((q) => q.text.trim()),
          rounds: form.rounds,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '提交失败。');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败。');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="site-main">
        <div className="site-page-title">
          <p className="site-eyebrow">THANK YOU</p>
          <h1>提交成功</h1>
          <p>你的面经已进入审核队列，通过后会出现在面经雷达中。</p>
        </div>
        <div className="site-actions">
          <Link className="button secondary" href="/resources/radar">
            返回面经雷达
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">SHARE YOUR EXPERIENCE</p>
        <h1>提交我的面经</h1>
        <p>分享你的真实面试经历，帮助后来者。你的投稿会与外部来源分开展示。</p>
      </div>

      <div className="site-notice">
        请只提交你本人真实经历的面试。不确定的信息请留空，不要编造或推断他人的 Offer 结果。
      </div>

      <section className="site-card radar-submit-form">
        <label>
          公司名称（必填）
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => update('company_name', e.target.value)}
            placeholder="如：京东集团"
          />
        </label>
        <label>
          岗位名称（必填）
          <input
            type="text"
            value={form.job_role_name}
            onChange={(e) => update('job_role_name', e.target.value)}
            placeholder="如：采销、后端开发"
          />
        </label>
        <label>
          招聘类型
          <select
            value={form.recruitment_type}
            onChange={(e) => update('recruitment_type', e.target.value)}
          >
            {Object.entries(recruitmentTypes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          毕业届别（如 2027 届）
          <input
            type="text"
            value={form.cohort}
            onChange={(e) => update('cohort', e.target.value)}
            placeholder="如：2027 届"
          />
        </label>

        <fieldset>
          <legend>面试轮次（可多选）</legend>
          <div className="radar-tags">
            {Object.entries(interviewRounds).map(([k, v]) => (
              <button
                type="button"
                key={k}
                className={`job-badge ${form.rounds.includes(k) ? 'selected' : ''}`}
                onClick={() => toggleRound(k)}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>面试问题（只填写你记得的，不确定的可留空）</legend>
          {form.questions.map((question, i) => (
            <textarea
              key={i}
              value={question.text}
              onChange={(e) => updateQuestion(i, e.target.value)}
              rows={2}
              placeholder={`问题 ${i + 1}`}
            />
          ))}
          <button type="button" className="site-text-link" onClick={addQuestion}>
            + 添加一个问题
          </button>
        </fieldset>

        <label>
          面试体验与感受（可选）
          <textarea
            value={form.review_text}
            onChange={(e) => update('review_text', e.target.value)}
            rows={4}
            placeholder="面试流程、难度、面试官风格等主观感受…"
          />
        </label>

        <label>
          原帖/来源链接（可选，仅限公开可访问的链接）
          <input
            type="url"
            value={form.source_url}
            onChange={(e) => update('source_url', e.target.value)}
            placeholder="https://"
          />
        </label>

        <button className="button primary" disabled={busy} onClick={() => void submit()}>
          <Send size={15} />
          {busy ? '正在提交…' : '提交面经'}
        </button>

        {error && (
          <p role="alert" className="site-error">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
