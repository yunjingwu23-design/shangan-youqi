import { test, expect, request as apiRequest } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import path from "node:path";
test.setTimeout(120000);
async function upload(page: import("@playwright/test").Page, file: string) {
  await page
    .getByRole("button", { name: /导入简历|上传我的简历/ })
    .first()
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByLabel("选择简历文件", { exact: true })
    .setInputFiles(path.resolve("tests/fixtures/resume", file));
  await expect(page.getByLabel("简历姓名", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "导出 PDF", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
}
test("DOCX → 校对编辑 → 同源实时预览 → 版本保存 → 真正文字型 PDF", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/resume");
  await upload(page, "standard.docx");
  await expect(page.getByLabel("简历姓名", { exact: true })).toHaveValue(
    "林同学",
  );
  await expect(page.getByLabel("模块内容1", { exact: true })).toHaveValue(
    /示例大学/,
  );
  await page.getByLabel("简历姓名", { exact: true }).fill("陈测试");
  await page.getByLabel("简历版本名称", { exact: true }).fill("研究岗定制版本");
  await page.getByLabel("模块日期1", { exact: true }).fill("2023.09 – 2027.06");
  await page.getByLabel("简历字体", { exact: true }).selectOption("serif");
  await page.getByLabel("简历字号", { exact: true }).fill("11");
  await page.getByLabel("简历行距", { exact: true }).fill("1.6");
  await expect(
    page
      .frameLocator('iframe[title="简历 A4 分页实时预览"]')
      .locator("h1")
      .first(),
  ).toHaveText("陈测试", { timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "导出 PDF", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("研究岗定制版本.pdf");
  const exported = await readFile((await download.path())!);
  const pdf = await getDocumentProxy(new Uint8Array(exported));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  expect(text.replace(/\s/g, "")).toContain("陈测试");
  expect(text.replace(/\s/g, "")).toContain("示例大学");
  expect(totalPages).toBeGreaterThan(0);
  const first = await pdf.getPage(1);
  expect(first.view[2]).toBeCloseTo(595, 0);
  await pdf.loadingTask.destroy();
  await page.getByRole("button", { name: "复制版本", exact: true }).click();
  await expect(page.getByLabel("切换简历版本", { exact: true })).toHaveValue(
    await page.getByLabel("切换简历版本", { exact: true }).inputValue(),
  );
  await page.getByLabel("简历版本名称", { exact: true }).fill("备份版本");
  await expect(
    page.getByText("已私密保存到此浏览器", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("简历姓名", { exact: true })).toHaveValue(
    "陈测试",
  );
  expect(
    await page
      .getByLabel("切换简历版本", { exact: true })
      .locator("option")
      .count(),
  ).toBe(2);
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "确认删除简历", exact: true }).click();
  await expect(
    page.getByLabel("切换简历版本", { exact: true }).locator("option"),
  ).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("长 DOCX 多页预览/导出，最后一段未丢失", async ({ page }) => {
  await page.goto("/resume");
  await upload(page, "long.docx");
  await expect(page.locator(".resume-layout-status")).not.toContainText(
    "1 页 A4",
  );
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PDF", exact: true }).click();
  const file = await (await d).path();
  const { text, totalPages } = await extractText(
    new Uint8Array(await readFile(file!)),
    { mergePages: true },
  );
  expect(totalPages).toBeGreaterThan(1);
  expect(text.replace(/\s/g, "")).toContain("项目记录65");
});
test("文字 PDF 可编辑；扫描件拒绝；移动端无页面溢出", async ({ page }) => {
  await page.goto("/resume");
  await upload(page, "two-column.pdf");
  await expect(page.getByLabel("简历姓名", { exact: true })).toHaveValue(
    "林同学",
  );
  await expect(page.locator(".resume-template-warning")).toContainText("PDF");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "导入简历", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByLabel("选择简历文件", { exact: true })
    .setInputFiles(path.resolve("tests/fixtures/resume/scanned.pdf"));
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    /扫描|OCR/,
    { timeout: 30000 },
  );
});
test("临时处理接口验证会话、来源和跨会话 CSRF，响应不缓存", async ({
  request,
}) => {
  const origin = "http://127.0.0.1:3000";
  const noSession = await request.post("/api/resume/export", {
    headers: { Origin: origin },
    data: {},
  });
  expect(noSession.status()).toBe(401);
  const session = await request.get("/api/resume/session");
  const { csrf } = await session.json();
  const cross = await request.post("/api/resume/import", {
    headers: { Origin: "https://other.example", "x-resume-csrf": csrf },
    data: {},
  });
  expect(cross.status()).toBe(403);
  const other = await apiRequest.newContext({ baseURL: origin });
  try {
    await other.get("/api/resume/session");
    const mismatch = await other.post("/api/resume/export", {
      headers: { Origin: origin, "x-resume-csrf": csrf },
      data: {},
    });
    expect(mismatch.status()).toBe(401);
    expect(mismatch.headers()["cache-control"]).toContain("no-store");
  } finally {
    await other.dispose();
  }
  const disabled = await request.post("/api/resume/optimize", {
    headers: { Origin: origin, "x-resume-csrf": csrf },
    data: {},
  });
  expect(disabled.status()).toBe(503);
});

test("长段落自动跨页保留尾部文字；超出20页时明确阻止导出", async ({ page }) => {
  await page.goto("/resume");
  await page.getByRole("button", { name: "从空白开始", exact: true }).click();
  await page.getByLabel("简历姓名", { exact: true }).fill("分页验证");
  const text =
    "长段落分页测试，所有文字都应该保留。".repeat(300) + "最后唯一标记END";
  await page.getByLabel("模块内容1", { exact: true }).fill(text);
  await expect(
    page.getByRole("button", { name: "导出 PDF", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await expect(page.locator(".resume-layout-status")).toContainText("跨页");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PDF", exact: true }).click();
  const downloaded = await pending;
  const result = await extractText(
    new Uint8Array(await readFile((await downloaded.path())!)),
    { mergePages: true },
  );
  expect(result.text.replace(/\s/g, "")).toContain("最后唯一标记END");
  await page.getByLabel("简历字号", { exact: true }).fill("15");
  await page.getByLabel("简历行距", { exact: true }).fill("2");
  await page.getByLabel("简历页边距", { exact: true }).fill("26");
  await page
    .getByLabel("模块内容1", { exact: true })
    .fill("连续内容".repeat(4500));
  for (let i = 0; i < 2; i++) {
    await page
      .getByLabel("新增简历模块", { exact: true })
      .selectOption("other");
    await page
      .getByLabel(`模块内容${i + 2}`, { exact: true })
      .fill("连续内容".repeat(4500));
  }
  await expect(page.locator(".resume-layout-status")).toContainText("溢出", {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "导出 PDF", exact: true }),
  ).toBeDisabled();
});
