import { z } from 'zod';

export const insuranceLabels = {
  pension: '养老保险',
  medical: '医疗保险',
  unemployment: '失业保险',
  injury: '工伤保险',
  maternity: '生育保险',
  housing: '住房公积金',
} as const;
export type InsuranceKey = keyof typeof insuranceLabels;
export const insuranceKeys = Object.keys(insuranceLabels) as InsuranceKey[];
const money = z.number().finite().min(0).max(1_000_000).multipleOf(0.01);
const percentage = z.number().finite().min(0).max(100).multipleOf(0.0001);
const base = z
  .object({
    mode: z.enum(['salary', 'custom']),
    value: money,
    minimum: money.nullable(),
    maximum: money.nullable(),
  })
  .strict();
const rate = z
  .object({
    employee: percentage,
    employer: percentage,
    baseOverride: money.nullable(),
    bounds: z.object({ minimum: money.nullable(), maximum: money.nullable() }).strict().optional(),
  })
  .strict();
export const payrollSchema = z
  .object({
    year: z.number().int().min(2019).max(2027),
    city: z.string().trim().max(40),
    monthlySalary: money,
    salaryMonths: z.number().min(12).max(24).multipleOf(0.01),
    annualBonus: money,
    bonusMode: z.enum(['combined', 'separate']),
    bonusEligible: z.boolean(),
    additionalDeduction: money,
    otherTaxDeduction: money,
    deductibleContributions: money.nullable(),
    socialBase: base,
    housingBase: base,
    medicalExtra: money,
    maternityMerged: z.boolean(),
    rates: z
      .object({
        pension: rate,
        medical: rate,
        unemployment: rate,
        injury: rate,
        maternity: rate,
        housing: rate,
      })
      .strict(),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const k of ['socialBase', 'housingBase'] as const) {
      if (v[k].minimum !== null && v[k].maximum !== null && v[k].minimum > v[k].maximum)
        ctx.addIssue({
          code: 'custom',
          path: [k],
          message: `${k === 'socialBase' ? '社保' : '公积金'}基数下限不能高于上限。`,
        });
    }
    for (const r of Object.values(v.rates)) {
      if (
        r.bounds?.minimum != null &&
        r.bounds?.maximum != null &&
        r.bounds.minimum > r.bounds.maximum
      )
        ctx.addIssue({ code: 'custom', message: '单项保险基数下限不能高于上限。' });
    }
    if (v.rates.injury.employee !== 0 || v.rates.maternity.employee !== 0)
      ctx.addIssue({ code: 'custom', message: '职工工伤、生育保险不设个人缴费。' });
    if (v.maternityMerged && v.rates.maternity.employer !== 0)
      ctx.addIssue({
        code: 'custom',
        message: '生育保险已并入医疗时，生育单位比例须为 0，避免重复计算。',
      });
    if (v.rates.housing.employee > 12 || v.rates.housing.employer > 12)
      ctx.addIssue({
        code: 'custom',
        message: '本模型支持双方公积金比例各为 0–12%，超比例情形不在本模型范围内。',
      });
    if (v.rates.housing.bounds !== undefined)
      ctx.addIssue({ code: 'custom', message: '公积金请使用独立基数上下限。' });
    if (v.rates.housing.baseOverride !== null)
      ctx.addIssue({ code: 'custom', message: '公积金请通过独立的公积金基数设置。' });
    if (v.bonusMode === 'separate' && v.annualBonus > 0 && !v.bonusEligible)
      ctx.addIssue({
        code: 'custom',
        message: '单独计税须确认符合全年一次性奖金条件，且本年度未使用过该方式。',
      });
  });
export type PayrollInput = z.infer<typeof payrollSchema>;

// Illustrative inputs only. These are NOT an official city contribution schedule.
export function defaultPayrollInput(): PayrollInput {
  return {
    year: 2026,
    city: '',
    monthlySalary: 20000,
    salaryMonths: 12,
    annualBonus: 0,
    bonusMode: 'combined',
    bonusEligible: false,
    additionalDeduction: 0,
    otherTaxDeduction: 0,
    deductibleContributions: null,
    socialBase: { mode: 'salary', value: 0, minimum: null, maximum: null },
    housingBase: { mode: 'salary', value: 0, minimum: null, maximum: null },
    medicalExtra: 0,
    maternityMerged: true,
    rates: {
      pension: { employee: 8, employer: 16, baseOverride: null },
      medical: { employee: 2, employer: 9, baseOverride: null },
      unemployment: { employee: 0.5, employer: 0.5, baseOverride: null },
      injury: { employee: 0, employer: 0.4, baseOverride: null },
      maternity: { employee: 0, employer: 0, baseOverride: null },
      housing: { employee: 7, employer: 7, baseOverride: null },
    },
  };
}
// Resident comprehensive-income brackets effective from 2019. Values in RMB.
const brackets = [
  [36000, 3, 0],
  [144000, 10, 2520],
  [300000, 20, 16920],
  [420000, 25, 31920],
  [660000, 30, 52920],
  [960000, 35, 85920],
  [Infinity, 45, 181920],
] as const;
const fen = (value: number) => Math.round(value * 100);
const yuan = (value: number) => value / 100;
const percentOf = (amountFen: number, percent: number) =>
  Math.floor((amountFen * Math.round(percent * 10000) + 500000) / 1000000);
