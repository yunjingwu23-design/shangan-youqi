import test from 'node:test';
import assert from 'node:assert/strict';
import policyData from '../lib/salary/city-policy-data.json';
import {
  applyCityPolicy,
  findCityPolicy,
  validatePolicyCatalog,
  cityPolicySchema,
} from '../lib/salary/city-policies';
import { calculatePayroll, defaultPayrollInput } from '../lib/salary/calculator';
import { fixtureCityPolicy } from './fixtures/city-policy';

test('production catalog contains no fixture or unverified placeholder policy', () => {
  const policies = validatePolicyCatalog(policyData);
  for (const p of policies) {
    assert.ok(!p.id.startsWith('test-only'));
    assert.ok(!p.label.includes('测试'));
  }
});
test('city/month lookup covers the whole month and never falls back to another city or expired version', () => {
  const p = fixtureCityPolicy();
  assert.equal(findCityPolicy([p], 'shanghai', '2026-11')?.id, p.id);
  assert.equal(findCityPolicy([p], 'beijing', '2026-11'), null);
  assert.equal(findCityPolicy([p], 'shanghai', '2027-01'), null);
  assert.equal(findCityPolicy([{ ...p, validFrom: '2026-11-02' }], 'shanghai', '2026-11'), null);
  for (const month of ['2026-00', '2026-13', 'bad'])
    assert.equal(findCityPolicy([p], 'shanghai', month), null);
});
test('automatic fill preserves personal income and deductions and caps each insurance independently', () => {
  const input = defaultPayrollInput();
  input.annualBonus = 50000;
  input.additionalDeduction = 1000;
  const applied = applyCityPolicy(input, fixtureCityPolicy(), '2026-11');
  assert.equal(applied.annualBonus, 50000);
  assert.equal(applied.additionalDeduction, 1000);
  assert.equal(applied.city, '上海');
  let r = calculatePayroll({ ...applied, annualBonus: 0, additionalDeduction: 0 });
  assert.equal(r.effectiveSocialBase, 20000);
  assert.equal(r.contributions[1].base, 10000);
  assert.equal(r.effectiveHousingBase, 18000);
  assert.equal(r.monthlyPersonal, 3160);
  r = calculatePayroll({
    ...applied,
    monthlySalary: 10000,
    annualBonus: 0,
    additionalDeduction: 0,
  });
  assert.equal(r.monthlyPersonal, 1750);
  assert.equal(r.annualNet, 97620);
  assert.throws(() => applyCityPolicy(input, fixtureCityPolicy(), '2027-01'), /不覆盖/);
});
test('policy validation rejects wrong domains, homepages, credentials and malformed URLs', () => {
  for (const url of [
    'https://example.com/official.html',
    'https://rsj.sh.gov.cn/',
    'https://rsj.sh.gov.cn.evil.example/data',
    'https://user:pass@rsj.sh.gov.cn/policy',
    'http://rsj.sh.gov.cn/policy',
    'not a url',
  ]) {
    const p = fixtureCityPolicy();
    p.sources[0].url = url;
    assert.equal(cityPolicySchema.safeParse(p).success, false, url);
  }
});
test('policy metadata cannot have future verification, impossible ordering, duplicate or overlapping versions', () => {
  const p = fixtureCityPolicy();
  assert.equal(validatePolicyCatalog([p], '2026-11-05').length, 1);
  assert.throws(
    () => validatePolicyCatalog([{ ...p, verifiedOn: '2027-01-01' }], '2026-11-05'),
    /未来/
  );
  assert.throws(() => validatePolicyCatalog([p, p], '2026-11-05'), /重复/);
  assert.throws(
    () => validatePolicyCatalog([p, { ...p, id: 'different-test-id' }], '2026-11-05'),
    /重叠/
  );
  p.sources[0].publishedOn = '2026-02-01';
  assert.equal(cityPolicySchema.safeParse(p).success, false);
});
test('incomplete parameters and locked sample wages cannot be marked verified', () => {
  let p = fixtureCityPolicy();
  p.parameters.socialBase.minimum = null;
  assert.equal(cityPolicySchema.safeParse(p).success, false);
  p = fixtureCityPolicy();
  p.parameters.socialBase.mode = 'custom';
  assert.equal(cityPolicySchema.safeParse(p).success, false);
  p = fixtureCityPolicy();
  p.parameters.rates.pension.baseOverride = 20000;
  assert.equal(cityPolicySchema.safeParse(p).success, false);
  p = fixtureCityPolicy();
  p.parameters.rates.medical.bounds = { minimum: 11000, maximum: 10000 };
  assert.equal(cityPolicySchema.safeParse(p).success, false);
});
