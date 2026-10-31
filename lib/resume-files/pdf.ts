import { init, type WrappedPdfiumModule } from '@embedpdf/pdfium';
import type { FileBlock, FileEdit } from './model';
// Native page objects are changed, rather than painting rectangles over old text.
// Original files are immutable; every preview/export starts from the uploaded bytes.
type Heap = WrappedPdfiumModule['pdfium'] & { HEAPU8: Uint8Array };
type FontSubset = {
  memory: WebAssembly.Memory;
  malloc: (n: number) => number;
  free: (p: number) => void;
  [key: string]: WebAssembly.ExportValue;
};
function supports(font: Uint8Array, code: number) {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  let cmap = 0;
  for (let n = 0; n < view.getUint16(4); n++) {
    const p = 12 + n * 16;
    if (view.getUint32(p) === 0x636d6170) cmap = view.getUint32(p + 8);
  }
  if (!cmap) return false;
  for (let n = 0; n < view.getUint16(cmap + 2); n++) {
    const start = cmap + view.getUint32(cmap + 4 + n * 8 + 4),
      format = view.getUint16(start);
    if (format === 12) {
      const count = view.getUint32(start + 12);
      for (let i = 0; i < count; i++) {
        const p = start + 16 + i * 12,
          a = view.getUint32(p),
          b = view.getUint32(p + 4);
        if (code >= a && code <= b) return view.getUint32(p + 8) + code - a !== 0;
      }
    }
    if (format === 4 && code <= 65535) {
      const count = view.getUint16(start + 6) / 2,
        end = start + 14,
        begin = end + count * 2 + 2,
        delta = begin + count * 2,
        range = delta + count * 2;
      for (let i = 0; i < count; i++) {
        if (code > view.getUint16(end + i * 2) || code < view.getUint16(begin + i * 2)) continue;
        const offset = view.getUint16(range + i * 2),
          d = view.getInt16(delta + i * 2);
        return offset
          ? Boolean(
              view.getUint16(range + i * 2 + offset + (code - view.getUint16(begin + i * 2)) * 2)
            )
          : Boolean((code + d) & 65535);
      }
    }
  }
  return false;
}
export async function subsetFont(
  font: Uint8Array,
  text: string,
  wasm: Uint8Array
): Promise<Uint8Array> {
  for (const character of new Set(text))
    if (!supports(font, character.codePointAt(0)!))
      throw new Error(
        character === '\n' || character === '\r'
          ? 'PDF 文字固定在原位置，请按片段编辑；需要新增换行时请使用 DOCX 或站内模板。'
          : `当前 PDF 兼容字体不支持「${character}」，请使用 Word 原件保留该字符。`
      );
  const loaded = await WebAssembly.instantiate(new Uint8Array(wasm).buffer, {}),
    x = loaded.instance.exports as unknown as FontSubset;
  const fn = (name: string, ...args: number[]) =>
    (x[name] as (...values: number[]) => number)(...args);
  fn('_initialize');
  const ptr = x.malloc(font.length);
  new Uint8Array(x.memory.buffer).set(font, ptr);
  const blob = fn('hb_blob_create', ptr, font.length, 0, 0, 0),
    face = fn('hb_face_create', blob, 0),
    input = fn('hb_subset_input_create_or_fail');
  let output = 0,
    resultBlob = 0;
  try {
    if (!face || !input) throw new Error('无法准备 PDF 字体。');
    const set = fn('hb_subset_input_unicode_set', input);
    for (const char of new Set(text)) fn('hb_set_add', set, char.codePointAt(0)!);
    output = fn('hb_subset_or_fail', face, input);
    if (!output) throw new Error('当前文字暂时无法嵌入 PDF，请使用 Word 原件编辑。');
    resultBlob = fn('hb_face_reference_blob', output);
    const length = fn('hb_blob_get_length', resultBlob),
      data = fn('hb_blob_get_data', resultBlob, 0);
    return new Uint8Array(x.memory.buffer, data, length).slice();
  } finally {
    if (resultBlob) fn('hb_blob_destroy', resultBlob);
    if (output) fn('hb_face_destroy', output);
    fn('hb_subset_input_destroy', input);
    fn('hb_face_destroy', face);
    fn('hb_blob_destroy', blob);
    x.free(ptr);
  }
}
export class NativePdf {
  constructor(
    private api: WrappedPdfiumModule,
    private source: Uint8Array,
    private getFont: () => Promise<Uint8Array>
  ) {}
  static async create(source: Uint8Array, wasm: Uint8Array, getFont: () => Promise<Uint8Array>) {
    const api = await init({ wasmBinary: wasm });
    api.PDFiumExt_Init();
    return new NativePdf(api, source, getFont);
  }
  private heap() {
    return this.api.pdfium as Heap;
  }
  private alloc(bytes: Uint8Array) {
    const ptr = this.heap().wasmExports.malloc(bytes.length);
    this.heap().HEAPU8.set(bytes, ptr);
    return ptr;
  }
  private free(ptr: number) {
    this.heap().wasmExports.free(ptr);
  }
  private doc() {
    const ptr = this.alloc(this.source),
      doc = this.api.FPDF_LoadMemDocument(ptr, this.source.length, '');
    if (!doc) {
      this.free(ptr);
      throw new Error('PDF 已加密、损坏或无法读取。请上传未加密的文字型 PDF。');
    }
    return {
      doc,
      close: () => {
        this.api.FPDF_CloseDocument(doc);
        this.free(ptr);
      },
    };
  }
  private text(object: number, textPage: number) {
    const size = this.api.FPDFTextObj_GetText(object, textPage, 0, 0);
    if (size < 2 || size > 20002) return '';
    const ptr = this.heap().wasmExports.malloc(size);
    try {
      this.api.FPDFTextObj_GetText(object, textPage, ptr, size);
      return this.heap().UTF16ToString(ptr);
    } finally {
      this.free(ptr);
    }
  }
  info() {
    const opened = this.doc(),
      api = this.api;
    try {
      const pages = api.FPDF_GetPageCount(opened.doc);
      if (pages > 20) throw new Error('目前支持不超过 20 页的简历。');
      const editable =
          api.FPDF_GetSignatureCount(opened.doc) === 0 &&
          Boolean(api.FPDF_GetDocPermissions(opened.doc) & 8),
        blocks: FileBlock[] = [];
      for (let n = 0; n < pages; n++) {
        const page = api.FPDF_LoadPage(opened.doc, n),
          textPage = api.FPDFText_LoadPage(page);
        try {
          const count = api.FPDFPage_CountObjects(page);
          if (count > 10000) throw new Error('PDF 页面过于复杂，请精简后上传。');
          for (let i = 0; i < count; i++) {
            const obj = api.FPDFPage_GetObject(page, i);
            if (api.FPDFPageObj_GetType(obj) !== 1) continue;
            const text = this.text(obj, textPage);
            if (text.trim())
              blocks.push({
                key: `${n}:${i}`,
                text,
                label: `第 ${n + 1} 页 · 文字片段 ${i + 1}`,
                page: n,
              });
          }
        } finally {
          api.FPDFText_ClosePage(textPage);
          api.FPDF_ClosePage(page);
        }
      }
      if (blocks.length > 1500) throw new Error('PDF 文字片段过多，请精简简历。');
      return { pages, editable, blocks };
    } finally {
      opened.close();
    }
  }
  private async apply(doc: number, page: number, index: number, edits: FileEdit[]) {
    const api = this.api;
    // Removing an object shifts subsequent indices. Work backwards so every key
    // continues to refer to its object in the immutable original document.
    const changes = edits
      .filter((value) => Number(value.key.split(':')[0]) === index)
      .sort((a, b) => Number(b.key.split(':')[1]) - Number(a.key.split(':')[1]));
    for (const edit of changes) {
      const objectIndex = Number(edit.key.split(':')[1]),
        old = api.FPDFPage_GetObject(page, objectIndex);
      if (!old || api.FPDFPageObj_GetType(old) !== 1) throw new Error('PDF 文字位置已失效。');
      if (!edit.text) {
        if (!api.FPDFPage_RemoveObject(page, old)) throw new Error('无法删除 PDF 文字。');
        api.FPDFPageObj_Destroy(old);
        continue;
      }
      const attrs = this.heap().wasmExports.malloc(64);
      let object = 0,
        font = 0;
      try {
        api.FPDFTextObj_GetFontSize(old, attrs);
        const size = Number(this.heap().getValue(attrs, 'float'));
        api.FPDFPageObj_GetMatrix(old, attrs + 4);
        api.FPDFPageObj_GetFillColor(old, attrs + 28, attrs + 32, attrs + 36, attrs + 40);
        const matrix = Array.from({ length: 6 }, (_, i) =>
          Number(this.heap().getValue(attrs + 4 + i * 4, 'float'))
        );
        if (Math.abs(matrix[1]) > 0.001 || Math.abs(matrix[2]) > 0.001)
          throw new Error('旋转或倾斜文字暂不支持直接替换，请使用 Word 原件。');
        const color = [28, 32, 36, 40].map((offset) =>
          Number(this.heap().getValue(attrs + offset, 'i32'))
        );
        const fontBytes = await this.getFont(),
          fp = this.alloc(fontBytes);
        try {
          font = api.FPDFText_LoadFont(doc, fp, fontBytes.length, 2, true);
        } finally {
          this.free(fp);
        }
        if (!font) throw new Error('字体载入失败，请重试。');
        object = api.FPDFPageObj_CreateTextObj(doc, font, size);
        const utf16 = new Uint8Array((edit.text.length + 1) * 2),
          view = new DataView(utf16.buffer);
        for (let i = 0; i < edit.text.length; i++)
          view.setUint16(i * 2, edit.text.charCodeAt(i), true);
        const tp = this.alloc(utf16);
        try {
          if (!api.FPDFText_SetText(object, tp)) throw new Error('这段文字无法写入 PDF。');
        } finally {
          this.free(tp);
        }
        api.FPDFPageObj_SetMatrix(object, attrs + 4);
        api.FPDFPageObj_SetFillColor(object, color[0], color[1], color[2], color[3]);
        const box = attrs + 44;
        api.FPDFPageObj_GetBounds(object, box, box + 4, box + 8, box + 12);
        if (Number(this.heap().getValue(box + 8, 'float')) > api.FPDF_GetPageWidth(page) - 4)
          throw new Error('替换文字超出了页面，请缩短内容，或另建模板副本调整排版。');
        // Preserve object order and original positioning. Text stays selectable, with no image flattening.
        if (!api.FPDFPage_RemoveObject(page, old)) throw new Error('无法替换 PDF 文字。');
        api.FPDFPageObj_Destroy(old);
        if (!api.FPDFPage_InsertObjectAtIndex(page, object, objectIndex))
          throw new Error('无法写入 PDF 页面。');
        object = 0;
      } finally {
        if (object) api.FPDFPageObj_Destroy(object);
        if (font) api.FPDFFont_Close(font);
        this.free(attrs);
      }
    }
    if (
      edits.some((value) => Number(value.key.split(':')[0]) === index) &&
      !api.FPDFPage_GenerateContent(page)
    )
      throw new Error('PDF 页面生成失败。');
  }
  async render(index: number, edits: FileEdit[]) {
    const opened = this.doc(),
      api = this.api;
    let page = 0,
      bitmap = 0;
    try {
      page = api.FPDF_LoadPage(opened.doc, index);
      if (!page) throw new Error('未找到 PDF 页面。');
      await this.apply(opened.doc, page, index, edits);
      const width = Math.min(1300, Math.ceil(api.FPDF_GetPageWidth(page) * 1.5)),
        height = Math.ceil((width / api.FPDF_GetPageWidth(page)) * api.FPDF_GetPageHeight(page));
      if (height > 6000) throw new Error('PDF 页面尺寸过大。');
      bitmap = api.FPDFBitmap_Create(width, height, 1);
      api.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff);
      api.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 1);
      const ptr = api.FPDFBitmap_GetBuffer(bitmap),
        stride = api.FPDFBitmap_GetStride(bitmap),
        pixels = new Uint8ClampedArray(width * height * 4),
        heap = this.heap().HEAPU8;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const from = ptr + y * stride + x * 4,
            to = (y * width + x) * 4;
          pixels[to] = heap[from + 2];
          pixels[to + 1] = heap[from + 1];
          pixels[to + 2] = heap[from];
          pixels[to + 3] = heap[from + 3];
        }
      return { width, height, pixels };
    } finally {
      if (bitmap) api.FPDFBitmap_Destroy(bitmap);
      if (page) api.FPDF_ClosePage(page);
      opened.close();
    }
  }
  async export(edits: FileEdit[]) {
    if (!edits.length) return this.source.slice();
    const valid = new Set(this.info().blocks.map((block) => block.key));
    if (edits.some((edit) => !valid.has(edit.key)))
      throw new Error('部分文字位置无效，请重新打开原文件。');
    const opened = this.doc(),
      api = this.api;
    let writer = 0;
    try {
      if (
        api.FPDF_GetSignatureCount(opened.doc) > 0 ||
        !(api.FPDF_GetDocPermissions(opened.doc) & 8)
      )
        throw new Error('这份 PDF 带有签名或修改限制，请上传可编辑原件。');
      const pages = api.FPDF_GetPageCount(opened.doc);
      for (let n = 0; n < pages; n++) {
        const page = api.FPDF_LoadPage(opened.doc, n);
        try {
          await this.apply(opened.doc, page, n, edits);
        } finally {
          api.FPDF_ClosePage(page);
        }
      }
      writer = api.PDFiumExt_OpenFileWriter();
      if (!api.FPDF_SaveAsCopy(opened.doc, writer, 2)) throw new Error('PDF 保存失败。');
      const size = api.PDFiumExt_GetFileWriterSize(writer),
        ptr = this.heap().wasmExports.malloc(size);
      try {
        api.PDFiumExt_GetFileWriterData(writer, ptr, size);
        return this.heap().HEAPU8.slice(ptr, ptr + size);
      } finally {
        this.free(ptr);
      }
    } finally {
      if (writer) api.PDFiumExt_CloseFileWriter(writer);
      opened.close();
    }
  }
}
