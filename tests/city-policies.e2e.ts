import { test, expect } from '@playwright/test';
import { fixtureCityPolicy } from './fixtures/city-policy';

test('city auto-fill uses a verified response and recalculates each base as salary changes', async ({
  page,
}) => {
  await page.route('**/api/salary/policies', (route) =>
    route.fulfill({
      json: {
        policies: [fixtureCityPolicy()],
        status: 'ready',
        message: '测试专用响应，非真实政策。',
      },
    })
  );
  await page.goto('/jobs/salary/calculator');
  await page.getByLabel('政策月份', { exact: true }).fill('2026-11');
  await page.getByRole('combobox', { name: '缴费城市', exact: true }).selectOption('shanghai');
  await expect(page.getByText('已自动填写城市政策', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('status', { name: '个人每月社保及公积金', exact: true })
  ).toContainText('3,160.00');
  await expect(page.getByRole('heading', { name: '本次自动填写依据' })).toBeVisible();
  await page.getByLabel('税前固定月薪（元）', { exact: true }).fill('-1');
  await expect(page.getByRole('alert').filter({ hasText: '请完整填写有效参数' })).toBeVisible();
  await page.getByLabel('税前固定月薪（元）', { exact: true }).fill('10000');
  await expect(page.getByRole('status', { name: '年净收入估算' })).toContainText('97,620.00');
  await page.getByRole('combobox', { name: '缴费城市', exact: true }).selectOption('beijing');
  await expect(
    page.getByRole('status').filter({ hasText: '北京 2026-11 官方参数尚未核验' })
  ).toBeVisible();
  await expect(page.getByRole('status', { name: '年净收入估算' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '本次自动填写依据' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBeFalsy();
});
test('no verified data means no invented city estimate; stale policy is never used for a different month', async ({
  page,
}) => {
  await page.route('**/api/salary/policies', (route) =>
    route.fulfill({
      json: { policies: [fixtureCityPolicy()], status: 'ready', message: '测试专用响应。' },
    })
  );
  await page.goto('/jobs/salary/calculator');
  await page.getByLabel('政策月份', { exact: true }).fill('2027-01');
  await page.getByRole('combobox', { name: '缴费城市', exact: true }).selectOption('shanghai');
  await expect(page.getByRole('status').filter({ hasText: '官方参数尚未核验' })).toBeVisible();
  await expect(page.getByRole('status', { name: '年净收入估算' })).toHaveCount(0);
  await page.getByLabel('政策月份', { exact: true }).fill('2026-11');
  await expect(
    page.getByRole('status', { name: '个人每月社保及公积金', exact: true })
  ).toContainText('3,160.00');
});
