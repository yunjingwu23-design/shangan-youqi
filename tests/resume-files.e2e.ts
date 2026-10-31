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
  await expect(page.getByTestId('resume-preview-state')).toContainText('预览已更新');
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector('.resume-file-editor > .site-card')?.scrollTo(0, 0);
    document.querySelector('.resume-file-lines')?.scrollTo(0, 0);
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
    const view = page.frameLocator('iframe[title="Word 原模板预览"]').locator('#docx');
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
test('Word: complete paragraph search, live latest preview, date positioning and formatting survive native export and reload', async ({
  page,
}) => {
  test.setTimeout(90000);
  const session = await login(page, 'word-layout');
  try {
    const source = await readFile('tests/fixtures/resume-format.docx'),
      parts = wordBlocks(source),
      body = parts.find((block) => block.text === '形成可复用的项目文档。')!,
      company = parts.find((block) => block.text === '某公司｜产品实习生')!,
      date = parts.find((block) => block.text === '2025.06–2025.09')!;
    await page.goto('/resume');
    await page
      .getByLabel('上传 PDF 或 Word 简历', { exact: true })
      .setInputFiles('tests/fixtures/resume-format.docx');
    await expect(page.getByRole('heading', { name: '原版简历编辑', exact: true })).toBeVisible();
    const view = page.frameLocator('iframe[title="Word 原模板预览"]').locator('#docx'),
      status = page.getByTestId('resume-preview-state'),
      search = page.getByLabel('搜索原件文字', { exact: true });
    await expect(status).toContainText('预览已更新');
    await page.locator('.resume-file-lines').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await search.fill('Original');
    await expect(page.locator('.resume-line-context p').first()).toBeInViewport();
    await search.fill('项目经历');
    await expect(page.locator('.resume-line-group')).toHaveCount(1);
    await expect(page.locator('.resume-line-context p')).toHaveText(
      '项目经历：负责产品需求整理，形成可复用的项目文档。'
    );
    await expect(page.locator('.resume-line-context p')).toBeInViewport();
    const input = page.getByRole('textbox', { name: body.label, exact: true });
    await expect(input).toBeVisible();
    await input.fill('自动预览第一版。');
    await expect(view.getByText('自动预览第一版。', { exact: true })).toBeVisible();
    await input.fill('快速修改第二版。');
    await input.fill('最终版本：基于真实经历整理项目文档。');
    await page.getByRole('button', { name: '更新预览', exact: true }).click();
    await expect(
      view.getByText('最终版本：基于真实经历整理项目文档。', { exact: true })
    ).toBeVisible();
    await expect(view.getByText('快速修改第二版。', { exact: true })).toHaveCount(0);
    await expect(status).toContainText('预览已更新');
    await search.fill('基于真实经历');
    await expect(page.locator('.resume-line-context p')).toContainText(
      '项目经历：负责产品需求整理，最终版本：'
    );
    await search.fill('某公司');
    await expect(page.getByRole('textbox', { name: date.label, exact: true })).toBeVisible();
    const initialDate = (await view.getByText(date.text, { exact: true }).boundingBox())!,
      initialCompany = (await view.getByText(company.text, { exact: true }).boundingBox())!;
    await page.locator('.resume-word-format > summary').click();
    await page.getByRole('button', { name: '日期左移 1 mm', exact: true }).click();
    await expect
      .poll(
        async () => (await view.getByText(date.text, { exact: true }).boundingBox())?.x || Infinity
      )
      .toBeLessThan(initialDate.x - 0.5);
    await expect(status).toContainText('预览已更新');
    const movedDate = (await view.getByText(date.text, { exact: true }).boundingBox())!,
      sameCompany = (await view.getByText(company.text, { exact: true }).boundingBox())!;
    expect(initialDate.x - movedDate.x).toBeLessThan(6);
    expect(Math.abs(initialCompany.x - sameCompany.x)).toBeLessThan(0.5);
    const dateBlock = page
      .locator('.resume-file-block')
      .filter({ has: page.getByRole('textbox', { name: date.label, exact: true }) });
    await dateBlock.locator('summary').click();
    await page.getByRole('spinbutton', { name: `${date.label} 字号`, exact: true }).fill('12');
    await page.getByRole('spinbutton', { name: `${date.label} 上移量`, exact: true }).fill('0.5');
    await expect(status).toContainText('预览已更新');
    await search.fill('2024.09');
    const rightAlignedDate = '2024.09–2025.01',
      beforeParagraph = (await view.getByText(rightAlignedDate, { exact: true }).boundingBox())!;
    await page.locator('.resume-word-format > summary').click();
    await page.getByRole('button', { name: '段落左移 1 mm', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await view.getByText(rightAlignedDate, { exact: true }).boundingBox())?.x || Infinity
      )
      .toBeLessThan(beforeParagraph.x - 0.5);
    await expect(status).toContainText('预览已更新');
    expect(
      beforeParagraph.x - (await view.getByText(rightAlignedDate, { exact: true }).boundingBox())!.x
    ).toBeLessThan(6);
    await page.getByRole('button', { name: '保存原版修改', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('原版简历的修改已保存');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出 Word', exact: true }).click(),
    ]);
    await download.saveAs('test-results/resume-word-layout-export.docx');
    const output = await readFile('test-results/resume-word-layout-export.docx'),
      exported = wordBlocks(output),
      changedDate = exported.find((block) => block.text === date.text)!;
    expect(changedDate.word!.fontSize).toBe(12);
    expect(changedDate.word!.baseline).toBe(0.5);
    expect(
      Math.abs(
        changedDate.word!.paragraph.rightTab! - (company.word!.paragraph.rightTab! - 72 / 25.4)
      )
    ).toBeLessThan(0.03);
    expect(
      exported.some((block) => block.text === '最终版本：基于真实经历整理项目文档。')
    ).toBeTruthy();
    const before = validateDocx(source),
      after = validateDocx(output);
    for (const part of Object.keys(before))
      if (part !== 'word/document.xml') expect(after[part]).toEqual(before[part]);
    await page.reload();
    await search.fill('某公司');
    await expect(page.getByRole('textbox', { name: date.label, exact: true })).toHaveValue(
      date.text
    );
    await page.locator('.resume-word-format > summary').click();
    await expect(page.getByLabel('日期 / 末尾制表位（mm）', { exact: true })).toHaveValue('119');
    const restoredBlock = page
      .locator('.resume-file-block')
      .filter({ has: page.getByRole('textbox', { name: date.label, exact: true }) });
    await restoredBlock.locator('summary').click();
    await expect(
      page.getByRole('spinbutton', { name: `${date.label} 字号`, exact: true })
    ).toHaveValue('12');
    await expect(
      page.getByRole('spinbutton', { name: `${date.label} 上移量`, exact: true })
    ).toHaveValue('0.5');
    await navigation(page);
    await capture(page, 'test-results/resume-word-layout-editor.png');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('navigation', { name: '移动端核心导航' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    ).toBeFalsy();
  } finally {
    await cleanup(session);
  }
});
