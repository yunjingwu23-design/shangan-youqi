import { test, expect } from '@playwright/test';
import { adminFixture } from './admin-fixtures';
import { admin } from './helpers';
test('salary: public empty state, private comparison CRUD, submission and mobile layout', async ({
  page,
}) => {
  const f = await adminFixture('salary-browser');
  try {
    await page.goto('/jobs/salary');
    await expect(
      page.getByRole('navigation', { name: '主站导航', exact: true }).getByRole('link')
    ).toHaveCount(4);
    await expect(page.getByRole('heading', { name: '查薪资', exact: true })).toBeVisible();
    await page.getByLabel('公司', { exact: true }).fill('不存在的浏览器查询公司');
    await page.getByRole('button', { name: '查询薪资', exact: true }).click();
    await expect(page.getByRole('heading', { name: '还没有满足条件的公开样本' })).toBeVisible();
    await expect(page.getByText('OfferShow 查询指引')).toBeVisible();
    await page.context().addCookies(
      [...f.client.cookies].map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
      }))
    );
    await page.goto('/workspace/offers');
    await page.getByRole('button', { name: '添加 Offer', exact: true }).click();
    const form = page.locator('.salary-editor');
    await form.getByLabel('公司', { exact: true }).fill('本地浏览器测试公司');
    await form.getByLabel('岗位', { exact: true }).fill('产品经理');
    await form.getByLabel('工作城市').fill('上海');
    await form.getByLabel('税前月薪（元）', { exact: true }).fill('20000');
    await form.getByLabel('年度奖金（元）', { exact: true }).fill('0');
    await form.getByLabel('年度归属股票估值（元）').fill('0');
    await form.getByLabel('年度补贴（元）').fill('6000');
    await form.getByRole('button', { name: '保存到个人对比表' }).click();
    await expect(page.locator('.salary-own-card')).toHaveCount(1);
    await page.getByRole('button', { name: '添加 Offer', exact: true }).click();
    await page.getByLabel('公司', { exact: true }).fill('第二家测试公司');
    await page.getByLabel('岗位', { exact: true }).fill('研发实习');
    await page.getByLabel('工作城市').fill('北京');
    await page.getByRole('combobox', { name: '薪资口径', exact: true }).selectOption('daily');
    await page.getByLabel('实习税前日薪（元）').fill('300');
    await page.getByRole('button', { name: '保存到个人对比表' }).click();
    await expect(page.locator('.salary-own-card')).toHaveCount(2);
    await page.getByLabel('加入对比').nth(0).check();
    await page.getByLabel('加入对比').nth(1).check();

    await expect(page.getByRole('table')).toContainText('246,000 元');
    await page
      .locator('.salary-own-card')
      .filter({ hasText: '本地浏览器测试公司' })
      .getByRole('button', { name: '修改' })
      .click();
    await page.getByLabel('工作城市').fill('深圳');
    await page.getByRole('button', { name: '保存到个人对比表' }).click();
    await expect(page.getByRole('table')).toContainText('深圳');
    await page.reload();
    await expect(
      page.locator('.salary-own-card').filter({ hasText: '本地浏览器测试公司' })
    ).toContainText('深圳');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    ).toBeFalsy();
    await page.goto('/jobs/salary');
    await page.getByRole('button', { name: '匿名分享 Offer', exact: true }).click();
    await page.getByLabel('公司', { exact: true }).last().fill('浏览器投稿公司');
    await page.getByLabel('岗位', { exact: true }).last().fill('工程师');
    await page.getByLabel('工作城市').fill('北京');
    await page.getByLabel('税前月薪（元）', { exact: true }).fill('18000');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: '提交审核', exact: true }).click();
    await expect(page.locator('.salary-own-card')).toContainText('待审核');
    await page.screenshot({ path: 'test-results/salary-mobile.png', fullPage: true });
    page.once('dialog', (d) => d.accept());
    await page
      .locator('.salary-own-card')
      .getByRole('button', { name: '删除', exact: true })
      .click();
    await expect(page.locator('.salary-own-card')).toHaveCount(0);
  } finally {
    await admin.auth.admin.deleteUser(f.authId);
  }
});

test('salary admin: canonical company and privacy review UI', async ({ page }) => {
  const reviewer = await adminFixture('salary-ui-reviewer', 'reviewer');
  const owner = await adminFixture('salary-ui-owner');
  const name = '后台薪资验收' + Math.random().toString(36).slice(2, 7).replace(/[0-9]/g, '字');
  try {
    const { salaryDefaults } = await import('../lib/salary/model');
    const r = await owner.client.request('/api/salary/reports', 'POST', {
      ...salaryDefaults,
      company: name,
      role: '测试研发',
      city: '北京',
      base_salary: 21000,
    });
    expect(r.response.status).toBe(201);
    await page.context().addCookies(
      [...reviewer.client.cookies].map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
      }))
    );
    await page.goto('/admin/salary');
    const company = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: '标准公司', exact: true }) });
    await company.getByLabel('公司名称').fill(name);
    await company.getByRole('button', { name: '保存公司' }).click();
    await expect(page.getByRole('status')).toContainText('已保存');
    await page
      .locator('.salary-own-card')
      .filter({ hasText: name })
      .getByRole('button', { name: '审核 / 隐藏' })
      .click();
    const editor = page.locator('.salary-editor');
    await editor.getByRole('combobox', { name: '公开标准公司' }).selectOption({ label: name });
    await editor.getByRole('checkbox').last().check();
    await editor
      .getByLabel('审核说明（10–500 字，用户可见）')
      .fill('已核对公开公司岗位和城市，未公开身份线索，真实性仅为用户自述。');
    await editor.getByRole('button', { name: '通过', exact: true }).click();
    await expect(page.locator('.salary-editor')).toHaveCount(0);
    const own = await owner.client.request('/api/salary/reports');
    expect(own.data.reports[0].state).toBe('approved');
    await page.getByRole('combobox', { name: '筛选状态' }).selectOption('approved');
    await expect(page.locator('.salary-own-card').filter({ hasText: name })).toContainText(
      '审核通过'
    );
  } finally {
    await admin.auth.admin.deleteUser(owner.authId);
    await admin.auth.admin.deleteUser(reviewer.authId);
    await admin.from('salary_companies').delete().eq('name', name);
  }
});
