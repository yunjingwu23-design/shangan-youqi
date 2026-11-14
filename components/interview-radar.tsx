'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Radar, Search, SlidersHorizontal } from 'lucide-react';
import type { Company, InterviewExperience, InterviewSource, JobRole } from '@/lib/interview-radar/types';
import {
  interviewRounds,
  recruitmentTypes,
  roleCategories,
} from '@/lib/interview-radar/types';

async function getJSON(path: string) {
  const r = await fetch(path, { cache: 'no-store' });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '加载失败，请重试。');
  return data;
}

export function InterviewRadar() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sources, setSources] = useState<InterviewSource[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [experiences, setExperiences] = useState<InterviewExperience[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [recruitmentType, setRecruitmentType] = useState('');
  const [round, setRound] = useState('');
  const [q, setQ] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getJSON('/api/interview-radar/catalog');
        setCompanies(data.companies ?? []);
        setSources(data.sources ?? []);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败。');
      }
    })();
  }, []);

  // Company autocomplete
  useEffect(() => {
    if (companyQuery.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await getJSON(
          `/api/interview-radar/catalog?q=${encodeURIComponent(companyQuery)}`
        );
        setSuggestions(data.companies ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [companyQuery]);

  // Load roles when company changes
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

  // Load experiences based on filters
  useEffect(() => {
    if (!loaded) return;
    setBusy(true);
    setError('');
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (roleId) params.set('roleId', roleId);
    if (recruitmentType) params.set('recruitmentType', recruitmentType);
    if (round) params.set('round', round);
    if (q.trim()) params.set('q', q.trim());
    void getJSON(`/api/interview-radar/experiences?${params}`)
      .then((data) => setExperiences(data.experiences ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [loaded, companyId, roleId, recruitmentType, round, q]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId),
    [companies, companyId]
  );

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">INTERVIEW RADAR</p>
        <h1>全网面经雷达</h1>
        <p>发现有出处、可追溯的面试经验。只索引来源信息与原创归纳，不搬运全文。</p>
      </div>

      <div className="site-notice">
        内容来自公开可访问的第三方面经帖索引，每日自动更新。我们只保存标题、来源链接与原创归纳，不转载全文；
        需要登录才能查看的平台不做采集，仅登记索引并等待人工核实。
      </div>

      <section className="site-card radar-search">
        <div className="radar-search-row">
          <div className="radar-company-input">
            <Search size={16} />
            <input
              type="search"
              placeholder="搜索公司，如：京东、JD、腾讯…"
              value={companyQuery}
              onChange={(e) => {
                setCompanyQuery(e.target.value);
                if (!e.target.value) setCompanyId('');
              }}
            />
            {suggestions.length > 0 && (
              <div className="radar-suggestions">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCompanyId(c.id);
                      setCompanyQuery(c.name);
                      setSuggestions([]);
                    }}
                  >
                    {c.name}
                    {c.english_name ? ` · ${c.english_name}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="search"
            placeholder="关键词（标题）"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="radar-filters">
          <label>
            <SlidersHorizontal size={14} /> 招聘类型
            <select value={recruitmentType} onChange={(e) => setRecruitmentType(e.target.value)}>
              <option value="">全部</option>
              {Object.entries(recruitmentTypes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            面试轮次
            <select value={round} onChange={(e) => setRound(e.target.value)}>
              <option value="">全部</option>
              {Object.entries(interviewRounds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
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
                    {r.name}（{roleCategories[r.category] ?? '其他'}）
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}

      {selectedCompany && (
        <section className="site-card radar-company-banner">
          <div>
            <h2>{selectedCompany.name}</h2>
            <p>
              {selectedCompany.industry && `${selectedCompany.industry} · `}
              {selectedCompany.company_group && `集团：${selectedCompany.company_group} · `}
              {selectedCompany.verified_status === 'verified' ? '已核验主体' : '待核验主体'}
            </p>
          </div>
          <Link
            className="button secondary"
            href={`/resources/radar/company/${selectedCompany.id}`}
          >
            查看公司面经主页 →
          </Link>
        </section>
      )}

      <section className="radar-results">
        <p className="radar-count">
          {busy ? '正在查找…' : `找到 ${experiences.length} 条已核实面经`}
        </p>
        {experiences.map((e) => (
          <Link
            className="site-card radar-card"
            key={e.id}
            href={`/resources/radar/experience/${e.id}`}
          >
            <div className="radar-card-head">
              <span className="job-badge">{recruitmentTypes[e.recruitment_type] ?? '未确定'}</span>
              {e.cohort && <span className="job-badge">{e.cohort}</span>}
            </div>
            <h3>{e.title}</h3>
            {e.summary && <p>{e.summary.slice(0, 120)}</p>}
          </Link>
        ))}
        {!busy && experiences.length === 0 && (
          <div className="site-card">
            <p>
              {companyId || q || recruitmentType || round
                ? '没有匹配的面经。尝试调整筛选条件，或提交你自己的面经。'
                : '暂无已核实面经。欢迎提交你的真实面试经历，帮助后来者。'}
            </p>
            <Link className="site-text-link" href="/resources/radar/submit">
              提交我的面经 →
            </Link>
          </div>
        )}
      </section>

      {sources.length > 0 && (
        <section className="site-card radar-sources">
          <h2>已接入来源</h2>
          <p>仅展示来源目录；各来源的实际采集能力以其授权状态为准。</p>
          <ul className="radar-source-list">
            {sources.map((s) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <small>
                  {s.authorization_status === 'authorized'
                    ? '已授权'
                    : s.authorization_status === 'manual_only'
                      ? '仅人工导入'
                      : '未授权'}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
