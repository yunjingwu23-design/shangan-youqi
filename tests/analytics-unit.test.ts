import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyticsPage,
  analyticsRange,
  safeSearchKeyword,
  trafficSource,
  clientEventSchema,
} from '../lib/analytics/model';
test('analytics strips private route identifiers and never accepts a query string or admin page', () => {
  assert.equal(
    analyticsPage('/workspace/interviews/10000000-0000-4000-8000-000000000001/report'),
    '/workspace/interviews/:id/report'
  );
  assert.equal(analyticsPage('/jobs/10000000-0000-4000-8000-000000000001'), '/jobs/:id');
  assert.equal(analyticsPage('/admin/analytics'), null);
  assert.equal(analyticsPage('/resume?content=private'), null);
  assert.equal(analyticsPage('/api/profile'), null);
});
test('only explicit public vocabulary leaves a search page, and referrers collapse to categories', () => {
  for (const query of [
    'candidate@example.com',
    '13800138000',
    '我的私人简历',
    '产品 项目经历',
    'https://private.invalid/?token=secret',
  ])
    assert.equal(safeSearchKeyword(query), null);
  assert.equal(safeSearchKeyword(' 产品经理 '), '产品经理');
  assert.equal(safeSearchKeyword('CICC'), 'cicc');
  assert.equal(
    trafficSource('https://www.baidu.com/s?wd=private', 'https://site.example'),
    'baidu'
  );
  assert.equal(
    trafficSource('https://baidu.com.attacker.invalid/private', 'https://site.example'),
    'referral'
  );
  assert.equal(
    trafficSource('https://site.example/resume?id=private', 'https://site.example'),
    'internal'
  );
});
test('Beijing date filters include today, bound custom dates and reject invalid calendar dates', () => {
  const now = new Date('2026-11-01T17:00:00Z');
  assert.deepEqual(analyticsRange(new URLSearchParams('preset=today'), now), {
    from: '2026-11-02',
    to: '2026-11-02',
  });
  assert.deepEqual(analyticsRange(new URLSearchParams('preset=yesterday'), now), {
    from: '2026-11-01',
    to: '2026-11-01',
  });
  assert.deepEqual(analyticsRange(new URLSearchParams('preset=7d'), now), {
    from: '2026-10-27',
    to: '2026-11-02',
  });
  assert.deepEqual(analyticsRange(new URLSearchParams('preset=30d'), now), {
    from: '2026-10-04',
    to: '2026-11-02',
  });
  for (const query of [
    'preset=custom&from=2026-02-30&to=2026-11-02',
    'preset=custom&from=2026-01-01&to=2026-11-02',
    'preset=custom&from=2026-11-03&to=2026-11-03',
    'preset=custom&from=2026-11-02&to=2026-11-01',
  ])
    assert.throws(() => analyticsRange(new URLSearchParams(query), now));
});
test('event schema rejects content, raw personal searches, business event spoofing and unknown pages', () => {
  const base = { id: crypto.randomUUID(), type: 'page_view', page: '/resume' };
  assert.equal(clientEventSchema.safeParse(base).success, true);
  for (const value of [
    { ...base, content: 'private' },
    { ...base, page: '/admin' },
    { ...base, type: 'resume_save' },
    { ...base, type: 'search', page: '/search', keyword: 'private@example.com' },
    { ...base, type: 'application_link_click' },
  ])
    assert.equal(clientEventSchema.safeParse(value).success, false);
});
