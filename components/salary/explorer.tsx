'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { salaryRequest, money } from './editor';
import { PersonalSalary } from './personal';
import { basisLabels } from '@/lib/salary/model';
type Group = {
  company: string;
  role: string;
  city: string;
  cohort: number;
  education: string;
  data_year: number;
  basis: keyof typeof basisLabels;
  sample_floor: number;
  p25: number;
  median: number;
  p75: number;
  fixed_median: number | null;
  total_median: number | null;
  bonus_median: number | null;
  stock_median: number | null;
  subsidy_median: number | null;
  months_median: number | null;
  sources: { name: string; url: string | null; credibility: string; verification: string }[];
};
export function SalaryExplorer({ signedIn }: { signedIn: boolean }) {
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [groups, setGroups] = useState<Group[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true),
    [complaint, setComplaint] = useState<Group | null>(null),
    [reason, setReason] = useState(''),
    [notice, setNotice] = useState('');
  async function search(f = filters) {
    setBusy(true);
    setError('');
    try {
      const d = await salaryRequest('/api/salary?' + new URLSearchParams(f));
      setGroups(d.groups);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void search({});
  }, []);
  return (
    <main className="salary-shell">
      <header className="salary-hero">
        <p className="site-eyebrow">SALARY INTELLIGENCE</p>
        <h1>
          看清待遇，
          <br />
          再做下一步选择。
        </h1>
        <p>用真实样本了解行情，用自己的标准比较 Offer。</p>
        <div className="salary-actions">
          <Link className="primary" href="/workspace/offers">
            我的 Offer 对比 ↗
          </Link>
          <a href="#salary-share">匿名分享 / 我的投稿</a>
        </div>
      </header>
      <section className="salary-query">
        <h2>查薪资</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <div className="salary-fields">
            {[
              ['company', '公司'],
              ['role', '岗位'],
              ['city', '城市'],
              ['cohort', '毕业届别'],
              ['data_year', '数据年份'],
            ].map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  maxLength={80}
                  placeholder={k === 'cohort' ? '例如 2027' : '不限'}
                  value={filters[k] || ''}
                  onChange={(e) => setFilters((v) => ({ ...v, [k]: e.target.value }))}
                />
              </label>
            ))}
            <label>
              学历
              <select
                value={filters.education || ''}
                onChange={(e) => setFilters((v) => ({ ...v, education: e.target.value }))}
              >
                <option value="">不限</option>
                {['专科', '本科', '硕士', '博士', '其他'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              计薪口径
              <select
                value={filters.basis || ''}
                onChange={(e) => setFilters((v) => ({ ...v, basis: e.target.value }))}
              >
                <option value="">分别展示全部口径</option>
                {Object.entries(basisLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="primary" disabled={busy}>
            {busy ? '查询中…' : '查询薪资'}
          </button>
        </form>
      </section>
      <aside className="salary-privacy">
        <strong>先保护隐私，再看分布</strong>
        <p>
          仅展示审核通过且至少有 5 位不同投稿者的固定统计组。样本量以 5 人区间展示；月薪 /
          年薪按千元、实习日薪按 50
          元取整。小样本不展示数量或明细，各项中位数样本不足时隐藏。不同口径和年份不混算，不支持任意拼接分组。
        </p>
      </aside>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!busy && !error && !groups.length && (
        <div className="salary-empty">
          <span>—</span>
          <h2>还没有满足条件的公开样本</h2>
          <p>可能尚无投稿、正在审核，或样本不足以安全展示。这里不会用演示薪资填充。</p>
          <a href="#salary-share">分享真实 Offer →</a>
        </div>
      )}
      <div className="salary-results" aria-live="polite">
        {groups.map((g, i) => (
          <article className="salary-result" key={i}>
            <header>
              <div>
                <span className="salary-pill">
                  {g.data_year} 年 · {g.sample_floor}–{g.sample_floor + 4} 位投稿者
                </span>
                <h2>{g.company}</h2>
                <p>
                  {g.role} · {g.city} · {g.cohort} 届 · {g.education}
                </p>
              </div>
              <span className="salary-pill">{basisLabels[g.basis]}</span>
            </header>
            <div className="salary-distribution">
              <div>
                <small>下四分位 P25</small>
                <strong>{money(g.p25)}</strong>
              </div>
              <div>
                <small>中位数 P50</small>
                <strong>{money(g.median)}</strong>
              </div>
              <div>
                <small>上四分位 P75</small>
                <strong>{money(g.p75)}</strong>
              </div>
            </div>
            {g.basis !== 'daily' && (
              <dl className="salary-metrics">
                {[
                  [
                    '固定薪资月数中位数',
                    g.months_median == null ? '未披露' : `${g.months_median} 个月`,
                  ],
                  ['固定年薪中位数', money(g.fixed_median)],
                  ['年度奖金中位数', money(g.bonus_median)],
                  ['年度股票估值中位数', money(g.stock_median)],
                  ['年度补贴中位数', money(g.subsidy_median)],
                  ['预期年总包中位数', money(g.total_median)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="muted">
              分位数为基本工资分布，各结构项分别计算；各中位数相加不等于总包中位数。股票和奖金不保证兑现。
            </p>
            <footer>
              <strong>数据来源与可信度</strong>
              {g.sources.map((s, j) => (
                <p key={j}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name} ↗
                    </a>
                  ) : (
                    s.name
                  )}{' '}
                  ·{' '}
                  {s.credibility === 'official'
                    ? '官方公开来源'
                    : s.credibility === 'licensed'
                      ? '已授权来源'
                      : s.verification === 'source_checked'
                        ? '经审核员核验的用户投稿（非公司保证）'
                        : '用户自述，真实性未独立证实'}
                </p>
              ))}
              <button
                onClick={() => {
                  setComplaint(g);
                  setReason('');
                  setNotice('');
                }}
              >
                举报此统计组
              </button>
            </footer>
          </article>
        ))}
      </div>
      {complaint && (
        <form
          className="salary-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await salaryRequest('/api/salary/complaints', 'POST', {
                group_key: [
                  complaint.company,
                  complaint.role,
                  complaint.city,
                  complaint.cohort,
                  complaint.education,
                  complaint.data_year,
                  complaint.basis,
                ].join(' / '),
                reason,
              });
              setComplaint(null);
              setNotice('举报已提交，审核员会核查并处理。');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <h2>举报 {complaint.company} 的统计组</h2>
          {signedIn ? (
            <>
              <label>
                问题说明（不含个人信息）
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button className="primary">提交举报</button>
            </>
          ) : (
            <Link href="/login?next=%2Fjobs%2Fsalary">登录后提交举报</Link>
          )}{' '}
          <button type="button" onClick={() => setComplaint(null)}>
            取消
          </button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      <section className="salary-partner">
        <div>
          <p className="site-eyebrow">EXTERNAL LOOKUP</p>
          <h2>OfferShow 查询指引</h2>
          <p>
            在微信搜索并核对 OfferShow 官方小程序主体后查询。本站尚未获得授权和接口文档，未接入其
            API，也未导入其数据。
          </p>
        </div>
        <span className="salary-pill">合作数据源 · 尚未接入</span>
      </section>
      <section id="salary-share">
        {signedIn ? (
          <PersonalSalary reports />
        ) : (
          <div className="salary-empty">
            <h2>让薪资信息更透明</h2>
            <p>登录后匿名分享、修改或删除自己的 Offer。公开展示前均需脱敏审核。</p>
            <Link className="primary" href="/login?next=%2Fjobs%2Fsalary">
              登录后匿名分享
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