function incomeTaxFen(taxableFen: number) {
  const [, rate, quick] = brackets.find(([upper]) => taxableFen <= upper * 100)!;
  return Math.max(0, percentOf(Math.max(0, taxableFen), rate) - fen(quick));
}
function bonusTaxFen(bonusFen: number) {
  // bonus/12 selects a monthly bracket; using annual thresholds avoids division rounding.
  const [, rate, quick] = brackets.find(([upper]) => bonusFen <= upper * 100)!;
  return Math.max(0, percentOf(bonusFen, rate) - fen(quick / 12));
}
export function annualIncomeTax(taxableIncome: number) {
  return yuan(
    incomeTaxFen(
      fen(z.number().finite().min(0).max(30_000_000).multipleOf(0.01).parse(taxableIncome))
    )
  );
}
export function annualBonusTax(bonus: number) {
  return yuan(bonusTaxFen(fen(money.parse(bonus))));
}
function effectiveBase(input: PayrollInput['socialBase'], salaryFen: number) {
  let result = input.mode === 'salary' ? salaryFen : fen(input.value);
  if (input.minimum !== null) result = Math.max(result, fen(input.minimum));
  if (input.maximum !== null) result = Math.min(result, fen(input.maximum));
  return result;
}
export function calculatePayroll(raw: unknown) {
  const v = payrollSchema.parse(raw),
    salary = fen(v.monthlySalary),
    bonus = fen(v.annualBonus);
  const socialBase = effectiveBase(v.socialBase, salary),
    housingBase = effectiveBase(v.housingBase, salary);
  const contributions = insuranceKeys.map((key) => {
    const r = v.rates[key],
      baseFen =
        key === 'housing'
          ? housingBase
          : r.baseOverride === null
            ? r.bounds
              ? effectiveBase({ ...v.socialBase, ...r.bounds }, salary)
              : socialBase
            : fen(r.baseOverride);
    return {
      key,
      label: insuranceLabels[key],
      base: baseFen,
      employee: percentOf(baseFen, r.employee) + (key === 'medical' ? fen(v.medicalExtra) : 0),
      employer: percentOf(baseFen, r.employer),
    };
  });
  const personal = contributions.reduce((s, r) => s + r.employee, 0),
    company = contributions.reduce((s, r) => s + r.employer, 0);
  const housing = contributions.find((r) => r.key === 'housing')!;
  const taxContributions =
    v.deductibleContributions === null ? personal : fen(v.deductibleContributions);
  if (taxContributions > personal)
    throw new Error('可税前扣除的社保公积金金额不能超过实际个人缴费。');
  const monthlyDeduction =
    500000 + taxContributions + fen(v.additionalDeduction) + fen(v.otherTaxDeduction);
  const extraFixed = Math.round(salary * (v.salaryMonths - 12));
  const grossAnnual = salary * 12 + extraFixed + bonus;
  const combinedTax = incomeTaxFen(Math.max(0, grossAnnual - monthlyDeduction * 12));
  const separateTax =
    incomeTaxFen(Math.max(0, grossAnnual - bonus - monthlyDeduction * 12)) + bonusTaxFen(bonus);
  let cumulativeGross = 0,
    withheld = 0;
  const months = Array.from({ length: 12 }, (_, i) => {
    const isLast = i === 11,
      wage =
        salary + (isLast ? extraFixed : 0) + (isLast && v.bonusMode === 'combined' ? bonus : 0);
    const bonusPaid = isLast && v.bonusMode === 'separate' ? bonus : 0;
    cumulativeGross += wage;
    const taxable = Math.max(0, cumulativeGross - monthlyDeduction * (i + 1));
    const due = incomeTaxFen(taxable),
      wageTax = Math.max(0, due - withheld);
    withheld += wageTax;
    const bonusTax = bonusPaid ? bonusTaxFen(bonusPaid) : 0;
    return {
      month: i + 1,
      gross: yuan(wage + bonusPaid),
      social: yuan(personal - housing.employee),
      housing: yuan(housing.employee),
      wageTax: yuan(wageTax),
      bonusTax: yuan(bonusTax),
      net: yuan(wage + bonusPaid - personal - wageTax - bonusTax),
      cumulativeTaxable: yuan(taxable),
    };
  });
  const annualTax = v.bonusMode === 'combined' ? combinedTax : separateTax,
    annualNet = grossAnnual - personal * 12 - annualTax;
  return {
    contributions: contributions.map((r) => ({
      ...r,
      base: yuan(r.base),
      employee: yuan(r.employee),
      employer: yuan(r.employer),
    })),
    months,
    annualGross: yuan(grossAnnual),
    annualTax: yuan(annualTax),
    annualNet: yuan(annualNet),
    averageMonthlyNet: yuan(Math.round(annualNet / 12)),
    monthlyPersonal: yuan(personal),
    monthlyEmployer: yuan(company),
    annualPersonal: yuan(personal * 12),
    annualEmployer: yuan(company * 12),
    annualEmployerCost: yuan(grossAnnual + company * 12),
    annualHousing: yuan((housing.employee + housing.employer) * 12),
    combinedTax: yuan(combinedTax),
    separateTax: yuan(separateTax),
    combinedNet: yuan(grossAnnual - personal * 12 - combinedTax),
    separateNet: yuan(grossAnnual - personal * 12 - separateTax),
    taxContributions: yuan(taxContributions),
    effectiveSocialBase: yuan(socialBase),
    effectiveHousingBase: yuan(housingBase),
    warnings: personal > salary ? ['个人月缴费超过月薪，请核对基数与比例；结果可能出现负数。'] : [],
  };
}
