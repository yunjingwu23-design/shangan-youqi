'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { Company, InterviewQuestion, JobRole } from '@/lib/interview-radar/types';
import {
  interviewRounds,
  questionCategories,
  recruitmentTypes,
} from '@/lib/interview-radar/types';

async function getJSON(path: string) {
  const r = await fetch(path, { cache: 'no-store' });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '加载失败。');
  return data;
}

export function QuestionBank() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [round, setRound] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getJSON('/api/interview-radar/catalog')
      .then((data) => {
        setCompanies(data.companies ?? []);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!companyId) {
      setRoles([]);
      setRoleId('');
      return;
    }
    void getJSON(`/api/interview-radar/catalog?companyId=${companyId}`)
      .then((data) => setRoles(data.roles ?? []))
      .catch(() => setRoles([]));
  }, [companyId]);

  useEffect(() => {
    if (!loaded) return;
    setBusy(true);
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (roleId) params.set('roleId', roleId);
    if (round) params.set('round', round);
    if (q.trim()) params.set('q', q.trim());
    void getJSON(`/api/interview-radar/questions?${params}`)
      .then((data) => setQuestions(data.questions ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [loaded, companyId, roleId, round, q]);

  const companyName = companies.find((c) => c.id === companyId)?.name;
  const roleName = roles.find((r) => r.id === roleId)?.name;

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">QUESTION BANK</p>
        <h1>面试问题库</h1>
        <p>已核实的面试问题，按公司、岗位与轮次检索。未核实的提问不会标记为真题。</p>
      </div>

      <section className="site-card radar-search">
        <div className="radar-search-row">
          <label>
            公司
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">全部公司</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {companyId && (
            <label>
              岗位
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">全部岗位</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            轮次
            <select value={round} onChange={(e) => setRound(e.target.value)}>
              <option value="">全部轮次</option>
              {Object.entries(interviewRounds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="radar-search-row" style={{ marginTop: 8 }}>
          <input
            type="search"
            placeholder="搜索问题关键词…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </section>

      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}

      <p className="radar-count">{busy ? '正在查找…' : `共 ${questions.length} 道已核实问题`}</p>

      <section className="radar-questions">
        {questions.map((question) => (
          <div className="site-card radar-question" key={question.id}>
            <div className="radar-card-head">
              {companyName && <span className="job-badge">{companyName}</span>}
              {roleName && <span className="job-badge">{roleName}</span>}
              <span className="job-badge">
                {interviewRounds[question.round as keyof typeof interviewRounds] ?? question.round}
              </span>
              <span className="job-badge">
                {questionCategories[question.question_category] ?? '其他'}
              </span>
              <span className="job-badge">
                {recruitmentTypes[question.recruitment_type as keyof typeof recruitmentTypes] ??
                  '未确定'}
              </span>
            </div>
            <p>{question.question_text}</p>
          </div>
        ))}
        {!busy && questions.length === 0 && (
          <div className="site-card">
            <HelpCircle size={20} />
            <p>暂无匹配的已核实问题。你可以提交面经，帮助我们扩充问题库。</p>
            <Link className="site-text-link" href="/resources/radar/submit">
              提交面经 →
            </Link>
          </div>
        )}
      </section>

      <div className="site-actions" style={{ marginTop: 16 }}>
        <Link className="button secondary" href="/resources/radar">
          ← 返回面经雷达
        </Link>
      </div>
    </main>
  );
}
