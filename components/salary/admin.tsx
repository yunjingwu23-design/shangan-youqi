'use client';
import { useEffect, useState } from 'react';
import { salaryRequest, money } from './editor';
import { salaryStatuses, basisLabels } from '@/lib/salary/model';
type Data = {
  reports: any[];
  companies: any[];
  sources: any[];
  complaints: any[];
  logs: any[];
  aliases: any[];
  counts: Record<string, number>;
};
export function SalaryAdmin({ canReview }: { canReview: boolean }) {
  const [d, setD] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [selected, setSelected] = useState<any>(null),
    [company, setCompany] = useState(''),
    [role, setRole] = useState(''),
    [city, setCity] = useState(''),
    [source, setSource] = useState(''),
    [verified, setVerified] = useState(false),
    [checked, setChecked] = useState(false),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [state, setState] = useState('pending');
  async function load() {
    try {
      setD(await salaryRequest('/api/admin/salary'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(v: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await salaryRequest('/api/admin/salary', 'POST', v);
      setNotice('已保存并写入审核日志。');
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function form(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    return Object.fromEntries(new FormData(e.currentTarget));
  }
  return (
    <main className="salary-shell">
      <header className="salary-hero">
        <p className="site-eyebrow">SALARY OPERATIONS</p>
        <h1>薪资审核与来源</h1>
        <p>
          先核对来源、异常和隐私，再批准进入聚合统计。内容编辑可查看，审核员和超级管理员可处理；禁止审核自己的投稿。
        </p>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!d ? (
        <p>正在读取…</p>
      ) : (
        <>
          <section className="salary-metrics">
            {Object.entries(salaryStatuses).map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>{d.counts[k] || 0}</dd>
              </div>
            ))}
          </section>
          <section className="salary-query">
            <h2>投稿审核</h2>
            <label>
              筛选状态
              <select value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">全部</option>
                {Object.entries(salaryStatuses).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              显示最近 200
              条投稿；统计计数独立于当前列表。相似投稿提示只辅助核查，不自动合并；金额极值不自动剔除。
            </p>
            <div className="salary-list">
              {d.reports
                .filter((r) => !state || r.state === state)
                .map((r) => (
                  <article className="salary-own-card" key={r.id}>
                    <div>
                      <h3>
                        {r.company} · {r.role}
                      </h3>
                      <p>
                        {r.city} · {r.cohort} 届 · {r.education} · {r.data_year} 年
                      </p>
                      <p>
                        {basisLabels[r.basis as keyof typeof basisLabels]}{' '}
                        {money(Number(r.base_salary))} · {r.salary_months} 薪
                      </p>
                      <p>
                        年度奖金 {money(r.bonus)} · 股票 {money(r.stock)} · 补贴 {money(r.subsidy)}
                      </p>
                      <span className="salary-pill">{salaryStatuses[r.state]}</span>
                      {r.flags.map((f: string) => (
                        <p key={f} className="error">
                          {f}
                        </p>
                      ))}
                    </div>
                    {canReview && (
                      <button
                        onClick={() => {
                          setSelected(r);
                          setCompany(r.public_company_id || '');
                          setRole(r.public_role || r.role);
                          setCity(r.public_city || r.city);
                          setSource(r.source_id || '');
                          setNote('');
                          setChecked(false);
                          setVerified(false);
                        }}
                      >
                        审核 / 隐藏
                      </button>
                    )}
                  </article>
                ))}
            </div>
          </section>
          {selected && (
            <section className="salary-editor">
              <h2>
                审核 {selected.company} · {selected.role}
              </h2>
              <div className="salary-fields">
                <label>
                  公开标准公司
                  <select value={company} onChange={(e) => setCompany(e.target.value)}>
                    <option value="">请选择已维护的公司</option>
                    {d.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  公开标准岗位（删除团队、级别等身份线索）
                  <input maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} />
                </label>
                <label>
                  公开城市（不要填地址或园区）
                  <input maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
                <label>
                  来源
                  <select value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="">本站用户匿名投稿（默认自述）</option>
                    {d.sources
                      .filter((s) => s.active)
                      .map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <label className="salary-consent">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                已独立核验来源；不是仅凭金额合理性推断真实性
              </label>
              <label className="salary-consent">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                已移除可识别身份线索，检查重复、异常、计薪口径与年份。反馈不含身份信息。
              </label>
              <label>
                审核说明（10–500 字，用户可见）
                <textarea
                  minLength={10}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="salary-actions">
                {[
                  ['approved', '通过'],
                  ['rejected', '退回修改'],
                  ['hidden', '隐藏 / 下架'],
                ].map(([s, label]) => (
                  <button
                    key={s}
                    disabled={
                      busy ||
                      !checked ||
                      note.trim().length < 10 ||
                      (s === 'approved' && (!company || !role || !city))
                    }
                    onClick={async () => {
                      if (
                        await save({
                          action: 'review',
                          id: selected.id,
                          version: selected.version,
                          state: s,
                          company_id: company || null,
                          role,
                          city,
                          source_id: source || null,
                          verified,
                          privacy_checked: true,
                          note,
                        })
                      )
                        setSelected(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button onClick={() => setSelected(null)}>取消</button>
              </div>
            </section>
          )}
          {canReview && (
            <section className="salary-query">
              <h2>公司、岗位别名与来源维护</h2>
              <p className="muted">
                外部来源必须有真实 URL 和授权 / 官方来源依据；登记来源不会启用任何 API
                或导入数据。不要将未获授权的 OfferShow 登记为合作源。
              </p>
              <div className="salary-admin-forms">
                <form
                  onSubmit={(e) => {
                    const p = form(e);
                    void save({ action: 'company', payload: p });
                  }}
                >
                  <h3>标准公司</h3>
                  <label>
                    公司名称
                    <input name="name" required maxLength={80} />
                  </label>
                  <label>
                    公司官网（可空）
                    <input name="url" type="url" />
                  </label>
                  <button disabled={busy}>保存公司</button>
                </form>
                <form
                  onSubmit={(e) => {
                    const p = form(e);
                    void save({ action: 'alias', payload: p });
                  }}
                >
                  <h3>岗位别名</h3>
                  <label>
                    搜索别名
                    <input required name="alias" maxLength={80} />
                  </label>
                  <label>
                    标准岗位
                    <input required name="canonical_role" maxLength={80} />
                  </label>
                  <button disabled={busy}>保存别名</button>
                </form>
                <form
                  onSubmit={(e) => {
                    const p = form(e);
                    void save({ action: 'source', payload: p });
                  }}
                >
                  <h3>来源档案</h3>
                  <label>
                    真实来源名称
                    <input required name="name" maxLength={100} />
                  </label>
                  <label>
                    真实来源 URL
                    <input required type="url" name="url" />
                  </label>
                  <label>
                    可信度
                    <select name="credibility">
                      <option value="official">官方公开资料</option>
                      <option value="licensed">已正式授权</option>
                    </select>
                  </label>
                  <label>
                    官方依据 / 授权记录（不含密钥）
                    <textarea required name="authorization_note" minLength={10} maxLength={500} />
                  </label>
                  <button disabled={busy}>登记来源</button>
                </form>
              </div>
            </section>
          )}
          <section className="salary-query">
            <h2>来源状态</h2>
            {!d.sources.length && <p>尚无外部来源；没有第三方薪资数据。</p>}
            {d.sources.map((s) => (
              <article className="salary-own-card" key={s.id}>
                <div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.name} ↗
                  </a>
                  <p>
                    {s.credibility === 'official' ? '官方公开资料' : '已授权'} ·{' '}
                    {s.active ? '启用' : '停用'}
                  </p>
                </div>
                {canReview && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void save({
                        action: 'source_toggle',
                        payload: { id: s.id, active: !s.active },
                      })
                    }
                  >
                    {s.active ? '停用（相关统计将隐藏）' : '启用'}
                  </button>
                )}
              </article>
            ))}
          </section>
          <section className="salary-query">
            <h2>举报处理</h2>
            {!d.complaints.length && <p>暂无举报。</p>}
            {d.complaints.map((c) => (
              <article className="salary-own-card" key={c.id}>
                <div>
                  <h3>{c.group_key}</h3>
                  <p>{c.reason}</p>
                  <span className="salary-pill">{c.state === 'pending' ? '待处理' : '已处理'}</span>
                  <p>{c.resolution}</p>
                </div>
                {canReview && c.state === 'pending' && (
                  <form
                    onSubmit={(e) => {
                      const p = form(e);
                      void save({ action: 'resolve', payload: { id: c.id, ...p } });
                    }}
                  >
                    <label>
                      核查及处理结论
                      <textarea name="resolution" required minLength={10} maxLength={500} />
                    </label>
                    <button disabled={busy}>完成处理</button>
                  </form>
                )}
              </article>
            ))}
          </section>
          <details className="salary-query">
            <summary>最近 100 条审核与维护日志</summary>
            {d.logs.map((l) => (
              <p key={l.id}>
                {new Date(l.created_at).toLocaleString('zh-CN')} · {l.action} · {l.note}
              </p>
            ))}
          </details>
        </>
      )}
    </main>
  );
}
