import test from 'node:test';
import assert from 'node:assert/strict';
import { compensation, salarySchema, salaryDefaults } from '../lib/salary/model';
import { assertLicensed, thirdPartyStatus } from '../lib/salary/adapters';
import { moduleForPath, moduleLinks, siteLinks } from '../lib/navigation';
test('compensation preserves unknown, zero, annual and daily units', () => {
  const v = {
    ...salaryDefaults,
    company: '示例',
    role: '开发',
    city: '上海',
    base_salary: 20000,
    salary_months: 14,
    bonus: 10000,
    stock: 0,
    subsidy: 6000,
  };
  assert.deepEqual(compensation(v), { fixed: 280000, total: 296000 });
  assert.equal(compensation({ ...v, stock: null }).total, null);
  assert.deepEqual(
    compensation({ ...v, basis: 'annual', base_salary: 240000, salary_months: 12 }),
    { fixed: 240000, total: 256000 }
  );
  assert.deepEqual(compensation({ ...v, basis: 'daily' }), { fixed: null, total: null });
  assert.equal(salarySchema.safeParse({ ...v, basis: 'daily', salary_months: 12 }).success, false);
  assert.equal(
    salarySchema.safeParse({
      ...v,
      basis: 'daily',
      salary_months: 12,
      bonus: null,
      stock: null,
      subsidy: null,
    }).success,
    true
  );
});
test('submission rejects identity fields, ownership injection and invalid amounts', () => {
  const v = {
    ...salaryDefaults,
    company: '真实公司',
    role: '研发',
    city: '上海',
    base_salary: 20000,
  };
  for (const patch of [
    { user_id: 'injected' },
    { state: 'approved' },
    { company: 'name@example.com' },
    { base_salary: -1 },
    { bonus: Infinity },
  ])
    assert.equal(salarySchema.safeParse({ ...v, ...patch }).success, false);
});
test('salary remains within the original four navigation modules', () => {
  assert.equal(siteLinks.length, 4);
  assert.equal(moduleForPath('/jobs/salary'), 'jobs');
  assert.equal(moduleForPath('/workspace/offers'), 'career');
  assert.ok(moduleLinks.jobs.some((l) => l.label === '查薪资'));
});
test('third party integration remains disabled and fails without valid agreement and docs', () => {
  assert.equal(thirdPartyStatus.offershow.enabled, false);
  assert.throws(() =>
    assertLicensed({
      id: 'test',
      authorization: { agreementId: '', documentationUrl: '', expiresAt: 'invalid' },
      query: async () => [],
    })
  );
});
