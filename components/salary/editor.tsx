'use client';
import { useState } from 'react';
import {
  salaryDefaults,
  salarySchema,
  compensation,
  basisLabels,
  type SalaryInput,
} from '@/lib/salary/model';
export async function salaryRequest(path: string, method = 'GET', body?: unknown) {
  const r = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '操作失败，请稍后重试');
  return data;
}
export const money = (v: number | null | undefined) =>
  v == null
    ? '未披露'
    : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(v) + ' 元';
export function SalaryEditor({
  initial,
  onSave,
  onCancel,
  share = false,
}: {
  initial?: SalaryInput;
  onSave: (v: SalaryInput) => Promise<void>;
  onCancel: () => void;
  share?: boolean;
}) {
  const [v, setV] = useState<SalaryInput>(initial || salaryDefaults),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false);
  const set = (key: keyof SalaryInput, value: unknown) => setV((old) => ({ ...old, [key]: value }));
  const c = compensation(v);
  return (
    <form
      className="salary-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const parsed = salarySchema.safeParse(v);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setBusy(true);
        try {
          await onSave(parsed.data);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="salary-section-heading">
        <h2>{share ? '匿名分享 Offer' : '个人 Offer'}</h2>
        <button type="button" onClick={onCancel}>
          取消
        </button>
      </div>
      <p className="muted">
        金额统一为人民币、税前。奖金、股票和补贴填写年度金额；股票按年度归属估值，可能无法兑现。未知请留空，确认没有时填
        0。
      </p>
      <div className="salary-fields">
        {(['company', 'role', 'city'] as const).map((k, i) => (
          <label key={k}>
            {['公司', '岗位', '工作城市'][i]}
            <input required maxLength={80} value={v[k]} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
        <label>
          毕业届别
          <input
            type="number"
            min={2000}
            max={2100}
            value={v.cohort}
            onChange={(e) => set('cohort', Number(e.target.value))}
          />
        </label>
        <label>
          学历
          <select value={v.education} onChange={(e) => set('education', e.target.value)}>
            {['专科', '本科', '硕士', '博士', '其他'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          数据年份
          <input
            type="number"
            min={2000}
            max={new Date().getFullYear() + 1}
            value={v.data_year}
            onChange={(e) => set('data_year', Number(e.target.value))}
          />
        </label>
        <label>
          薪资口径
          <select
            value={v.basis}
            onChange={(e) =>
              setV((old) => ({
                ...old,
                basis: e.target.value as SalaryInput['basis'],
                salary_months: 12,
                ...(e.target.value === 'daily' ? { bonus: null, stock: null, subsidy: null } : {}),
              }))
            }
          >
            {Object.entries(basisLabels).map(([k, s]) => (
              <option key={k} value={k}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          {basisLabels[v.basis]}（元）
          <input
            type="number"
            required
            min={0.01}
            max={100000000}
            step="0.01"
            value={v.base_salary || ''}
            onChange={(e) => set('base_salary', Number(e.target.value))}
          />
        </label>
        {v.basis === 'monthly' && (
          <label>
            固定薪资月数
            <input
              type="number"
              min={1}
              max={24}
              step="0.5"
              value={v.salary_months}
              onChange={(e) => set('salary_months', Number(e.target.value))}
            />
          </label>
        )}
        {v.basis !== 'daily' &&
          (['bonus', 'stock', 'subsidy'] as const).map((k, i) => (
            <label key={k}>
              {['年度奖金', '年度归属股票估值', '年度补贴'][i]}（元）
              <input
                type="number"
                min={0}
                max={100000000}
                step="0.01"
                value={v[k] ?? ''}
                onChange={(e) => set(k, e.target.value === '' ? null : Number(e.target.value))}
              />
            </label>
          ))}
      </div>
      <div className="salary-summary">
        {v.basis === 'daily' ? (
          '日薪单独比较，不推算年包'
        ) : (
          <>
            固定年薪 {money(c.fixed)} · 预期年总包 {money(c.total)}
            <small>
              总包 = 固定年薪 + 年度奖金 + 年度股票估值 + 年度补贴；任一项未知时不计算总包。
            </small>
          </>
        )}
      </div>
      {share && (
        <label className="salary-consent">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          这是本人真实
          Offer；不含姓名、联系方式、团队等身份信息。我同意脱敏审核后仅用于匿名聚合统计；可随时修改或删除。
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy || (share && !consent)}>
        {busy ? '保存中…' : share ? '提交审核' : '保存到个人对比表'}
      </button>
    </form>
  );
}
