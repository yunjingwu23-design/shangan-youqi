import { test, expect } from '@playwright/test';

test('public calculator: local-only estimates, employer split and invalid-input recovery', async ({
  page,
}) => {
  const posted: string[] = [];
  page.on('request', (r) => {
    if (
      r.method() === 'POST' &&
      /monthlySalary|salaryMonths|deductibleContributions/.test(r.postData() || '')
    )
      posted.push(r.url());
  });
  await page.goto('/jobs/salary');
  await page.getByRole('link', { name: '薪酬 / 社保计算器 ↗', exact: true }).click();
  await expect(page).toHaveURL(/\/jobs\/salary\/calculator$/);
  await expect(
    page.getByRole('navigation', { name: '主站导航', exact: true }).getByRole('link')
  ).toHaveCount(4);
  await expect(page.getByRole('link', { name: '查薪资', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByText('当前为演示缴费参数 · 未加载城市官方标准')).toBeVisible();
  await expect(page.getByRole('status', { name: '年净收入估算' })).toContainText('186,720.00');
  await page.getByLabel('缴费城市（备注）').fill('上海');
  await expect(page.getByRole('status', { name: '年净收入估算' })).toContainText('186,720.00');
  await page.getByLabel('养老保险单位比例（%）', { exact: true }).fill('0');
  await expect(page.getByRole('status', { name: '单位全年用工成本', exact: true })).toContainText(
    '280,560.00'
  );
  await expect(page.getByRole('status', { name: '年净收入估算' })).toContainText('186,720.00');
  await page.getByLabel('税前固定月薪（元）', { exact: true }).fill('-1');
  await expect(page.getByRole('alert').filter({ hasText: '请完整填写有效参数' })).toBeVisible();
  await expect(page.getByRole('status', { name: '年净收入估算' })).toHaveCount(0);
  await page.getByRole('button', { name: '恢复示例' }).click();
  await page.getByLabel('专项附加扣除（元/月）', { exact: true }).fill('3000');
  await expect(page.getByRole('status', { name: '年净收入估算' })).toContainText('190,320.00');
  expect(posted).toEqual([]);
  await page.screenshot({ path: 'test-results/payroll-calculator-desktop.png', fullPage: true });
});

test('calculator: eligible bonus comparison, cap validation and mobile scrolling', async ({
  page,
}) => {
  await page.goto('/jobs/salary/calculator');
  await page.getByLabel('固定薪资月数', { exact: true }).fill('13');
  await page.getByLabel('年终奖金（元）', { exact: true }).fill('60000');
  await expect(page.getByRole('status', { name: '全年个人所得税', exact: true })).toContainText(
    '26,680.00'
  );
  await page
    .getByRole('combobox', { name: '年终奖计税方式', exact: true })
    .selectOption('separate');
  await expect(page.getByRole('alert').filter({ hasText: '单独计税须确认' })).toBeVisible();
  await page.getByRole('checkbox', { name: /这笔奖金符合全年一次性奖金条件/ }).check();
  await expect(page.getByRole('status', { name: '全年个人所得税', exact: true })).toContainText(
    '20,470.00'
  );
  await expect(page.getByRole('status', { name: '年净收入估算' })).toContainText('257,530.00');
  await page.getByLabel('社保基数下限（元）', { exact: true }).fill('2000');
  await page.getByLabel('社保基数上限（元）', { exact: true }).fill('1000');
  await expect(page.getByRole('alert').filter({ hasText: '基数下限不能高于上限' })).toBeVisible();
  await page.getByLabel('社保基数上限（元）', { exact: true }).clear();
  await expect(page.getByRole('status', { name: '年净收入估算' })).toContainText('257,530.00');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBeFalsy();
  const table = page.locator('.calculator-table').first();
  expect(await table.evaluate((el) => el.scrollWidth > el.clientWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/payroll-calculator-mobile.png', fullPage: true });
});
