import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { base, mailboxCode } from './helpers';
import { adminFixture, removeAdminFixtures, type AdminFixture } from './admin-fixtures';

async function useSession(context: BrowserContext, actor: AdminFixture) {
  await context.addCookies(
    [...actor.client.cookies].map(([name, value]) => ({
      name,
      value,
      url: base,
      sameSite: 'Lax' as const,
    }))
  );
}
async function adminChrome(page: Page) {
  await expect(
    page.getByRole('navigation', { name: '后台导航', exact: true }).getByRole('link')
  ).toHaveText(['内容运营', '服务运营', '数据中心', '系统管理']);
  await expect(page.getByRole('img', { name: '上岸有期官方 Logo' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '后台功能导航', exact: true })).toBeVisible();
}

test('P0 browser: real email OTP admin login, private file draft, reviewer publication, public job and closing', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  const editor = await adminFixture('ui-editor', 'editor'),
    reviewer = await adminFixture('ui-reviewer', 'reviewer'),
    actors = [editor, reviewer],
    jobIds: string[] = [];
  const reviewContext = await browser.newContext(),
    visitorContext = await browser.newContext();
  try {
    await page.goto('/admin');
    await expect(page).toHaveURL(/login\?next=/);
    await page.getByLabel('邮箱地址').fill(editor.email);
    await page.getByRole('button', { name: '获取邮箱验证码', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('验证码已发送');
    await page.getByLabel('邮箱验证码').fill(await mailboxCode(editor.email));
    await page.getByRole('button', { name: /验证并/ }).click();
    await expect(page).toHaveURL('/admin');
    await adminChrome(page);
    await page.getByRole('link', { name: '手动导入 JD →', exact: true }).click();
    const title = '浏览器验收产品实习生 ' + Date.now();
    const raw =
      '本地测试招聘方招聘产品实习生，北京。整理产品需求；在校生。招聘方明确有留用可能，按业务考核决定。邮箱 ui-recruit@example.com。邮件主题：姓名-岗位，请附可到岗日期。';
    await page.getByLabel('手动上传 JD（TXT / DOCX / PDF）').setInputFiles({
      name: 'authorized-jd.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(raw),
    });
    await expect(page.getByRole('status')).toContainText('原件已私有保存');
    await expect(page.getByLabel('原始 JD / 校订文本', { exact: true })).toHaveValue(raw);
    await page.getByLabel('公司', { exact: true }).fill('浏览器本地验证公司');
    await page.getByLabel('岗位名称', { exact: true }).fill(title);
    await page
      .getByRole('combobox', { name: '招聘类型', exact: true })
      .selectOption('conversion_internship');
    await page.getByLabel('城市', { exact: true }).fill('北京');
    await page.getByLabel('岗位职责', { exact: true }).fill('整理产品需求');
    await page.getByLabel('任职要求', { exact: true }).fill('在校生');
    await page.getByLabel('JD 中明确留用可能的原文').fill('招聘方明确有留用可能，按业务考核决定。');
    await page.getByLabel('招聘来源 HTTPS 链接').fill('https://example.com/ui-jd');
    await page.getByLabel('本岗位投递邮箱（每行一个）').fill('ui-recruit@example.com');
    await page.getByLabel('邮件标题要求').fill('姓名-岗位');
    await page.getByLabel('本岗位投递说明', { exact: true }).fill('请附可到岗日期。');
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('岗位草稿已真实保存');
    const id = new URL(page.url()).pathname.split('/').at(-1)!;
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    jobIds.push(id);
    await page.reload();
    await expect(page.getByLabel('岗位名称', { exact: true })).toHaveValue(title);
    await adminChrome(page);
    expect((await visitorContext.request.get(base + '/jobs/' + id)).status()).toBe(404);
    await page.getByRole('button', { name: '提交审核', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('待审核');
    await expect(page.getByRole('button', { name: '审核通过', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('公司', { exact: true })).toBeDisabled();
    await page.screenshot({ path: 'test-results/admin-draft-desktop.png', fullPage: true });

    await useSession(reviewContext, reviewer);
    const review = await reviewContext.newPage();
    await review.goto('/admin/review');
    await review.getByRole('textbox', { name: '搜索后台岗位' }).fill(title);
    await review.getByRole('link', { name: title, exact: true }).click();
    await adminChrome(review);
    await expect(review.getByLabel('公司', { exact: true })).toBeDisabled();
    await review.getByText('修订 r1 · 私有原件', { exact: true }).click();
    await expect(review.getByRole('link', { name: '下载该版本原件', exact: true })).toBeVisible();
    const original = await review.request.get(
      (await review
        .getByRole('link', { name: '下载该版本原件', exact: true })
        .getAttribute('href'))!
    );
    expect(await original.body()).toEqual(Buffer.from(raw));
    await review
      .getByLabel('审核说明（至少 10 字）')
      .fill('已核对授权招聘原文、来源链接、邮箱和留用说明。');
    await review.getByLabel('我已核对原文、招聘来源、投递方式和留用依据。').check();
    await review.getByRole('button', { name: '审核通过', exact: true }).click();
    await expect(review.getByRole('status')).toContainText('已批准');
    await review.getByRole('button', { name: '发布岗位', exact: true }).click();
    await expect(review.getByRole('status')).toContainText('已发布');
    await review.screenshot({ path: 'test-results/admin-published-desktop.png', fullPage: true });

    const visitor = await visitorContext.newPage();
    await visitor.goto('/jobs');
    await visitor.getByRole('link', { name: title, exact: true }).click();
    await expect(visitor).toHaveURL('/jobs/' + id);
    await expect(visitor.getByText('ui-recruit@example.com', { exact: true })).toBeVisible();
    await expect(visitor.getByText('请附可到岗日期。', { exact: true })).toBeVisible();
    await expect(
      visitor.getByRole('navigation', { name: '主站导航', exact: true }).getByRole('link')
    ).toHaveCount(4);
    await expect(visitor.locator('a[href^="/admin"]')).toHaveCount(0);

    await review.setViewportSize({ width: 390, height: 844 });
    await review.goto('/admin/jobs');
    await review.getByRole('textbox', { name: '搜索后台岗位' }).fill(title);
    await expect(review.getByRole('link', { name: title, exact: true })).toBeVisible();
    await adminChrome(review);
    expect(
      await review.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
    ).toBe(true);
    expect(
      await review
        .locator('.admin-table-scroll')
        .evaluate((node) => node.scrollWidth > node.clientWidth)
    ).toBe(true);
    await review.screenshot({ path: 'test-results/admin-table-mobile.png', fullPage: true });
    await review.getByRole('link', { name: title, exact: true }).click();
    await review.getByRole('button', { name: '下架岗位', exact: true }).click();
    await expect(review.getByRole('status')).toContainText('已下架');
    expect((await visitorContext.request.get(base + '/jobs/' + id)).status()).toBe(404);
  } finally {
    await reviewContext.close();
    await visitorContext.close();
    await removeAdminFixtures(actors, jobIds);
  }
});

test('P0 browser: super-admin creates a bound invitation, invited user logs in and accepts, disabled membership stops access', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  page.setDefaultTimeout(10000);
  const root = await adminFixture('ui-root', 'super_admin'),
    invitee = await adminFixture('ui-invitee');
  const invitedContext = await browser.newContext();
  try {
    await useSession(page.context(), root);
    await page.goto('/admin/system');
    await adminChrome(page);
    await page.getByLabel('被邀请邮箱', { exact: true }).fill(invitee.email);
    await page.getByRole('combobox', { name: '邀请角色', exact: true }).selectOption('editor');
    await page.getByRole('button', { name: '创建邀请', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('邀请已创建');
    const url = await page
      .getByRole('textbox', { name: '一次性邀请链接', exact: true })
      .inputValue();
    const invited = await invitedContext.newPage();
    await invited.goto(url);
    await invited.getByRole('link', { name: '使用被邀请邮箱登录', exact: true }).click();
    await invited.getByLabel('邮箱地址').fill(invitee.email);
    await invited.getByRole('button', { name: '获取邮箱验证码', exact: true }).click();
    await expect(invited.getByRole('status')).toContainText('验证码已发送');
    await invited.getByLabel('邮箱验证码').fill(await mailboxCode(invitee.email));
    await invited.getByRole('button', { name: /验证并/ }).click();
    await expect(invited).toHaveURL(/\/admin\/accept\?token=/);
    await invited.getByRole('button', { name: '验证并领取邀请', exact: true }).click();
    await expect(invited).toHaveURL('/admin');
    await adminChrome(invited);
    await page.reload();
    await page.getByLabel(invitee.email + ' 启用', { exact: true }).uncheck();
    await page
      .getByLabel(invitee.email + ' 变更说明', { exact: true })
      .fill('本地端到端测试停用角色');
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('row')
      .filter({ has: page.getByRole('checkbox', { name: invitee.email + ' 启用', exact: true }) })
      .getByRole('button', { name: '保存权限', exact: true })
      .click();
    await expect
      .poll(async () => (await invited.request.get('/api/admin/jobs')).status())
      .toBe(403);
    await invited.reload();
    await expect(
      invited.getByText('当前账号没有运营权限。后台仅向已授权管理员开放。')
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: '后台功能导航' })
      .getByRole('link', { name: '操作日志', exact: true })
      .click();
    await expect(page.getByText('变更管理员权限', { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText('内容编辑 · 启用 → 内容编辑 · 停用', { exact: true }).first()
    ).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-audit-desktop.png', fullPage: true });
  } finally {
    await invitedContext.close();
    await removeAdminFixtures([root, invitee]);
  }
});
