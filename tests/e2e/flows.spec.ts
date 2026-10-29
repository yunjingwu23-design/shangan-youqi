import { test, expect } from "@playwright/test";
test("分类、搜索模式、详情与加入工作台", async ({ page }) => {
  await page.goto("/jobs");
  for (const category of ["日常实习", "转正实习", "秋招", "春招"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await expect(page.locator(".job-card")).toHaveCount(
      category === "日常实习" ? 3 : category === "春招" ? 1 : 2,
    );
    await expect(
      page.locator(".job-card .tag").filter({ hasText: category }).first(),
    ).toBeVisible();
  }
  await page.goto("/search?q=CICC");
  await expect(page.locator(".job-card")).toHaveCount(1);
  await page.getByRole("button", { name: "精准搜索", exact: true }).click();
  await expect(page.getByText("没有找到匹配结果")).toBeVisible();
  await page.goto("/jobs/tencent-finance");
  await expect(
    page.getByText("有留用可能（以招聘方实际考核及安排为准）", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".application-box")).toContainText(
    "finance-demo@example.com",
  );
  await page
    .getByRole("button", { name: "加入我的工作台", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "已加入工作台", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已加入工作台", exact: true }),
  ).toBeVisible();
});
test("横向表格增删改、状态颜色、主题与刷新保存", async ({ page }) => {
  await page.goto("/workspace");
  await expect(
    page.getByText("已保存到此浏览器", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新增记录", exact: true }).click();
  await page
    .getByRole("textbox", { name: "第4行公司", exact: true })
    .fill("测试公司");
  await page
    .getByRole("textbox", { name: "第4行岗位名称", exact: true })
    .fill("测试分析师");
  await page.getByLabel("测试公司当前状态", { exact: true }).selectOption("s1");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "第4行公司", exact: true }),
  ).toHaveValue("测试公司");
  await page.getByRole("button", { name: "管理状态", exact: true }).click();
  await page.getByLabel("新状态名称", { exact: true }).fill("等待加面");
  await page.getByRole("button", { name: "添加状态", exact: true }).click();
  await page.getByLabel("等待加面颜色", { exact: true }).fill("#123456");
  await page.getByLabel("关闭弹窗", { exact: true }).click();
  await page
    .getByLabel("测试公司当前状态", { exact: true })
    .selectOption({ label: "等待加面" });
  await expect(page.getByLabel("测试公司当前状态", { exact: true })).toHaveCSS(
    "color",
    "rgb(18, 52, 86)",
  );
  await page.getByRole("button", { name: "个性化工作台", exact: true }).click();
  await page.getByLabel("主题颜色", { exact: true }).fill("#345678");
  await page.getByLabel("关闭弹窗", { exact: true }).click();
  await page.getByLabel("工作台名称", { exact: true }).fill("我的测试计划");
  await page.reload();
  await expect(page.getByLabel("工作台名称", { exact: true })).toHaveValue(
    "我的测试计划",
  );
  await expect(page.getByLabel("测试公司当前状态", { exact: true })).toHaveCSS(
    "color",
    "rgb(18, 52, 86)",
  );
  await page.getByLabel("删除第4行", { exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.locator(".workspace-table tbody tr")).toHaveCount(3);
});
test("移动端导航、主要页面与视口无溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/jobs",
    "/jobs/cicc-research",
    "/workspace",
    "/search?q=四大",
    "/login",
    "/account",
    "/interviews",
    "/interviews/research-prep",
    "/resume",
    "/review",
    "/radar",
    "/store",
    "/mock",
    "/calendar",
    "/admin",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBeTruthy();
  }
  await page.getByLabel("展开导航", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "求职工作台", exact: true })
    .click();
  await expect(page).toHaveURL(/workspace/);
  expect(errors).toEqual([]);
});
test("微信未配置时不建立会话；未知岗位返回 404", async ({ page, request }) => {
  await page.goto("/login");
  await expect(
    page.getByText("微信扫码登录暂未开通", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".oauth-unavailable img, .oauth-unavailable canvas"),
  ).toHaveCount(0);
  const auth = await request.get("/api/auth/wechat");
  expect(auth.status()).toBe(503);
  expect(auth.headers()["set-cookie"]).toBeUndefined();
  const unknown = await request.get("/jobs/no-such-job");
  expect(unknown.status()).toBe(404);
});

test("多卡片收藏同步，重载后保留两条收藏；弹窗 Escape 可关闭", async ({
  page,
}) => {
  await page.goto("/jobs");
  await page
    .getByRole("button", { name: "收藏研究部 · 行业研究实习生", exact: true })
    .click();
  await page
    .getByRole("button", { name: "收藏国际化产品实习生", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "取消收藏研究部 · 行业研究实习生",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "取消收藏国际化产品实习生", exact: true }),
  ).toBeVisible();
  await page.goto("/workspace");
  await page.getByRole("button", { name: "管理状态", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
