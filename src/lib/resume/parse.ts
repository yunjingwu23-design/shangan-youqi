import mammoth from "mammoth";
import { unzipSync, strFromU8 } from "fflate";
import { getDocumentProxy, extractTextItems } from "unpdf";
import { structureText } from "./structure";
import { type Resume } from "./model";
export const MAX_UPLOAD = 3 * 1024 * 1024;
export async function parseResume(
  bytes: Uint8Array,
  filename: string,
): Promise<Resume> {
  if (bytes.byteLength > MAX_UPLOAD)
    throw new Error("文件超过 3MB，请缩小后重试。");
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "docx") {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
      throw new Error("文件不是有效的 DOCX，请勿仅修改扩展名。");
    let expanded = 0,
      count = 0;
    unzipSync(bytes, {
      filter: (file) => {
        expanded += file.originalSize;
        count++;
        if (expanded > 24 * 1024 * 1024 || count > 1000)
          throw new Error("DOCX 解压后体积过大或内容过于复杂。");
        if (/vbaProject\.bin$/i.test(file.name))
          throw new Error("不支持包含宏的文件。");
        return false;
      },
    });
    const xml = unzipSync(bytes, {
      filter: (f) => ["word/document.xml", "word/styles.xml"].includes(f.name),
    });
    if (!xml["word/document.xml"]) throw new Error("DOCX 缺少正文，无法读取。");
    const doc = strFromU8(xml["word/document.xml"]);
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const warnings: string[] = [];
    if (/<w:tbl[\s>]/.test(doc))
      warnings.push(
        "检测到表格，已按文本阅读顺序展开；列间对应关系需要人工核对。",
      );
    if (/<w:cols[^>]+w:num="[2-9]/.test(doc) || /<w:txbxContent/.test(doc))
      warnings.push("检测到多栏或文本框，阅读顺序可能变化，请对照原文校对。");
    const resume = structureText(result.value, "docx", filename, warnings);
    const margin = doc.match(/<w:pgMar[^>]*w:top="(\d+)"/);
    if (margin)
      resume.style.margin = Math.min(
        26,
        Math.max(12, Math.round(Number(margin[1]) / 56.69)),
      );
    const font = doc.match(/w:(?:eastAsia|ascii)="([^"]+)"/);
    if (font && /宋|serif|times|simsun/i.test(font[1]))
      resume.style.font = "serif";
    return resume;
  }
  if (ext === "pdf") {
    if (!Buffer.from(bytes.slice(0, 5)).toString().startsWith("%PDF-"))
      throw new Error("文件不是有效的 PDF。");
    let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
    try {
      pdf = await getDocumentProxy(bytes, {
        verbosity: 0,
        useSystemFonts: false,
        maxImageSize: 1000000,
        disableFontFace: true,
      });
      if (pdf.numPages > 12) throw new Error("暂支持最多 12 页文字型 PDF。");
      const result = await extractTextItems(pdf);
      const pages: string[] = [];
      let columns = false;
      for (let pageIndex = 0; pageIndex < result.items.length; pageIndex++) {
        const items = result.items[pageIndex];
        if (items.length > 60000)
          throw new Error("PDF 页面内容过于复杂，请简化后重试。");
        const page = await pdf.getPage(pageIndex + 1);
        const midpoint = page.view[2] / 2;
        function linesOf(list: typeof items) {
          const rows = new Map<number, typeof items>();
          for (const item of list) {
            const key = Math.round(item.y / 3) * 3;
            const row = rows.get(key) || [];
            row.push(item);
            rows.set(key, row);
          }
          return [...rows.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([, row]) => row.sort((a, b) => a.x - b.x));
        }
        const rows = linesOf(items);
        const gutters = rows.filter((row) =>
          row.some(
            (it, i) =>
              i > 0 &&
              it.x >= midpoint &&
              row[i - 1].x < midpoint &&
              it.x - row[i - 1].x - row[i - 1].width > 45,
          ),
        ).length;
        const hasColumns = gutters >= 3;
        columns = columns || hasColumns;
        const ordered = hasColumns
          ? [
              ...linesOf(items.filter((it) => it.x < midpoint)),
              ...linesOf(items.filter((it) => it.x >= midpoint)),
            ]
          : rows;
        const output = ordered.map((line) =>
          line
            .map(
              (it, i) =>
                `${i && it.x - line[i - 1].x - line[i - 1].width > 8 ? "  " : ""}${it.str}`,
            )
            .join(""),
        );
        if (output.join("").replace(/\s/g, "").length < 12)
          throw new Error(
            "PDF 至少一页没有足够可提取文字，可能为扫描件或混合图片页；本轮不提供 OCR。",
          );
        pages.push(output.join("\n"));
      }
      const warnings = [
        "PDF 已转换为可编辑文本，不保证原版式；字体、分栏、表格及分页可能发生变化。",
      ];
      if (columns)
        warnings.push(
          "检测到较大列间距，可能存在双栏或表格；已尝试先左栏后右栏展开，请特别校对阅读顺序。",
        );
      return structureText(pages.join("\n"), "pdf", filename, warnings);
    } catch (e) {
      if (e instanceof Error && /password|encrypted/i.test(e.message))
        throw new Error("不支持加密或需要密码的 PDF，请先解除保护。");
      throw e;
    } finally {
      await pdf?.loadingTask.destroy();
    }
  }
  throw new Error("仅支持 .docx 和文字型 .pdf；不支持 .doc、图片或扫描件。");
}
