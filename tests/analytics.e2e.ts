import { test, expect, type BrowserContext } from '@playwright/test';
import { base, admin } from './helpers';
import { adminFixture, removeAdminFixtures, type AdminFixture } from './admin-fixtures';
import { emptyAdminDraft } from '../lib/admin/model';
import { beijingDate, dateShift } from '../lib/analytics/model';
// Exercise accepted human-browser traffic, separately from bot exclusion tests.
test.use({
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
});
async function session(context: BrowserContext, actor: AdminFixture) {
  await context.addCookies(
    [...actor.client.cookies].map(([name, value]) => ({
      name,
      value,
      url: base,
      sameSite: 'Lax' as const,
    }))
  );
}
test('analytics: real consent, page and action collection, dashboard filters, mobile and unauthorized access', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const root = await adminFixture('analytics-ui-root', 'super_admin'),
    user = await adminFixture('analytics-ui-user');
  const jobIds: string[] = [],
    control = await browser.newContext(),
    payloads: Record<string, unknown>[] = [];
  try {
    const jobInput = {
      ...emptyAdminDraft,
      company: '可追溯分析公司',
      title: '浏览器真实分析岗位 ' + Date.now(),
      type: 'daily_internship',
      city: '上海',
      responsibilities: '整理产品需求。',
      requirements: '在校生。',
      source_url: 'https://example.com/analytics/source',
      apply_url: 'https://example.com/analytics/apply',
      raw_jd: '授权本地招聘：上海产品实习生，整理产品需求，在校生。',
    };
    let result = await root.client.request('/api/admin/jobs', 'POST', { job: jobInput });
    expect(result.response.status).toBe(201);
    let job = result.data.job;
    jobIds.push(job.id);
    for (const action of ['submit', 'approve', 'publish']) {
      result = await root.client.request(`/api/admin/jobs/${job.id}/transition`, 'POST', {
        action,
        expectedVersion: job.version,
        reason: '已核验本地原文和投递方式，供真实分析测试。',
        sourceChecked: true,
      });
      expect(result.response.status).toBe(200);
      job = result.data.job;
    }
    await session(page.context(), user);
    await session(control, root);
    await page.context().route('https://example.com/analytics/apply', (route) =>
      route.fulfill({
        status: 200,
        body: 'Application destination fixture; no submission completed.',
      })
    );
    page.on('request', (request) => {
      if (request.url().endsWith('/api/analytics/events')) payloads.push(request.postDataJSON());
    });
    await page.goto('/jobs?type=daily_internship&private_query=DO-NOT-COLLECT');
    await page.getByRole('button', { name: '允许使用统计', exact: true }).click();
    await expect.poll(() => payloads.some((p) => p.type === 'page_view')).toBe(true);
    await page.getByRole('link', { name: job.title, exact: true }).click();
    await expect(page.getByRole('heading', { name: job.title })).toBeVisible();
    await page.getByRole('button', { name: '收藏岗位', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已保存到我的收藏');
    await page.getByRole('button', { name: '加入我的工作台', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('尚未投递');
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: '前往招聘方投递 ↗', exact: true }).click();
    const popup = await popupPromise;
    await popup.close();
    await expect.poll(() => payloads.some((p) => p.type === 'application_link_click')).toBe(true);
    expect(JSON.stringify(payloads)).not.toContain('DO-NOT-COLLECT');
    expect(JSON.stringify(payloads)).not.toContain(user.email);
    const dashboard = await control.newPage();
    await dashboard.setViewportSize({ width: 1440, height: 1100 });
    await dashboard.goto('/admin/analytics');
    await expect(
      dashboard.getByRole('heading', { name: '数据分析中心', exact: true })
    ).toBeVisible();
    await expect(dashboard.getByText('正在读取真实统计…')).toHaveCount(0);
    await dashboard.getByRole('button', { name: '今天', exact: true }).click();
    await expect
      .poll(async () => {
        const r = await root.client.request('/api/admin/analytics?preset=today');
        return r.data.jobs.some(
          (j: {
            id: string;
            views: number;
            saves: number;
            workspace_adds: number;
            application_clicks: number;
          }) =>
            j.id === job.id &&
            j.views >= 1 &&
            j.saves === 1 &&
            j.workspace_adds === 1 &&
            j.application_clicks >= 1
        );
      })
      .toBe(true);
    await dashboard.getByRole('button', { name: '刷新数据', exact: true }).click();
    await expect(dashboard.getByRole('link', { name: job.title, exact: true })).toBeVisible();
    const report = await root.client.request('/api/admin/analytics?preset=today');
    await expect(dashboard.locator('[data-metric=pv]')).toHaveText(
      new Intl.NumberFormat('zh-CN').format(report.data.totals.pv)
    );
    await expect(dashboard.getByRole('img', { name: '浏览量 PV趋势图' })).toBeVisible();
    await dashboard.getByRole('button', { name: '访客数 UV', exact: true }).click();
    await expect(dashboard.getByRole('img', { name: '访客数 UV趋势图' })).toBeVisible();
    await dashboard.screenshot({ path: 'test-results/analytics-dashboard-desktop.png' });
    await dashboard.getByRole('button', { name: '自定义', exact: true }).click();
    const today = beijingDate();
    await dashboard.getByLabel('开始日期', { exact: true }).fill(dateShift(today, -1));
    await dashboard.getByLabel('结束日期', { exact: true }).fill(today);
    await dashboard.getByRole('button', { name: '应用日期', exact: true }).click();
    await expect(
      dashboard.getByText(dateShift(today, -1) + ' — ' + today, { exact: true })
    ).toBeVisible();
    await dashboard.setViewportSize({ width: 390, height: 844 });
    await dashboard.screenshot({ path: 'test-results/analytics-dashboard-mobile.png' });
    expect(
      await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
    ).toBe(true);
    await page.goto('/admin/analytics');
    await expect(page.getByText('当前账号没有运营权限。后台仅向已授权管理员开放。')).toBeVisible();
    await expect(page.getByRole('heading', { name: '数据分析中心', exact: true })).toHaveCount(0);
    expect((await page.request.get(base + '/api/admin/analytics')).status()).toBe(403);
    const login = await admin
      .from('admin_audit_logs')
      .select('id')
      .eq('actor_id', root.userId)
      .eq('action', 'admin_login');
    expect(login.data?.length).toBe(1);
  } finally {
    await page.request.post(base + '/api/analytics/consent', {
      data: { choice: 'reject' },
      headers: { Origin: base },
    });
    await user.client.request('/api/account/data', 'DELETE', { confirmation: '删除个人数据' });
    await control.close();
    await removeAdminFixtures([root, user], jobIds);
  }
});
test('analytics: privacy signals keep collection off and rejection preserves site functionality', async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ 'Sec-GPC': '1' });
  await page.goto('/jobs');
  await page.getByRole('button', { name: '统计偏好', exact: true }).click();
  await expect(page.getByRole('button', { name: '允许使用统计', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: '找岗位', exact: true })).toBeVisible();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/analytics/consent') &&
        response.request().method() === 'POST' &&
        response.status() === 200
    ),
    page.getByRole('button', { name: '仅使用必要功能', exact: true }).click(),
  ]);
  const state = await page.request.get(base + '/api/analytics/consent');
  expect((await state.json()).choice).toBe('reject');
  const event = await page.request.post(base + '/api/analytics/events', {
    headers: { Origin: base },
    data: { id: crypto.randomUUID(), type: 'page_view', page: '/jobs' },
  });
  expect((await event.json()).accepted).toBe(false);
});
