import { test, expect } from '@playwright/test';
import { mailboxCode, admin } from './helpers';
const email = `browser-${Date.now()}@example.com`;
let userId: string | undefined;
test.afterAll(async () => {
  const users = await admin.auth.admin.listUsers();
  const user = users.data.users.find((u) => u.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
});
test('desktop: official logo, real OTP, persisted workspace, profile, restored session and logout', async ({
  page,
  browser,
}) => {
  await page.goto('/workspace');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('img', { name: '上岸有期官方 Logo' })).toBeVisible();
  await expect(page.getByRole('button', { name: '微信扫码登录，即将开放' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/login-desktop.png', fullPage: true });
  await page.getByLabel('邮箱地址').fill(email);
  await page.getByRole('button', { name: '获取邮箱验证码' }).click();
  await expect(page.getByRole('status')).toContainText('验证码已发送');
  const code = await mailboxCode(email);
  expect(code).toMatch(/^[0-9]{8}$/);
  const tokenInput = page.getByLabel('邮箱验证码');
  await tokenInput.fill(code);
  await expect(tokenInput).toHaveValue(code);
  expect(
    await tokenInput.evaluate((input: HTMLInputElement) => input.checkValidity())
  ).toBeTruthy();
  const verification = page.waitForRequest(
    (request) => request.url().endsWith('/api/auth/verify') && request.method() === 'POST'
  );
  await page.getByRole('button', { name: '验证并进入工作台' }).click();
  expect((await verification).postDataJSON().token).toBe(code);
  await expect(page).toHaveURL('/workspace');
  await expect(page.getByRole('heading', { name: '第一步，从一条记录开始' })).toBeVisible();
  const cookies = await page.context().cookies();
  const authCookies = cookies.filter((c) => c.name.includes('auth-token'));
  expect(authCookies.length).toBeGreaterThan(0);
  expect(authCookies.every((c) => c.httpOnly && c.sameSite === 'Lax')).toBeTruthy();
  await page.getByRole('button', { name: '新增投递', exact: true }).click();
  await page.getByLabel('标题', { exact: true }).fill('浏览器测试 · 产品经理');
  await page.getByLabel('公司（选填）').fill('上岸测试');
  await page.getByLabel('备注', { exact: true }).fill('真实数据库持久化记录');
  await page.getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '浏览器测试 · 产品经理', exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('真实数据库持久化记录', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '账号与资料', exact: true }).click();
  await page.getByLabel('昵称', { exact: true }).fill('认真准备的小岸');
  await page.getByRole('button', { name: '保存个人资料' }).click();
  await expect(page.getByRole('status')).toContainText('个人资料已保存');
  userId = (await page.locator('.identity-id code').textContent()) || undefined;
  // New browser context emulates reopening a browser with persisted cookies.
  const state = await page.context().storageState();
  const other = await browser.newContext({ storageState: state });
  const restored = await other.newPage();
  await restored.goto('/workspace');
  await expect(
    restored.getByRole('heading', { name: '认真准备的小岸，今天也向前一步。' })
  ).toBeVisible();
  await expect(
    restored.getByRole('button', { name: '浏览器测试 · 产品经理', exact: true })
  ).toBeVisible();
  await restored
    .getByRole('navigation', { name: '我的求职模块导航' })
    .getByRole('link', { name: '收藏岗位', exact: true })
    .click();
  await expect(restored.getByRole('heading', { name: '收藏岗位', exact: true })).toBeVisible();
  await restored
    .getByRole('navigation', { name: '我的求职模块导航' })
    .getByRole('link', { name: '求职工作台', exact: true })
    .click();
  await restored.getByRole('button', { name: '编辑 浏览器测试 · 产品经理' }).click();
  await restored.getByRole('combobox', { name: '状态', exact: true }).selectOption('interview');
  await restored.getByRole('button', { name: '保存记录', exact: true }).click();
  await expect(
    restored
      .getByRole('region', { name: '投递记录', exact: true })
      .getByText('面试中', { exact: true })
  ).toBeVisible();
  await restored.screenshot({ path: 'test-results/workspace-desktop.png', fullPage: true });
  await restored.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(restored).toHaveURL('/login');
  await restored.goto('/workspace');
  await expect(restored).toHaveURL(/\/login/);
  await other.close();
});
test('mobile: accessible login layout with no horizontal overflow or fake QR', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '下一站，从这里开始' })).toBeVisible();
  await expect(page.getByRole('button', { name: '微信扫码登录，即将开放' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(overflow).toBeFalsy();
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
});
