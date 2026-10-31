'use client';
import { useEffect, useRef, useState } from 'react';
import { Upload, Download, Save, Copy, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useDraftStorage } from '@/components/drafts';
import type { OriginalResume, FileBlock, FileEdit } from '@/lib/resume-files/model';
import { MAX_RESUME_BYTES } from '@/lib/resume-files/model';
import { wordBlocks } from '@/lib/resume-files/word';
import { fileLines } from '@/lib/resume-files/search';
import { renderWordPreview } from '@/lib/resume-files/word-preview';
import { WordParagraphControls } from '@/components/resume-word-format';
export type ResumeSummary = {
  id: string;
  title: string;
  company: string;
  updated_at: string;
  fileType?: string | null;
};
async function json(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '操作失败，请稍后重试。');
  return data;
}
export function downloadBytes(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type })),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
export function ResumeUpload({ onUploaded }: { onUploaded: (id: string) => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError('支持 PDF 和 DOCX。旧版 DOC 请先用 Word 另存为 DOCX。');
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError('请选择 3 MiB 以内的简历文件。');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/resumes/upload?name=' + encodeURIComponent(file.name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onUploaded(data.resume.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : '上传失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="resume-import-card">
      <div>
        <strong>上传已有简历，保留原来的版式</strong>
        <p>PDF / Word（DOCX）· 最大 3 MiB · 原件私有保存，仅自己可见。</p>
      </div>
      <label className={`button secondary resume-upload-button ${busy ? 'disabled' : ''}`}>
        <Upload size={16} />
        {busy ? '正在保存原文件…' : '上传 PDF / Word'}
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-label="上传 PDF 或 Word 简历"
          disabled={busy}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {error && (
        <p className="site-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
type Metadata = ResumeSummary & { original: OriginalResume };
type Rpc = {
  call: (action: string, body?: Record<string, unknown>) => Promise<any>;
  close: () => void;
};
function pdfRpc(): Rpc {
  const worker = new Worker(new URL('../lib/resume-files/pdf.worker.ts', import.meta.url), {
    type: 'module',
  });
  let serial = 0,
    closed = false;
  const pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  worker.onmessage = (event) => {
    const item = pending.get(event.data.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(event.data.id);
    if (event.data.error) item.reject(new Error(event.data.error));
    else item.resolve(event.data.value);
  };
  function close() {
    closed = true;
    worker.terminate();
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error('PDF 处理已停止，请重新打开文件。'));
    }
    pending.clear();
  }
  worker.onerror = () => {
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error('PDF 编辑器未能启动，请刷新后重试。'));
    }
    pending.clear();
    worker.terminate();
  };
  return {
    call: (action, body = {}) =>
      new Promise((resolve, reject) => {
        if (closed) {
          reject(new Error('PDF 编辑器已停止，请重新打开文件。'));
          return;
        }
        const id = ++serial;
        const timer = setTimeout(() => {
          close();
          reject(new Error('PDF 处理超时，请精简文件后重新打开。'));
        }, 30000);
        pending.set(id, { resolve, reject, timer });
        worker.postMessage({ id, action, ...body });
      }),
    close,
  };
}
export function OriginalResumeEditor({
  entry,
  items,
  onSelect,
  onNew,
  onCopyToTemplate,
  onDeleted,
}: {
  entry: Metadata;
  items: ResumeSummary[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onCopyToTemplate: (text: string, template: 'classic' | 'compact' | 'sidebar') => Promise<void>;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(entry.title),
    [edits, setEdits] = useState<FileEdit[]>(entry.original.edits),
    [updatedAt, setUpdatedAt] = useState(entry.updated_at),
    [dirty, setDirty] = useState(false);
  const [blocks, setBlocks] = useState<FileBlock[]>([]),
    [source, setSource] = useState<Uint8Array | null>(null),
    [page, setPage] = useState(0),
    [pages, setPages] = useState(1),
    [editable, setEditable] = useState(true),
    [filter, setFilter] = useState(''),
    [template, setTemplate] = useState<'classic' | 'compact' | 'sidebar'>('classic');
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [previewState, setPreviewState] = useState<'pending' | 'loading' | 'ready' | 'error'>(
      'pending'
    ),
    [previewError, setPreviewError] = useState(''),
    [previewed, setPreviewed] = useState('');
  const worker = useRef<Rpc | null>(null),
    canvas = useRef<HTMLCanvasElement | null>(null),
    frame = useRef<HTMLIFrameElement | null>(null),
    lineList = useRef<HTMLDivElement | null>(null),
    previewPanel = useRef<HTMLElement | null>(null),
    alive = useRef(true),
    renderSequence = useRef(0),
    previewQueue = useRef(Promise.resolve()),
    debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const local = useDraftStorage<{ title: string; edits: FileEdit[]; updatedAt: string }>(
    `resume-original:${entry.id}`
  );
  useEffect(() => {
    const pending = local.read();
    if (pending) {
      setTitle(pending.title);
      setEdits(pending.edits);
      setUpdatedAt(pending.updatedAt);
      setDirty(true);
      setNotice('已恢复当前标签页中尚未保存的修改。');
    }
  }, []);
  useEffect(() => {
    if (dirty) local.write({ title, edits, updatedAt });
  }, [title, edits, updatedAt, dirty]);
  useEffect(() => {
    alive.current = true;
    async function load() {
      try {
        const response = await fetch(`/api/resumes/${entry.id}/file`, { cache: 'no-store' });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!alive.current) return;
        setSource(bytes);
        if (entry.original.fileType === 'docx') setBlocks(wordBlocks(bytes));
        else {
          const rpc = pdfRpc();
          worker.current = rpc;
          const info = await rpc.call('load', { source: bytes });
          if (!alive.current) return;
          setBlocks(info.blocks);
          setPages(info.pages);
          setEditable(info.editable);
        }
      } catch (error) {
        if (alive.current) setError(error instanceof Error ? error.message : '无法打开文件。');
      } finally {
        if (alive.current) setLoading(false);
      }
    }
    void load();
    return () => {
      alive.current = false;
      worker.current?.close();
    };
  }, [entry.id]);
  function preview(manual = false) {
    if (!source) return;
    clearTimeout(debounce.current);
    const sequence = ++renderSequence.current,
      snapshot = edits.map((edit) => ({
        ...edit,
        ...(edit.paragraph ? { paragraph: { ...edit.paragraph } } : {}),
      })),
      targetPage = page,
      signature = JSON.stringify({ page: targetPage, edits: snapshot }),
      current = () => sequence === renderSequence.current && alive.current;
    setPreviewState('loading');
    setPreviewError('');
    previewQueue.current = previewQueue.current
      .catch(() => {})
      .then(async () => {
        if (!current()) return;
        if (entry.original.fileType === 'pdf') {
          if (!worker.current) return;
          const image = await worker.current.call('render', { page: targetPage, edits: snapshot });
          if (!current()) return;
          const element = canvas.current;
          if (element) {
            element.width = image.width;
            element.height = image.height;
            element
              .getContext('2d')!
              .putImageData(
                new ImageData(new Uint8ClampedArray(image.pixels), image.width, image.height),
                0,
                0
              );
          }
        } else {
          const target = frame.current;
          if (!target) return;
          if (!(await renderWordPreview(target, source, snapshot, current))) return;
        }
        if (!current()) return;
        setPreviewed(signature);
        setPreviewState('ready');
        if (manual) previewPanel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      })
      .catch((error) => {
        if (!current()) return;
        setPreviewState('error');
        setPreviewError(error instanceof Error ? error.message : '预览失败，请重试。');
      });
  }
  useEffect(() => {
    ++renderSequence.current;
    if (!loading && source) {
      setPreviewState('pending');
      debounce.current = setTimeout(() => preview(), 400);
    }
    return () => clearTimeout(debounce.current);
  }, [source, loading, page, edits]);
  function update(key: string, patch: Partial<FileEdit>) {
    ++renderSequence.current;
    setEdits((old) => {
      const block = blocks.find((block) => block.key === key);
      if (!block) return old;
      const changed = { key, text: block.text, ...old.find((edit) => edit.key === key), ...patch },
        needed =
          changed.text !== block.text ||
          changed.fontSize !== undefined ||
          changed.baseline !== undefined ||
          changed.paragraph !== undefined;
      return [...old.filter((item) => item.key !== key), ...(needed ? [changed] : [])];
    });
    setDirty(true);
    setNotice('');
  }
  function change(key: string, text: string) {
    update(key, { text });
  }
  async function save() {
    setBusy(true);
    setError('');
    try {
      if (entry.original.fileType === 'pdf' && edits.length)
        await worker.current!.call('export', { edits });
      const data = await json(`/api/resumes/${entry.id}/original`, 'PUT', {
        title,
        edits,
        expectedUpdatedAt: updatedAt,
      });
      setUpdatedAt(data.resume.updated_at);
      setDirty(false);
      local.clear();
      setNotice('原版简历的修改已保存到账号。');
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  async function exportEdited() {
    setBusy(true);
    setError('');
    try {
      if (entry.original.fileType === 'pdf') {
        const bytes = await worker.current!.call('export', { edits });
        downloadBytes(
          bytes,
          entry.original.fileName.replace(/\.pdf$/i, '-已修改.pdf'),
          'application/pdf'
        );
      } else {
        const response = await fetch(`/api/resumes/${entry.id}/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edits }),
        });
        if (!response.ok) throw new Error((await response.json()).error);
        downloadBytes(
          new Uint8Array(await response.arrayBuffer()),
          entry.original.fileName.replace(/\.docx$/i, '-已修改.docx'),
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
      }
      setNotice('已按原文件版式导出，请检查修改处和分页。');
    } catch (error) {
      setError(error instanceof Error ? error.message : '导出失败。');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm('永久删除这份简历及其原文件？其他版本保留。')) return;
    setBusy(true);
    try {
      await json('/api/entries', 'DELETE', { id: entry.id });
      local.clear();
      onDeleted();
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败。');
    } finally {
      setBusy(false);
    }
  }
  async function clone() {
    setBusy(true);
    try {
      const data = await json(`/api/resumes/${entry.id}/original`, 'POST', { title, edits });
      onSelect(data.resume.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : '另存失败。');
    } finally {
      setBusy(false);
    }
  }
  const lines = fileLines(
      blocks,
      edits,
      filter,
      entry.original.fileType === 'pdf' ? page : undefined
    ),
    previewMatches = previewed === JSON.stringify({ page, edits }),
    previewLabel =
      previewState === 'error'
        ? '预览更新失败'
        : previewState === 'loading'
          ? '正在更新预览…'
          : !previewMatches
            ? '有修改，等待更新预览…'
            : dirty
              ? '预览已更新 · 尚未保存'
              : '预览已更新';
  return (
    <main className="site-main resume-page resume-original-page">
      <div className="site-page-title resume-toolbar">
        <div>
          <p className="site-eyebrow">YOUR DOCUMENT, YOUR LAYOUT</p>
          <h1>原版简历编辑</h1>
          <p>
            {entry.original.fileName} · {entry.original.fileType.toUpperCase()} · 原件保留
          </p>
        </div>
        <div className="site-actions">
          <button className="button secondary" onClick={onNew}>
            新建模板简历
          </button>
          <a className="button secondary" href={`/api/resumes/${entry.id}/file`}>
            <Download size={16} />
            下载原件
          </a>
          <button
            className="button secondary"
            disabled={busy || loading || (!editable && edits.length > 0)}
            onClick={() => void exportEdited()}
          >
            导出{entry.original.fileType === 'docx' ? ' Word' : ' PDF'}
          </button>
          <button className="button primary" disabled={busy || loading} onClick={() => void save()}>
            <Save size={16} />
            保存原版修改
          </button>
        </div>
      </div>
      <ResumeUpload onUploaded={onSelect} />
      <div className="resume-file-toolbar">
        <label>
          我的简历版本
          <select
            aria-label="选择简历版本"
            value={entry.id}
            disabled={busy}
            onChange={(event) => onSelect(event.target.value)}
          >
            {items.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          简历标题
          <input
            value={title}
            maxLength={120}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
          />
        </label>
        <button className="button secondary" disabled={busy} onClick={() => void clone()}>
          <Copy size={16} />
          另存新版本
        </button>
        <button
          className="button secondary site-danger"
          disabled={busy}
          onClick={() => void remove()}
        >
          <Trash2 size={16} />
          删除当前版本
        </button>
      </div>
      <div className="resume-file-description">
        {entry.original.fileType === 'docx'
          ? '按完整段落检索，保留原文字片段的样式。可调整段落对齐、缩进、行距和日期制表位；修改会自动更新预览。浏览器与 Word 的字体和分页仍可能有差异，正式提交前请在 Word 中复核。'
          : '文字型 PDF 按原位置替换，其他页面元素保留。修改文字使用兼容字体，不自动扩行，请控制文字长度并更新预览。扫描件、签名或受限制的文件只提供原件预览。'}
      </div>
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="site-success">
          {notice}
        </p>
      )}
      {loading && <p role="status">正在读取原文件和文字…</p>}
      {!loading && (
        <div className="resume-file-workbench">
          <section className="resume-file-editor">
            <div className="site-card">
              <h2>原模板文字</h2>
              <input
                aria-label="搜索原件文字"
                placeholder="按完整行 / 段落搜索，也支持修改后的文字"
                value={filter}
                onChange={(event) => {
                  const card = event.currentTarget.closest('.site-card');
                  setFilter(event.target.value);
                  lineList.current?.scrollTo(0, 0);
                  // Run after the browser's caret scroll, so the complete result
                  // appears below the search field instead of below the screen.
                  requestAnimationFrame(() => {
                    if (!card?.isConnected) return;
                    const top = card.getBoundingClientRect().top;
                    if (top < 95 || top > 200)
                      card.scrollIntoView({ block: 'start', behavior: 'instant' });
                  });
                }}
              />
              <p className="ia-draft-note">
                命中前几个字后，会展示完整段落及其中所有文字。修改后自动预览，保存后跨设备同步。
              </p>
              <div className="resume-preview-actions">
                <button
                  className="button secondary"
                  disabled={busy || loading}
                  onClick={() => preview(true)}
                >
                  更新预览
                </button>
                <span aria-live="polite">
                  {previewState === 'loading'
                    ? '正在计算排版…'
                    : previewState === 'error'
                      ? '请查看右侧错误说明'
                      : '自动预览已开启'}
                </span>
              </div>
              {!editable && <p className="site-notice">文件包含签名或编辑限制，当前只读。</p>}
              {!blocks.length && (
                <p>没有可直接编辑的文字，原文件仍可预览和下载。扫描件需提供可编辑 DOCX 原件。</p>
              )}
              {!!blocks.length && (
                <p className="resume-search-count">
                  {filter ? `找到 ${lines.length} 个完整段落 / 行` : `${lines.length} 个段落 / 行`}
                </p>
              )}
              {!!blocks.length && !lines.length && (
                <p className="site-notice">没有匹配内容。可缩短关键词，或清空搜索查看全部段落。</p>
              )}
              <div className="resume-file-lines" ref={lineList}>
                {lines.map((line) => (
                  <article className="resume-line-group" key={line.key}>
                    <div className="resume-line-context">
                      <small>完整行 / 段落</small>
                      <p>{line.text}</p>
                    </div>
                    <WordParagraphControls
                      block={line.blocks[0]}
                      edit={edits.find((edit) => edit.key === line.blocks[0].key)}
                      disabled={!editable || busy}
                      onChange={(paragraph) => update(line.blocks[0].key, { paragraph })}
                      onReset={() => {
                        for (const block of line.blocks)
                          if (edits.find((edit) => edit.key === block.key)?.paragraph)
                            update(block.key, { paragraph: undefined });
                      }}
                    />
                    {line.blocks.map((block) => (
                      <div className="resume-file-block" key={block.key}>
                        <label>
                          {block.label}
                          <textarea
                            aria-label={block.label}
                            value={edits.find((edit) => edit.key === block.key)?.text ?? block.text}
                            maxLength={5000}
                            rows={Math.min(5, Math.max(2, Math.ceil(block.text.length / 50)))}
                            disabled={!editable || busy}
                            onFocus={() => {
                              if (block.page !== undefined && block.page !== page)
                                setPage(block.page);
                            }}
                            onChange={(event) => change(block.key, event.target.value)}
                          />
                        </label>
                        {block.word && (
                          <details className="resume-word-text-format">
                            <summary>字号 / 文字上下位置</summary>
                            <div className="resume-format-grid">
                              <label>
                                字号（pt）
                                <input
                                  aria-label={`${block.label} 字号`}
                                  type="number"
                                  min="6"
                                  max="72"
                                  step="0.5"
                                  disabled={!editable || busy}
                                  value={
                                    edits.find((edit) => edit.key === block.key)?.fontSize ??
                                    block.word.fontSize
                                  }
                                  onChange={(event) => {
                                    if (event.target.value !== '' && event.target.validity.valid)
                                      update(block.key, { fontSize: Number(event.target.value) });
                                  }}
                                />
                              </label>
                              <label>
                                上移量（pt，负数为下移）
                                <input
                                  aria-label={`${block.label} 上移量`}
                                  type="number"
                                  min="-36"
                                  max="36"
                                  step="0.5"
                                  disabled={!editable || busy}
                                  value={
                                    edits.find((edit) => edit.key === block.key)?.baseline ??
                                    block.word.baseline
                                  }
                                  onChange={(event) => {
                                    if (event.target.value !== '' && event.target.validity.valid)
                                      update(block.key, { baseline: Number(event.target.value) });
                                  }}
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              disabled={busy || !editable}
                              onClick={() =>
                                update(block.key, { fontSize: undefined, baseline: undefined })
                              }
                            >
                              还原这段文字格式
                            </button>
                          </details>
                        )}
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            </div>
            <section className="site-card">
              <h3>另选站内模板</h3>
              <p>把当前文字另存为模板副本，原版文件继续保留。</p>
              <select
                aria-label="转换为站内模板"
                value={template}
                onChange={(event) => setTemplate(event.target.value as typeof template)}
              >
                <option value="classic">经典单栏</option>
                <option value="compact">紧凑履历</option>
                <option value="sidebar">侧栏信息</option>
              </select>
              <button
                className="button secondary"
                disabled={busy || !blocks.length}
                onClick={() => {
                  setBusy(true);
                  void onCopyToTemplate(
                    fileLines(blocks, edits)
                      .map((line) => line.text)
                      .join('\n'),
                    template
                  )
                    .catch((error) => setError(error.message))
                    .finally(() => setBusy(false));
                }}
              >
                另建模板副本 →
              </button>
            </section>
          </section>
          <section className="resume-file-preview" aria-label="原版简历预览" ref={previewPanel}>
            <div className="resume-preview-label">
              <strong>原文件版式预览</strong>
              {entry.original.fileType === 'pdf' && (
                <span className="resume-page-controls">
                  <button
                    aria-label="上一页 PDF"
                    disabled={!page}
                    onClick={() => setPage(page - 1)}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  {page + 1} / {pages}
                  <button
                    aria-label="下一页 PDF"
                    disabled={page >= pages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    <ArrowRight size={15} />
                  </button>
                </span>
              )}
            </div>
            <div className={`resume-preview-feedback ${previewState === 'error' ? 'failed' : ''}`}>
              <span aria-live="polite" data-testid="resume-preview-state">
                {previewLabel}
              </span>
              {previewError && (
                <p role="alert">{previewError} 上一次成功的预览仍保留；你的修改尚未丢失。</p>
              )}
            </div>
            {entry.original.fileType === 'pdf' ? (
              <canvas ref={canvas} aria-label="PDF 原页面" />
            ) : (
              <iframe
                ref={frame}
                title="Word 原模板预览"
                sandbox="allow-same-origin allow-modals"
              />
            )}
          </section>
        </div>
      )}
    </main>
  );
}
