import { test, expect } from '@playwright/test';
import { admin, mailboxCode } from './helpers';
import { stat } from 'node:fs/promises';
test('site reconnect: home, guest jobs, contextual login, cloud resume, mock and review navigation', async ({
  page,
}) => {
  test.setTimeout(60000);
  const email = `site-browser-${Date.now()}@example.com`;
  try {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /下一份好机会/ })).toBeVisible();
    await page.screenshot({ path: 'test-results/site-home.png', fullPage: true });
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '岗位广场', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: '岗位广场', exact: true })).toBeVisible();
    await page.getByLabel('搜索公司或岗位').fill('CICC');
    await expect(page.getByRole('heading', { name: '投资银行实习（样品）' })).toBeVisible();
    await page.getByLabel('搜索方式').selectOption('exact');
    await expect(page.getByRole('heading', { name: '没有找到匹配岗位' })).toBeVisible();
    await page.getByLabel('搜索方式').selectOption('fuzzy');
    await page.getByRole('link', { name: '投资银行实习（样品）', exact: true }).click();
    await expect(page.getByText(/非实时招聘，不可用于实际投递/)).toBeVisible();
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '我的简历', exact: true })
      .click();
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel('邮箱地址').fill(email);
    await page.getByRole('button', { name: '获取邮箱验证码' }).click();
    await expect(page.getByRole('status')).toContainText('验证码已发送');
    await page.getByLabel('邮箱验证码').fill(await mailboxCode(email));
    await page.getByRole('button', { name: '验证并继续' }).click();
    await expect(page).toHaveURL('/resume');
    await page.getByLabel('姓名', { exact: true }).fill('整站测试求职者');
    await page.getByLabel('求职意向', { exact: true }).fill('产品经理');
    await page.getByLabel('项目经历内容').fill('我参与了真实项目需求梳理与验收标准确认。');
    await page.getByLabel('简历标题', { exact: true }).fill('接回后的简历版本');
    await page.getByRole('button', { name: '保存简历', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('简历已保存');
    await page.reload();
    await page.getByLabel('选择简历版本').selectOption({ label: '接回后的简历版本' });
    await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('整站测试求职者');
    await expect(page.getByLabel('项目经历内容')).toHaveValue(
      '我参与了真实项目需求梳理与验收标准确认。'
    );
    await page.pdf({ path: 'test-results/resume-export.pdf', format: 'A4', printBackground: true });
    expect((await stat('test-results/resume-export.pdf')).size).toBeGreaterThan(1000);
    await page.screenshot({ path: 'test-results/site-resume-editor.png', fullPage: true });
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '求职工作台', exact: true })
      .click();
    await expect(page).toHaveURL('/workspace');
    await page.getByRole('button', { name: /^简历草稿/ }).click();
    await page.getByRole('button', { name: '接回后的简历版本', exact: true }).click();
    await expect(page).toHaveURL(/\/resume\?id=/);
    await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('整站测试求职者');
    await page.getByRole('link', { name: '上岸有期首页', exact: true }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /下一份好机会/ })).toBeVisible();
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '模拟面试', exact: true })
      .click();
    await page.getByRole('button', { name: '开始文字模拟', exact: true }).click();
    await page
      .getByRole('textbox', { name: '我的回答', exact: true })
      .fill('我负责把需求拆解为可验证的验收标准。');
    await page.getByRole('button', { name: '保存本次练习', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('练习回答已保存');
    await page.reload();
    await page.getByRole('button', { name: /文字模拟 · 互联网/ }).click();
    await expect(page.getByRole('textbox', { name: '我的回答', exact: true })).toHaveValue(
      '我负责把需求拆解为可验证的验收标准。'
    );
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: 'AI 复盘', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: '面试复盘中心', exact: true })).toBeVisible();
    await page.getByLabel('复盘标题', { exact: true }).fill('接回后的手动复盘');
    await page.getByLabel('实际被问到的问题').fill('你在项目里负责什么？');
    await page.getByLabel('我当时的实际回答').fill('需求梳理与验收标准。');
    await page.getByRole('button', { name: '保存复盘笔记', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('复盘笔记已保存');
    await page.reload();
    await expect(
      page.getByRole('heading', { name: '接回后的手动复盘', exact: true })
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '面经中心', exact: true })
      .click();
    await page.getByRole('link', { name: /准备三个真实案例/ }).click();
    await expect(
      page.getByRole('heading', { name: '准备三个真实案例，比背十个万能答案更有用' })
    ).toBeVisible();
  } finally {
    const users = await admin.auth.admin.listUsers();
    const user = users.data.users.find((u) => u.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
  }
});
test('mobile site navigation and public modules remain reachable without login', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  ).toBeFalsy();
  await page.getByRole('button', { name: '打开导航' }).click();
  await page
    .getByRole('navigation', { name: '移动端主站导航' })
    .getByRole('link', { name: '岗位广场', exact: true })
    .click();
  await expect(page).toHaveURL('/jobs');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  ).toBeFalsy();
  await page.screenshot({ path: 'test-results/site-jobs-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '打开导航' }).click();
  await page
    .getByRole('navigation', { name: '移动端主站导航' })
    .getByRole('link', { name: '面经中心', exact: true })
    .click();
  await expect(page).toHaveURL('/interviews');
});
