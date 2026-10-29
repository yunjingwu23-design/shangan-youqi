import { readFile } from "node:fs/promises";
import path from "node:path";
import { launchResumeBrowser } from "./browser";
import { resumeHtml, type LayoutReport } from "./document";
import { selectFontFaces, fontFaceCSS } from "./fonts";
import type { Resume } from "./model";
export async function exportResume(resume: Resume) {
  const fontCSS = (
    await Promise.all(
      selectFontFaces(resume).map(async (face) =>
        fontFaceCSS(
          face,
          (
            await readFile(
              path.join(process.cwd(), "public", "fonts", face.file),
            )
          ).toString("base64"),
        ),
      ),
    )
  ).join("");
  const browser = await launchResumeBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 794, height: 1123 },
    });
    await page.route("**/*", (route) => route.abort());
    await page.setContent(resumeHtml(resume, fontCSS), {
      waitUntil: "load",
      timeout: 20000,
    });
    await page.waitForFunction(
      "window.__RESUME_LAYOUT !== undefined",
      {},
      { timeout: 20000 },
    );
    const layout = (await page.evaluate(
      "window.__RESUME_LAYOUT",
    )) as LayoutReport;
    if (layout.error) throw new Error(layout.error);
    if (layout.overflow || layout.pages > 20)
      throw new Error("内容超出排版限制，请缩短内容、减少字号或拆分版本。");
    await page.emulateMedia({ media: "print" });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    });
    return { buffer, layout };
  } finally {
    await browser.close();
  }
}
