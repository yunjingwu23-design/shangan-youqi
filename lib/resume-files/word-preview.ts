import { editWord } from './word';
import type { FileEdit } from './model';
const documents = new WeakMap<HTMLIFrameElement, Promise<Document>>();
function frameDocument(frame: HTMLIFrameElement) {
  const existing = documents.get(frame);
  if (existing) return existing;
  const pending = new Promise<Document>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      frame.removeEventListener('load', loaded);
    };
    const loaded = () => {
      cleanup();
      const doc = frame.contentDocument;
      if (doc?.getElementById('docx')) resolve(doc);
      else reject(new Error('Word 预览容器未能载入，请重新打开文件。'));
    };
    const timer = setTimeout(() => {
      cleanup();
      documents.delete(frame);
      reject(new Error('Word 预览载入超时，请重新打开文件。'));
    }, 5000);
    // Install the listener before navigating. Do not overwrite it during another render.
    frame.addEventListener('load', loaded);
    frame.srcdoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob: data:; font-src blob: data:; style-src 'unsafe-inline';"><style>
      body{margin:0;background:#f4f5f1}.docx-wrapper{padding:14px!important}
      section.docx{margin:0 auto 16px!important;box-shadow:none!important}
      @media print{.docx-wrapper{padding:0!important;background:white!important}section.docx{margin:0!important;box-shadow:none!important}}
      </style></head><body><div id="docx"></div></body></html>`;
  });
  documents.set(frame, pending);
  return pending;
}
export async function renderWordPreview(
  frame: HTMLIFrameElement,
  source: Uint8Array,
  edits: FileEdit[],
  isCurrent: () => boolean
) {
  const bytes = editWord(source, edits),
    doc = await frameDocument(frame);
  if (!isCurrent()) return false;
  const root = doc.getElementById('docx')!,
    stage = doc.createElement('div'),
    oldScroll = frame.contentWindow?.scrollY || 0;
  stage.style.cssText =
    'position:absolute;left:0;top:0;width:100%;visibility:hidden;pointer-events:none';
  doc.body.appendChild(stage);
  let expired = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { renderAsync } = await import('docx-preview');
    await Promise.race([
      renderAsync(new Uint8Array(bytes).buffer, stage, stage, {
        ignoreLastRenderedPageBreak: false,
        // This is the supported option name; inExperimentalMode was silently ignored.
        experimental: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderAltChunks: false,
        useBase64URL: true,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error('Word 排版预览超时，原文件和修改仍保留，请重试。'));
        }, 15000);
      }),
    ]);
    clearTimeout(timer);
    // docx-preview resolves before its deferred tab-stop measurement (500 ms).
    // Keep the measured stage attached and at its native scale until that finishes.
    if (stage.querySelector('.docx-tab-stop'))
      await new Promise((resolve) => setTimeout(resolve, 550));
    if (expired || !isCurrent()) return false;
    for (const link of Array.from(stage.querySelectorAll('a'))) link.removeAttribute('href');
    for (const section of Array.from(stage.querySelectorAll<HTMLElement>('section.docx'))) {
      const nativeWidth = section.getBoundingClientRect().width;
      if (nativeWidth)
        section.style.setProperty(
          'zoom',
          String(Math.min(1, (frame.clientWidth - 28) / nativeWidth))
        );
    }
    stage.removeAttribute('style');
    root.replaceChildren(stage);
    frame.contentWindow?.scrollTo(0, oldScroll);
    return true;
  } finally {
    clearTimeout(timer);
    if (stage.parentElement !== doc.getElementById('docx')) stage.remove();
  }
}
