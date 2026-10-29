import { readFile } from "node:fs/promises";
import { parseResume } from "../src/lib/resume/parse";
import { exportResume } from "../src/lib/resume/export";
import { getDocumentProxy, extractText } from "unpdf";
async function main() {
  process.env.VERCEL = "1";
  const r = await parseResume(
    new Uint8Array(await readFile("tests/fixtures/resume/standard.docx")),
    "standard.docx",
  );
  const { buffer, layout } = await exportResume(r);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  try {
    const { text } = await extractText(pdf, { mergePages: true });
    if (!text.replace(/\s/g, "").includes("示例大学"))
      throw new Error("Bundled Chromium output lost Chinese text");
    console.log(
      "Bundled serverless Chromium verified:",
      layout.pages,
      "pages,",
      buffer.length,
      "bytes; Chinese text layer preserved.",
    );
  } finally {
    await pdf.loadingTask.destroy();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
