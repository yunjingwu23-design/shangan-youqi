'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import {
  calculatePayroll,
  defaultPayrollInput,
  insuranceKeys,
  insuranceLabels,
  type PayrollInput,
  type InsuranceKey,
} from '@/lib/salary/calculator';
const currency = (n: number) =>
  new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) +
  ' 元';
type NumericProps = {
  id: string;
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  optional?: boolean;
  max?: number;
  step?: number;
  hint?: string;
};
function NumberField({
  id,
  label,
  value,
  onChange,
  optional = false,
  max = 1000000,
  step = 0.01,
  hint,
}: NumericProps) {
  return (
    <div className="calculator-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        required={!optional}
        value={value === null || Number.isNaN(value) ? '' : value}
        placeholder={optional ? '留空使用默认规则' : undefined}
        onChange={(e) =>
          onChange(e.target.value === '' && optional ? null : e.target.valueAsNumber)
        }
        aria-describedby={hint ? id + '-help' : undefined}
      />
      {hint && <small id={id + '-help'}>{hint}</small>}
    </div>
  );
}
export function SalaryCalculator() {
  const [v, setV] = useState<PayrollInput>(defaultPayrollInput),
    [custom, setCustom] = useState(false);
  const calculated = useMemo(() => {
    try {
      return { result: calculatePayroll(v), error: '' };
    } catch (e) {
      return {
        result: null,
        error:
          e instanceof z.ZodError
            ? e.issues.find((i) => i.code === 'custom')?.message ||
              '请完整填写有效参数：金额不能为负，年份为 2019–2027，固定薪资月数为 12–24，比例不能超过 100%。'
            : (e as Error).message,
      };
    }
  }, [v]);
  const r = calculated.result;
  function number(
    key:
      | 'monthlySalary'
      | 'salaryMonths'
      | 'annualBonus'
      | 'additionalDeduction'
      | 'otherTaxDeduction'
      | 'medicalExtra'
      | 'deductibleContributions',
    n: number | null
  ) {
    setV((old) => ({ ...old, [key]: n }));
  }
  function setBase(
    key: 'socialBase' | 'housingBase',
    field: keyof PayrollInput['socialBase'],
    value: unknown
  ) {
    setCustom(true);
    setV((old) => ({ ...old, [key]: { ...old[key], [field]: value } }));
  }
  function setRate(
    key: InsuranceKey,
    field: 'employee' | 'employer' | 'baseOverride',
    value: number | null
  ) {
    setCustom(true);
    setV((old) => ({
      ...old,
      rates: { ...old.rates, [key]: { ...old.rates[key], [field]: value } },
    }));
  }
  const years = Array.from({ length: 9 }, (_, i) => 2019 + i);
  return (
    <main className="salary-shell calculator-shell">
      <header className="salary-hero">
        <p className="site-eyebrow">SALARY & BENEFITS CALCULATOR</p>
        <h1>
          税前数字，
          <br />
          落到手里是多少？
        </h1>
        <p>算清工资、个税、社保和公积金，也看见一份 Offer 的完整成本。</p>
        <div className="salary-actions">
          <Link href="/jobs/salary">← 查薪资</Link>
          <Link href="/workspace/offers">我的 Offer 对比 ↗</Link>
          <span className="salary-pill">无需登录 · 输入在浏览器本地计算</span>
        </div>
      </header>
      <aside className="salary-privacy">
        <strong>{custom ? '自定义缴费参数' : '当前为演示缴费参数'} · 未加载城市官方标准</strong>
        <p>
          不同城市、年度和单位的基数与比例可能不同。请按工资条或当地规定调整下方参数；只填写城市名称不会自动加载政策。未填基数上下限时不作封顶或保底校正。
        </p>
      </aside>
      <div className="calculator-layout">
        <section className="salary-query">
          <div className="salary-section-heading">
            <h2>收入与计税</h2>
            <button
              onClick={() => {
                setV(defaultPayrollInput());
                setCustom(false);
              }}
            >
              恢复示例
            </button>
          </div>
          <div className="salary-fields calculator-fields">
            <label htmlFor="calc-year">
              计算年度
              <select
                id="calc-year"
                value={v.year}
                onChange={(e) => setV((old) => ({ ...old, year: Number(e.target.value) }))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="calc-city">
              缴费城市（备注）
              <input
                id="calc-city"
                maxLength={40}
                placeholder="例如上海；请自行核对当地参数"
                value={v.city}
                onChange={(e) => setV((old) => ({ ...old, city: e.target.value }))}
              />
            </label>
            <NumberField
              id="calc-salary"
              label="税前固定月薪（元）"
              value={v.monthlySalary}
              onChange={(n) => number('monthlySalary', n)}
              hint="含固定应税现金补贴；本模型按全年 12 个月任职估算。"
            />
            <NumberField
              id="calc-months"
              label="固定薪资月数"
              value={v.salaryMonths}
              max={24}
              onChange={(n) => number('salaryMonths', n)}
              hint="12–24；超过 12 薪部分按 12 月普通工资计税。"
            />
            <NumberField
              id="calc-bonus"
              label="年终奖金（元）"
              value={v.annualBonus}
              onChange={(n) => number('annualBonus', n)}
              hint="额外输入，不要重复计入固定薪资月数。"
            />
            <NumberField
              id="calc-additional"
              label="专项附加扣除（元/月）"
              value={v.additionalDeduction}
              onChange={(n) => number('additionalDeduction', n)}
              hint="子女教育、住房租金等当年符合条件的月度合计；只影响税额。"
            />
            <NumberField
              id="calc-other"
              label="其他依法可扣除项目（元/月）"
              value={v.otherTaxDeduction}
              onChange={(n) => number('otherTaxDeduction', n)}
              hint="仅调节税基，不视为另外一笔工资代扣。无此项目填 0。"
            />
            <label htmlFor="calc-bonus-mode">
              年终奖计税方式
              <select
                id="calc-bonus-mode"
                value={v.bonusMode}
                onChange={(e) =>
                  setV((old) => ({
                    ...old,
                    bonusMode: e.target.value as PayrollInput['bonusMode'],
                  }))
                }
              >
                <option value="combined">并入综合所得</option>
                <option value="separate">全年一次性奖金单独计税（符合条件时）</option>
              </select>
            </label>
          </div>
          {v.bonusMode === 'separate' && (
            <label className="salary-consent">
              <input
                type="checkbox"
                checked={v.bonusEligible}
                onChange={(e) => setV((old) => ({ ...old, bonusEligible: e.target.checked }))}
              />
              这笔奖金符合全年一次性奖金条件，且本年度尚未使用单独计税方式。
            </label>
          )}
          <p className="calculator-note">
            工资按居民个人累计预扣法计算，每月减除费用 5,000
            元。模型假设全年同一单位、每月基数与扣除稳定，额外薪资和年终奖均在 12 月发放。
          </p>
        </section>
        <aside className="salary-query calculator-results" id="calculation-results">
          <p className="site-eyebrow">YOUR ESTIMATED TAKE-HOME</p>
          <h2>到手收入估算</h2>
          <p className="muted">
            {v.year} 年 · {v.city.trim() || '城市未指定'} ·{' '}
            {v.bonusMode === 'combined' ? '奖金并入综合所得' : '奖金单独计税'}
          </p>
          {calculated.error ? (
            <p role="alert" className="error">
              {calculated.error}
            </p>
          ) : (
            r && (
              <>
                <div className="calculator-net">
                  <small>年净收入（现金）</small>
                  <output aria-label="年净收入估算" aria-live="polite">
                    {currency(r.annualNet)}
                  </output>
                </div>
                <dl className="calculator-summary">
                  {[
                    ['全年平均每月到手', r.averageMonthlyNet],
                    ['全年税前收入', r.annualGross],
                    ['全年个人所得税', r.annualTax],
                    ['个人每月社保及公积金', r.monthlyPersonal],
                    ['单位每月社保及公积金', r.monthlyEmployer],
                    ['单位全年用工成本', r.annualEmployerCost],
                    ['公积金全年双边入账', r.annualHousing],
                  ].map(([name, value]) => (
                    <div key={name as string}>
                      <dt>{name as string}</dt>
                      <dd>
                        <output aria-label={name as string}>{currency(value as number)}</output>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="calculator-note">
                  平均每月到手为年净收入 ÷
                  12，含年终奖及额外薪资，并非每月工资条金额。公积金双边入账单列，不加入到手现金。单位缴费不从个人工资中扣除。
                </p>
                {r.warnings.map((w) => (
                  <p role="alert" className="error" key={w}>
                    {w}
                  </p>
                ))}
              </>
            )
          )}
        </aside>
      </div>
      <section className="salary-query">
        <div className="salary-section-heading">
          <div>
            <h2>社保 / 公积金参数</h2>
            <p className="muted">
              {custom ? '已手动调整' : '以下比例仅作演示'} · 请以缴费所在地和公司的实际参数为准
            </p>
          </div>
          <span className="salary-pill">可自定义比例、基数和上下限</span>
        </div>
        <div className="calculator-bases">
          {(['socialBase', 'housingBase'] as const).map((key, i) => (
            <fieldset key={key}>
              <legend>{i === 0 ? '社保公共基数' : '公积金独立基数'}</legend>
              <label htmlFor={'calc-' + key + '-mode'}>
                基数取值
                <select
                  id={'calc-' + key + '-mode'}
                  value={v[key].mode}
                  onChange={(e) => setBase(key, 'mode', e.target.value)}
                >
                  <option value="salary">按本次月薪估算</option>
                  <option value="custom">使用公司核定基数</option>
                </select>
              </label>
              {v[key].mode === 'custom' && (
                <NumberField
                  id={'calc-' + key + '-value'}
                  label={i === 0 ? '社保核定基数（元）' : '公积金核定基数（元）'}
                  value={v[key].value}
                  onChange={(n) => setBase(key, 'value', n)}
                />
              )}
              <div className="salary-fields calculator-fields">
                <NumberField
                  id={'calc-' + key + '-min'}
                  label={i === 0 ? '社保基数下限（元）' : '公积金基数下限（元）'}
                  value={v[key].minimum}
                  optional
                  onChange={(n) => setBase(key, 'minimum', n)}
                  hint="未知时留空；不会自动套用城市标准。"
                />
                <NumberField
                  id={'calc-' + key + '-max'}
                  label={i === 0 ? '社保基数上限（元）' : '公积金基数上限（元）'}
                  value={v[key].maximum}
                  optional
                  onChange={(n) => setBase(key, 'maximum', n)}
                  hint="未知时留空；公积金还需核对税前扣除限额。"
                />
              </div>
              <p className="calculator-note">
                生效基数：
                {r
                  ? currency(i === 0 ? r.effectiveSocialBase : r.effectiveHousingBase)
                  : '请先修正参数'}
              </p>
            </fieldset>
          ))}
        </div>
        <label className="salary-consent">
          <input
            type="checkbox"
            checked={v.maternityMerged}
            onChange={(e) => {
              const checked = e.target.checked;
              setCustom(true);
              setV((old) => ({
                ...old,
                maternityMerged: checked,
                rates: {
                  ...old.rates,
                  maternity: {
                    ...old.rates.maternity,
                    employer: checked ? 0 : old.rates.maternity.employer,
                  },
                },
              }));
            }}
          />
          单位生育保险已并入医疗保险（避免重复缴费）
        </label>
        <div
          className="salary-table-scroll calculator-table"
          tabIndex={0}
          role="region"
          aria-label="计算明细（可横向滚动）"
        >
          <table>
            <caption>每月缴费明细：先确定基数，再按各方比例分别计算到分</caption>
            <thead>
              <tr>
                <th scope="col">项目</th>
                <th scope="col">个人比例 %</th>
                <th scope="col">单位比例 %</th>
                <th scope="col">实际基数</th>
                <th scope="col">个人月缴费</th>
                <th scope="col">单位月缴费</th>
                <th scope="col">单项核定基数覆盖</th>
              </tr>
            </thead>
            <tbody>
              {insuranceKeys.map((key) => {
                const row = r?.contributions.find((item) => item.key === key);
                return (
                  <tr key={key}>
                    <th scope="row">{insuranceLabels[key]}</th>
                    {(['employee', 'employer'] as const).map((party) => (
                      <td key={party}>
                        <input
                          aria-label={`${insuranceLabels[key]}${party === 'employee' ? '个人' : '单位'}比例（%）`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={key === 'housing' ? 12 : 100}
                          step={0.0001}
                          value={Number.isNaN(v.rates[key][party]) ? '' : v.rates[key][party]}
                          disabled={
                            (party === 'employee' && (key === 'injury' || key === 'maternity')) ||
                            (party === 'employer' && key === 'maternity' && v.maternityMerged)
                          }
                          onChange={(e) => setRate(key, party, e.target.valueAsNumber)}
                        />
                      </td>
                    ))}
                    <td>{row ? currency(row.base) : '—'}</td>
                    <td>{row ? currency(row.employee) : '—'}</td>
                    <td>{row ? currency(row.employer) : '—'}</td>
                    <td>
                      {key === 'housing' ? (
                        <small>使用公积金独立基数</small>
                      ) : (
                        <input
                          aria-label={`${insuranceLabels[key]}单项基数覆盖（元）`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={1000000}
                          step={0.01}
                          placeholder="使用公共基数"
                          value={v.rates[key].baseOverride ?? ''}
                          onChange={(e) =>
                            setRate(
                              key,
                              'baseOverride',
                              e.target.value === '' ? null : e.target.valueAsNumber
                            )
                          }
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="calculator-note">
          单项覆盖值按已核定的最终基数填写，会覆盖公共基数及其上下限。工伤、生育保险个人比例为
          0；医保固定附加额另填。公积金支持双方各 0–12%。
        </p>
        <div className="salary-fields calculator-fields">
          <NumberField
            id="calc-medical-extra"
            label="医保个人固定附加额（元/月）"
            value={v.medicalExtra}
            onChange={(n) => number('medicalExtra', n)}
          />
          <NumberField
            id="calc-deductible"
            label="社保公积金可税前扣除额覆盖（元/月）"
            value={v.deductibleContributions}
            optional
            onChange={(n) => number('deductibleContributions', n)}
            hint="默认按个人实际缴费扣除；有超过当地税前扣除标准的部分时，填合法可扣除额，不能高于实际个人缴费。"
          />
        </div>
        <a href="#calculation-results">查看更新后的到手收入 ↑</a>
      </section>
      {r && v.annualBonus > 0 && (
        <section className="salary-query">
          <h2>同一笔年终奖，两种计税结果</h2>
          <p className="muted">
            以下为条件满足时的模型对比；单独计税在一个纳税年度只能使用一次，不一定更省税。
          </p>
          <div className="calculator-alternatives">
            <article data-selected={v.bonusMode === 'combined'}>
              <h3>并入综合所得</h3>
              <p>
                全年个税 <strong>{currency(r.combinedTax)}</strong>
              </p>
              <p>年净收入 {currency(r.combinedNet)}</p>
            </article>
            <article data-selected={v.bonusMode === 'separate'}>
              <h3>符合条件时单独计税</h3>
              <p>
                全年个税 <strong>{currency(r.separateTax)}</strong>
              </p>
              <p>年净收入 {currency(r.separateNet)}</p>
            </article>
          </div>
        </section>
      )}
      {r && (
        <section className="salary-query">
          <h2>全年逐月到手明细</h2>
          <p className="muted">
            累计预扣会让不同月份的个税不同。12 月包含额外固定薪资和年终奖，奖金个税独立列示。
          </p>
          <div
            className="salary-table-scroll calculator-table"
            tabIndex={0}
            role="region"
            aria-label="计算明细（可横向滚动）"
          >
            <table>
              <caption>{v.year} 年工资、个人缴费与预扣税估算</caption>
              <thead>
                <tr>
                  <th scope="col">月份</th>
                  <th scope="col">税前现金</th>
                  <th scope="col">个人社保</th>
                  <th scope="col">个人公积金</th>
                  <th scope="col">工资预扣税</th>
                  <th scope="col">奖金单独税</th>
                  <th scope="col">到手现金</th>
                </tr>
              </thead>
              <tbody>
                {r.months.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{m.month} 月</th>
                    <td>{currency(m.gross)}</td>
                    <td>{currency(m.social)}</td>
                    <td>{currency(m.housing)}</td>
                    <td>{currency(m.wageTax)}</td>
                    <td>{currency(m.bonusTax)}</td>
                    <td>{currency(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="salary-query calculator-policy">
        <h2>计算口径与政策查询</h2>
        <p>
          适用于中国内地居民个人的工资薪金估算，按 2019 年起适用的综合所得税率表、全年 60,000
          元减除费用及累计预扣法计算。本版本支持 2019–2027 年；全年一次性奖金政策按延续至 2027
          年底的规则建模。
        </p>
        <p>
          依据：《中华人民共和国个人所得税法》（2018 年修正）、国家税务总局公告 2018 年第 61
          号、财政部 税务总局公告 2023 年第 30 号。
          <a href="https://www.chinatax.gov.cn/" target="_blank" rel="noopener noreferrer">
            前往国家税务总局检索政策 ↗
          </a>
          ；
          <a href="https://www.mohrss.gov.cn/" target="_blank" rel="noopener noreferrer">
            人社部政策查询入口 ↗
          </a>
          。
        </p>
        <p>
          社保和公积金没有全国统一的缴费基数、费率。本页未自动同步城市标准，比例和上下限由你核实后输入。模型不处理中途入离职、多单位工资、非居民计税、实习劳务报酬、单位超限公积金转应税收入或年度汇算退补税；奖金也不会回算次年社保基数。计算结果为估算，实际以工资条和当地有效政策为准。
        </p>
      </section>
    </main>
  );
}
