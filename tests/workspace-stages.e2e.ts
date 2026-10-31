import { test, expect } from '@playwright/test';
import { base } from './helpers';
import { adminFixture, removeAdminFixtures } from './admin-fixtures';
import { applicationStatusValues, statusLabels } from '../lib/application-status';

test('workspace: all eleven stages save, reload and sync with unchanged notes; mobile and legacy records remain usable', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const owner = await adminFixture('stage-browser');
  const device = await browser.newContext();
  const cookies = [...owner.client.cookies].map(([name, value]) => ({
    name,
    value,
    url: base,
    sameSite: 'Lax' as const,
  }));
  try {
    await page.context().addCookies(cookies);
    await page.goto('/workspace');
    await page.getByRole('button', { name: '新增投递', exact: true }).click();
    const menu = page.getByRole('combobox', { name: '状态', exact: true });
    await expect(menu.locator('option')).toHaveText(
      applicationStatusValues.map((status) => statusLabels[status])
    );
    await page.getByLabel('标题', { exact: true }).fill('阶段浏览器验收');
    await page.getByLabel('备注', { exact: true }).fill('每次改状态后都应保留这段原备注。');
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    for (const status of applicationStatusValues) {
      await page.getByRole('button', { name: '编辑 阶段浏览器验收', exact: true }).click();
      await page.getByRole('combobox', { name: '状态', exact: true }).selectOption(status);
      await page.getByRole('button', { name: '保存记录', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.reload();
      await expect(
        page
          .getByRole('region', { name: '投递记录', exact: true })
          .getByText(statusLabels[status], { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText('每次改状态后都应保留这段原备注。', { exact: true })
      ).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/workspace-stages-desktop.png', fullPage: true });
    await device.addCookies(cookies);
    const restored = await device.newPage();
    await restored.goto('/workspace');
    await expect(
      restored
        .getByRole('region', { name: '投递记录', exact: true })
        .getByText('已 Offer', { exact: true })
    ).toBeVisible();
    const legacy = await owner.client.request('/api/entries', 'POST', {
      kind: 'application',
      title: '旧版面试记录',
      status: 'interview',
      content: '未确认轮次，保持原样',
    });
    expect(legacy.response.status).toBe(201);
    await page.reload();
    await page.getByRole('button', { name: '编辑 旧版面试记录', exact: true }).click();
    await expect(page.getByRole('combobox', { name: '状态', exact: true })).toHaveValue(
      'interview'
    );
    await page.getByLabel('公司（选填）').fill('仅修改公司');
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('面试中（未细分）', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '编辑 阶段浏览器验收', exact: true }).click();
    await page.getByRole('combobox', { name: '状态', exact: true }).selectOption('oral_oc');
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page
        .getByRole('region', { name: '投递记录', exact: true })
        .getByText('口头 OC', { exact: true })
    ).toBeInViewport();
    expect(await page.locator('.table-scroll').evaluate((node) => node.scrollLeft)).toBe(0);
    await expect(
      page.getByRole('navigation', { name: '移动端核心导航', exact: true }).getByRole('link')
    ).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    await page.screenshot({ path: 'test-results/workspace-stages-mobile.png', fullPage: true });
    await page.goto('/');
    await expect(page.getByRole('link').filter({ hasText: '阶段浏览器验收' })).toContainText(
      '口头 OC'
    );
  } finally {
    await device.close();
    await removeAdminFixtures([owner]);
  }
});
