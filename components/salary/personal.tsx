'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SalaryEditor, salaryRequest, money } from './editor';
import { compensation, basisLabels, salaryStatuses, type SalaryInput } from '@/lib/salary/model';
type Row = SalaryInput & { id: string; version: number; state?: string; moderation_note?: string };
function input(r: Row): SalaryInput {
  return {
    company: r.company,
    role: r.role,
    city: r.city,
    cohort: r.cohort,
    education: r.education,
    data_year: r.data_year,
    basis: r.basis,
    base_salary: Number(r.base_salary),
    salary_months: Number(r.salary_months),
    bonus: r.bonus == null ? null : Number(r.bonus),
    stock: r.stock == null ? null : Number(r.stock),
    subsidy: r.subsidy == null ? null : Number(r.subsidy),
  };
}
export function PersonalSalary({ reports = false }: { reports?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]),
    [editing, setEditing] = useState<Row | 'new' | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [loaded, setLoaded] = useState(false);
  const endpoint = '/api/salary/' + (reports ? 'reports' : 'offers');
  async function load() {
    try {
      const d = await salaryRequest(endpoint);
      setRows(d[reports ? 'reports' : 'offers']);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [endpoint]);
  const compared = rows.filter((r) => selected.includes(r.id));
  return (
    <section className="salary-personal">
      <div className="salary-section-heading">
        <div>
          <h2>{reports ? '我的匿名投稿' : '我的 Offer'}</h2>
          <p className="muted">
            {reports
              ? '新投稿和修改均重新审核；不公开个人明细。'
              : '仅本人可见，不会自动分享到薪资库。选择 2–6 个 Offer 并排比较。'}
          </p>
        </div>
        <button className="primary" onClick={() => setEditing('new')}>
          {reports ? '匿名分享 Offer' : '添加 Offer'}
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {editing && (
        <SalaryEditor
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : input(editing)}
          share={reports}
          onCancel={() => setEditing(null)}
          onSave={async (v) => {
            await salaryRequest(
              endpoint,
              editing === 'new' ? 'POST' : 'PATCH',
              editing === 'new' ? v : { ...v, id: editing.id, version: editing.version }
            );
            setEditing(null);
            setNotice(reports ? '已提交，审核通过且满足隐私样本门槛后才会纳入统计。' : '已保存。');
            await load();
          }}
        />
      )}
      {!loaded && !error && <p role="status">正在读取…</p>}
      {loaded && !rows.length && (
        <div className="salary-empty">
          <h3>{reports ? '还没有投稿' : '让每一个选择更清楚'}</h3>
          <p>
            {reports
              ? '分享一份真实 Offer，帮助后来者了解行情。'
              : '添加真实 Offer，从固定收入、浮动待遇和城市开始比较。'}
          </p>
        </div>
      )}
      <div className="salary-list">
        {rows.map((r) => (
          <article className="salary-own-card" key={r.id}>
            <div>
              <h3>
                {r.company} · {r.role}
              </h3>
              <p>
                {r.city} · {r.data_year} 年 · {basisLabels[r.basis]} {money(Number(r.base_salary))}
              </p>
              {reports && (
                <>
                  <span className="salary-pill">{salaryStatuses[r.state!]}</span>
                  {r.moderation_note && <p>审核反馈：{r.moderation_note}</p>}
                </>
              )}
            </div>
            <div className="salary-actions">
              {!reports && (
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    disabled={!selected.includes(r.id) && selected.length >= 6}
                    onChange={(e) =>
                      setSelected((old) =>
                        e.target.checked ? [...old, r.id] : old.filter((id) => id !== r.id)
                      )
                    }
                  />
                  加入对比
                </label>
              )}
              <button onClick={() => setEditing(r)}>修改</button>
              <button
                onClick={async () => {
                  if (!confirm('确定删除这条记录？删除后不再参与公开聚合。')) return;
                  try {
                    await salaryRequest(endpoint, 'DELETE', { id: r.id });
                    setSelected((s) => s.filter((id) => id !== r.id));
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                删除
              </button>
            </div>
          </article>
        ))}
      </div>
      {!reports && compared.length > 0 && (
        <div className="salary-comparison">
          <h2>
            Offer 对比 <small>{compared.length}/6</small>
          </h2>
          <p className="muted">
            不同计薪口径分别显示，日薪不折算年薪；总包含浮动收入，不代表保证收益。
          </p>
          <div className="salary-table-scroll">
            <table>
              <caption>个人 Offer 待遇及地点对比</caption>
              <thead>
                <tr>
                  <th>比较维度</th>
                  {compared.map((r) => (
                    <th key={r.id}>
                      {r.company}
                      <small>{r.role}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['工作城市', (r: Row) => r.city],
                  ['届别 / 学历', (r: Row) => `${r.cohort} / ${r.education}`],
                  ['数据年份', (r: Row) => String(r.data_year)],
                  ['计薪口径', (r: Row) => basisLabels[r.basis]],
                  ['基本工资', (r: Row) => money(Number(r.base_salary))],
                  [
                    '固定薪资月数',
                    (r: Row) => (r.basis === 'monthly' ? String(r.salary_months) : '不适用'),
                  ],
                  ['固定年薪', (r: Row) => money(compensation(input(r)).fixed)],
                  ['年度奖金', (r: Row) => money(r.bonus)],
                  ['年度股票估值', (r: Row) => money(r.stock)],
                  ['年度补贴', (r: Row) => money(r.subsidy)],
                  ['预期年总包', (r: Row) => money(compensation(input(r)).total)],
                ].map(([label, fn]) => (
                  <tr key={label as string}>
                    <th>{label as string}</th>
                    {compared.map((r) => (
                      <td key={r.id}>{(fn as (r: Row) => string)(r)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!reports && (
        <p>
          <Link href="/jobs/salary">去查薪资 / 管理匿名投稿 →</Link>
        </p>
      )}
    </section>
  );
}
