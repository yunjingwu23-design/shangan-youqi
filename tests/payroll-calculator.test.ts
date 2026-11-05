import test from 'node:test';
import assert from 'node:assert/strict';
import {
  annualIncomeTax,
  annualBonusTax,
  calculatePayroll,
  defaultPayrollInput,
  insuranceKeys,
  payrollSchema,
} from '../lib/salary/calculator';
import { activeModuleLink, moduleForPath, pageLabel, siteLinks } from '../lib/navigation';

test('resident annual progressive tax uses all seven bracket boundaries and cent rounding', () => {
  for (const [income, tax] of [
    [0, 0],
    [36000, 1080],
    [36000.01, 1080],
    [144000, 11880],
    [300000, 43080],
    [420000, 73080],
    [660000, 145080],
    [960000, 250080],
    [1000000, 268080],
    [2000000, 718080],
  ])
    assert.equal(annualIncomeTax(income), tax, String(income));
  assert.equal(annualIncomeTax(16.67), 0.5);
  assert.throws(() => annualIncomeTax(-1));
});
test('annual one-time bonus selects its bracket from bonus/12 and keeps monthly quick deductions', () => {
  for (const [bonus, tax] of [
    [0, 0],
    [36000, 1080],
    [36000.01, 3390],
    [144000, 14190],
    [300000, 58590],
    [420000, 102340],
    [660000, 193590],
    [960000, 328840],
    [1000000, 434840],
  ])
    assert.equal(annualBonusTax(bonus), tax, String(bonus));
});
test('default illustrative payroll separates employee cost, employer cost and housing assets', () => {
  const r = calculatePayroll(defaultPayrollInput());
  assert.equal(r.monthlyPersonal, 3500);
  assert.equal(r.monthlyEmployer, 6580);
  assert.equal(r.annualTax, 11280);
  assert.equal(r.annualNet, 186720);
  assert.equal(r.averageMonthlyNet, 15560);
  assert.equal(r.annualEmployerCost, 318960);
  assert.equal(r.annualHousing, 33600);
  assert.equal(r.months[0].wageTax, 345);
  assert.equal(r.months[3].wageTax, 1045);
  assert.equal(r.months[11].wageTax, 1150);
  assert.equal(
    Math.round(r.months.reduce((sum, m) => sum + m.net, 0) * 100),
    Math.round(r.annualNet * 100)
  );
  assert.equal(r.annualNet, r.annualGross - r.annualPersonal - r.annualTax);
});
test('social and housing bases clamp independently; single insurance can use a verified override', () => {
  const v = defaultPayrollInput();
  v.socialBase.minimum = 6000;
  v.socialBase.maximum = 12000;
  v.housingBase.minimum = 7000;
  v.housingBase.maximum = 15000;
  let r = calculatePayroll(v);
  assert.equal(r.effectiveSocialBase, 12000);
  assert.equal(r.effectiveHousingBase, 15000);
  assert.equal(r.monthlyPersonal, 2310);
  assert.equal(r.annualTax, 13536);
  v.rates.pension.baseOverride = 8000;
  r = calculatePayroll(v);
  assert.equal(r.contributions[0].base, 8000);
  assert.equal(r.contributions[0].employee, 640);
  assert.equal(r.monthlyPersonal, 1990);
  v.socialBase.mode = 'custom';
  v.socialBase.value = 0;
  r = calculatePayroll(v);
  assert.equal(r.effectiveSocialBase, 6000);
});
test('each contribution rounds to cents and fixed medical fees do not alter employer contributions', () => {
  const v = defaultPayrollInput();
  v.monthlySalary = 12345.67;
  v.medicalExtra = 3;
  const r = calculatePayroll(v);
  assert.equal(r.contributions[0].employee, 987.65);
  assert.equal(r.contributions[2].employee, 61.73);
  assert.equal(r.contributions[3].employer, 49.38);
  const without = calculatePayroll({ ...v, medicalExtra: 0 });
  assert.equal(Math.round((r.monthlyPersonal - without.monthlyPersonal) * 100), 300);
  assert.equal(r.monthlyEmployer, without.monthlyEmployer);
});
test('merged maternity insurance prevents double charging and never adds a personal contribution', () => {
  const v = defaultPayrollInput();
  v.rates.maternity.employer = 1;
  assert.equal(payrollSchema.safeParse(v).success, false);
  v.maternityMerged = false;
  const r = calculatePayroll(v);
  assert.equal(r.monthlyEmployer, 6780);
  assert.equal(r.monthlyPersonal, 3500);
  assert.equal(r.contributions[4].employee, 0);
});
test('13th salary is regular December wage; only the eligible bonus receives separate taxation', () => {
  const v = defaultPayrollInput();
  v.salaryMonths = 13;
  v.annualBonus = 60000;
  const merged = calculatePayroll(v);
  assert.equal(merged.annualGross, 320000);
  assert.equal(merged.annualTax, 26680);
  assert.equal(merged.months[11].gross, 100000);
  const separate = calculatePayroll({ ...v, bonusMode: 'separate', bonusEligible: true });
  assert.equal(separate.annualTax, 20470);
  assert.equal(separate.annualNet, 257530);
  assert.equal(separate.months[11].bonusTax, 5790);
  assert.equal(separate.months[11].wageTax, 4550);
  assert.equal(separate.months[11].net, 86160);
  assert.equal(separate.combinedTax, merged.annualTax);
  assert.equal(
    Math.round(separate.months.reduce((sum, m) => sum + m.net, 0) * 100),
    Math.round(separate.annualNet * 100)
  );
});
test('separate bonus tax is not assumed cheaper for low-income employees', () => {
  const v = defaultPayrollInput();
  v.monthlySalary = 3000;
  v.annualBonus = 6000;
  for (const key of insuranceKeys) v.rates[key] = { employee: 0, employer: 0, baseOverride: null };
  const r = calculatePayroll(v);
  assert.equal(r.combinedTax, 0);
  assert.equal(r.separateTax, 180);
  assert.equal(r.combinedNet, 42000);
  assert.equal(r.separateNet, 41820);
});
test('additional deductions reduce tax only; the contribution override cannot exceed actual contributions', () => {
  const v = defaultPayrollInput();
  v.additionalDeduction = 3000;
  v.otherTaxDeduction = 1000;
  const r = calculatePayroll(v);
  assert.equal(r.annualTax, 6480);
  assert.equal(r.annualNet, 191520);
  assert.equal(r.monthlyPersonal, 3500);
  assert.equal(
    calculatePayroll({ ...defaultPayrollInput(), deductibleContributions: 3000 }).annualNet,
    186120
  );
  assert.throws(
    () => calculatePayroll({ ...defaultPayrollInput(), deductibleContributions: 3501 }),
    /不能超过/
  );
});
test('invalid years, amounts, caps and rates cannot produce plausible output', () => {
  const v = defaultPayrollInput();
  for (const patch of [
    { year: 2028 },
    { monthlySalary: NaN },
    { monthlySalary: -1 },
    { monthlySalary: 1.001 },
    { salaryMonths: 11 },
    { salaryMonths: 25 },
    { bonusMode: 'separate', annualBonus: 100, bonusEligible: false },
    { socialBase: { mode: 'salary', value: 0, minimum: 2000, maximum: 1000 } },
  ])
    assert.equal(payrollSchema.safeParse({ ...v, ...patch }).success, false);
  for (const [key, party, value] of [
    ['housing', 'employee', 13],
    ['housing', 'employer', 13],
    ['injury', 'employee', 1],
    ['medical', 'employee', 101],
    ['maternity', 'employee', 1],
  ] as const) {
    const input = defaultPayrollInput();
    input.rates[key][party] = value;
    assert.equal(payrollSchema.safeParse(input).success, false);
  }
});
test('calculator stays nested under salary in the original four navigation modules', () => {
  assert.equal(siteLinks.length, 4);
  assert.equal(moduleForPath('/jobs/salary/calculator'), 'jobs');
  assert.equal(activeModuleLink('/jobs/salary/calculator', new URLSearchParams()), '/jobs/salary');
  assert.equal(pageLabel('/jobs/salary/calculator'), '薪酬 / 社保计算器');
});
