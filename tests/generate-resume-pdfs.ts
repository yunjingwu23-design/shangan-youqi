import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
async function main() {
  const root = "tests/fixtures/resume";
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const head =
      '<meta charset="utf-8"><style>@page{size:A4;margin:18mm}body{font-family:"Noto Sans CJK SC",sans-serif;font-size:11pt;line-height:1.6}h1{font-size:24pt}h2{font-size:14pt;margin:18px 0 8px}p{margin:4px 0}.cols{display:grid;grid-template-columns:1fr 1fr;gap:45px}</style>';
    const personal = "<h1>林同学</h1><p>student@example.com | 13800000000</p>";
    const education =
      "<h2>教育背景</h2><p>示例大学 · 金融学 · 2023 – 2027</p><p>GPA 3.8/4.0</p><h2>实习经历</h2><p>示例咨询公司 · 研究实习生</p><p>2025.06 – 2025.09</p><p>整理公开财务数据，形成研究记录。</p>";
    const skills =
      "<h2>项目经历</h2><p>校园商业研究</p><p>归纳访谈结果，参与小组展示。</p><h2>技能与证书</h2><p>Python、Excel、SQL</p><p>英语 CET-6</p>";
    for (const [filename, body] of [
      ["single-column", personal + education + skills],
      [
        "two-column",
        personal +
          '<div class="cols"><div>' +
          education +
          "</div><div>" +
          skills +
          "</div></div>",
      ],
      [
        "multi-page",
        personal +
          education +
          skills +
          Array.from(
            { length: 65 },
            (_, i) =>
              `<p>附加项目 ${i + 1}：匿名合成的常见简历版式，用于测试多页解析与分页，不是真实用户资料。</p>`,
          ).join(""),
      ],
    ]) {
      await page.setContent(head + body);
      await page.pdf({
        path: `${root}/${filename}.pdf`,
        format: "A4",
        printBackground: true,
      });
    }
    await page.setContent(head + personal + education);
    const image = await page.screenshot();
    await page.setContent(
      `<style>@page{size:A4;margin:0}img{width:210mm}</style><img src="data:image/png;base64,${image.toString("base64")}">`,
    );
    await page.pdf({ path: `${root}/scanned.pdf`, format: "A4" });
    await writeFile(`${root}/invalid.docx`, "not a real Word file");
    console.log(
      "Generated 4 anonymous PDF layout fixtures and an invalid DOCX.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
