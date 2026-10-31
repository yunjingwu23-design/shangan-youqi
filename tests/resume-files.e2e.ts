import { test, expect, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFile } from 'node:fs/promises';
import { admin, SessionClient, base, dbUrl, anonKey } from './helpers';
import { wordBlocks, validateDocx } from '../lib/resume-files/word';
async function login(page: Page, label: string) {
  const email = `resume-ui-${label}-${Date.now()}@example.com`,
    client = new SessionClient();
  const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  expect(generated.error).toBeNull();
  if (!generated.data?.properties || !generated.data.user)
    throw new Error('本地认证测试会话未准备好。');
  const auth = createServerClient(dbUrl, anonKey, {
    cookies: {
      getAll: () => [...client.cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const item of items) client.cookies.set(item.name, item.value);
      },
    },
  });
  expect(
    (
      await auth.auth.verifyOtp({
        type: 'email',
        token_hash: generated.data.properties.hashed_token,
      })
    ).error
  ).toBeNull();
  await page.context().addCookies(
    [...client.cookies].map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax' as const,
    }))
  );
  return { email, client, userId: generated.data.user.id };
}
async function cleanup(session: Awaited<ReturnType<typeof login>>) {
  await session.client.request('/api/account/data', 'DELETE', { confirmation: '删除个人数据' });
  await admin.auth.admin.deleteUser(session.userId);
}
async function navigation(page: Page) {
  await expect(
    page.getByRole('navigation', { name: '主站导航', exact: true }).getByRole('link')
  ).toHaveCount(4);
}
async function capture(page: Page, path: string) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector('.resume-file-editor > .site-card')?.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path, fullPage: true });
}
test('Word: private upload, original template preview, text editing, unchanged original, native export and explicit template copy', async ({
  page,
}) => {
  test.setTimeout(90000);
  const session = await login(page, 'word');
  try {
    await page.goto('/resume');
    await navigation(page);
    await page
      .getByLabel('上传 PDF 或 Word 简历', { exact: true })
      .setInputFiles('tests/fixtures/resume-original.docx');
    await expect(page.getByRole('heading', { name: '原版简历编辑', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '正文片段 1', exact: true })).toHaveValue(
      'Original Candidate'
    );
    const view = page.frameLocator('iframe[title="Word 原模板预览"]');
    await expect(view.getByText('Original Candidate', { exact: true })).toBeVisible();
    await expect(view.locator('table')).toHaveCount(1);
    await expect(view.locator('img')).toHaveCount(1);
    await expect
      .poll(() => view.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await expect(view.getByText('ORIGINAL CUSTOM TEMPLATE', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: '正文片段 1', exact: true }).fill('原模板里的新姓名');
    await page.getByRole('button', { name: '更新预览', exact: true }).click();
    await expect(view.getByText('原模板里的新姓名', { exact: true })).toBeVisible();
    await capture(page, 'test-results/resume-word-original-editor.png');
    const [originalDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: '下载原件', exact: true }).click(),
    ]);
    await originalDownload.saveAs('test-results/resume-original-download.docx');
    expect(await readFile('test-results/resume-original-download.docx')).toEqual(
      await readFile('tests/fixtures/resume-original.docx')
    );
    const [editedDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出 Word', exact: true }).click(),
    ]);
    await editedDownload.saveAs('test-results/resume-native-export.docx');
    const raw = await readFile('test-results/resume-native-export.docx');
    expect(wordBlocks(raw).some((block) => block.text === '原模板里的新姓名')).toBeTruthy();
    const before = validateDocx(await readFile('tests/fixtures/resume-original.docx')),
      after = validateDocx(raw);
    for (const part of Object.keys(before))
      if (part !== 'word/document.xml') expect(after[part]).toEqual(before[part]);
    await page.getByRole('button', { name: '保存原版修改', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('原版简历的修改已保存');
    const originalUrl = page.url();
    await page.reload();
    await expect(page.getByRole('textbox', { name: '正文片段 1', exact: true })).toHaveValue(
      '原模板里的新姓名'
    );
    await navigation(page);
    await page.getByLabel('转换为站内模板').selectOption('sidebar');
    await page.getByRole('button', { name: '另建模板副本 →', exact: true }).click();
    await expect(page.getByRole('heading', { name: '简历编辑工作室', exact: true })).toBeVisible();
    await expect(page.locator('.resume-preview.theme-sidebar')).toBeVisible();
    await page.getByLabel('姓名', { exact: true }).fill('模板副本姓名');
    await page.getByRole('button', { name: '保存简历', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('简历已保存');
    await page.pdf({
      path: 'test-results/resume-template-sidebar.pdf',
      format: 'A4',
      printBackground: true,
    });
    await expect(page.getByRole('group', { name: '简历模板' }).getByRole('button')).toHaveCount(3);
    await page.getByRole('button', { name: /紧凑履历/ }).click();
    await expect(page.locator('.resume-preview.theme-compact')).toBeVisible();
    await page.getByRole('button', { name: '保存简历', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('简历已保存');
    await page.goto(originalUrl);
    await expect(page.getByRole('heading', { name: '原版简历编辑', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '正文片段 1', exact: true })).toHaveValue(
      '原模板里的新姓名'
    );
  } finally {
    await cleanup(session);
  }
});
test('PDF: original page layout, real selectable-text replacement, save/reload and private source deletion', async ({
  page,
}) => {
  test.setTimeout(90000);
  const session = await login(page, 'pdf');
  try {
    await page.goto('/resume');
    await page
      .getByLabel('上传 PDF 或 Word 简历', { exact: true })
      .setInputFiles('tests/fixtures/resume-original.pdf');
    await expect(page.getByRole('heading', { name: '原版简历编辑', exact: true })).toBeVisible();
    const text = page.getByRole('textbox', { name: '第 1 页 · 文字片段 2', exact: true });
    await expect(text).toHaveValue('Original Candidate');
    const canvas = page.locator('canvas');
    await expect
      .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
      .toBeGreaterThan(500);
    const before = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
    await text.fill('PDF 原位置的新姓名');
    await page.getByRole('button', { name: '更新预览', exact: true }).click();
    await expect
      .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL()))
      .not.toBe(before);
    await capture(page, 'test-results/resume-pdf-original-editor.png');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出 PDF', exact: true }).click(),
    ]);
    await download.saveAs('test-results/resume-native-export.pdf');
    expect((await readFile('test-results/resume-native-export.pdf')).byteLength).toBeLessThan(
      100000
    );
    await page.getByRole('button', { name: '保存原版修改', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('原版简历的修改已保存');
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: '第 1 页 · 文字片段 2', exact: true })
    ).toHaveValue('PDF 原位置的新姓名');
    await navigation(page);
    await page.getByRole('button', { name: '下一页 PDF', exact: true }).click();
    await expect(
      page.getByRole('textbox', { name: '第 2 页 · 文字片段 1', exact: true })
    ).toHaveValue('Second page unchanged');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('navigation', { name: '移动端核心导航' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    ).toBeFalsy();
    await capture(page, 'test-results/resume-pdf-mobile.png');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '删除当前版本', exact: true }).click();
    await expect(page.getByRole('heading', { name: '简历编辑工作室', exact: true })).toBeVisible();
  } finally {
    await cleanup(session);
  }
});
