import { NativePdf, subsetFont } from './pdf';
import type { FileEdit } from './model';
const worker = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (data: unknown, transfer?: Transferable[]) => void;
};
let engine: NativePdf | null = null,
  currentEdits: FileEdit[] = [],
  font: Uint8Array | null = null,
  subsetWasm: Uint8Array | null = null,
  smallFont: Uint8Array | null = null;
async function getFont() {
  if (smallFont) return smallFont;
  if (!font)
    font = new Uint8Array(
      await (await fetch('/fonts/resume/NotoSansSC-Regular.ttf')).arrayBuffer()
    );
  if (!subsetWasm)
    subsetWasm = new Uint8Array(
      await (await fetch('/vendor/resume/harfbuzz-subset.wasm')).arrayBuffer()
    );
  smallFont = await subsetFont(font, currentEdits.map((edit) => edit.text).join(''), subsetWasm);
  return smallFont;
}
let queue = Promise.resolve();
worker.onmessage = (event) => {
  queue = queue.then(async () => {
    const { id, action, source, edits, page } = event.data;
    try {
      let value: unknown;
      if (action === 'load') {
        const wasm = new Uint8Array(
          await (await fetch('/vendor/resume/pdfium.wasm')).arrayBuffer()
        );
        engine = await NativePdf.create(new Uint8Array(source), wasm, getFont);
        value = engine.info();
      } else {
        if (!engine) throw new Error('PDF 尚未载入。');
        currentEdits = edits || [];
        smallFont = null;
        if (action === 'render') value = await engine.render(page || 0, currentEdits);
        else if (action === 'export') value = await engine.export(currentEdits);
        else throw new Error('操作无效。');
      }
      worker.postMessage({ id, value });
    } catch (error) {
      worker.postMessage({ id, error: error instanceof Error ? error.message : 'PDF 处理失败。' });
    }
  });
};
