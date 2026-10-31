'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Save, Printer, ArrowUp, ArrowDown, Trash2, Copy, FileText } from 'lucide-react';
import { useDraftStorage } from '@/components/drafts';
import { emptyResume, type ResumeDocument } from '@/lib/resume';
type Summary = { id: string; title: string; company: string; updated_at: string };
export function ResumeStudio({ email }: { email: string }) {
  const router = useRouter(),
    params = useSearchParams();
  const mounted = useRef(true);
  const [initialLoading, setInitialLoading] = useState(Boolean(params.get('id')));
  const [document, setDocument] = useState<ResumeDocument>(() => emptyResume('', email)),
    [title, setTitle] = useState('我的求职简历'),
    [company, setCompany] = useState(''),
    [id, setId] = useState<string | undefined>(),
    [updatedAt, setUpdatedAt] = useState<string | undefined>(),
    [items, setItems] = useState<Summary[]>([]),
    [nextOffset, setNextOffset] = useState<number | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const temporary = useDraftStorage<{
    document: ResumeDocument;
    title: string;
    company: string;
    id?: string;
    updatedAt?: string;
    saved?: boolean;
  }>('resume:current');
  const ready = useRef(false);
  useEffect(() => {
    if (ready.current && dirty) temporary.write({ document, title, company, id, updatedAt });
  }, [document, title, company, id, updatedAt, dirty]);
  async function request(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(path, {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (response.status === 401) {
      router.push('/login?next=%2Fresume');
      throw new Error('请重新登录后保存。');
    }
    if (!response.ok) throw new Error(data.error || '简历操作失败，请重试。');
    return data;
  }
  async function list(offset = 0) {
    const data = await request(`/api/resumes?offset=${offset}`);
    if (!mounted.current) return;
    setItems((old) => (offset ? [...old, ...data.resumes] : data.resumes));
    setNextOffset(data.nextOffset);
  }
  async function load(value: string, syncUrl = true) {
    if (dirty && !window.confirm('有尚未保存的修改，仍要切换简历吗？')) return;
    setBusy(true);
    setError('');
    try {
      const data = await request(`/api/resumes?id=${value}`);
      if (!mounted.current) return;
      setId(data.resume.id);
      setUpdatedAt(data.resume.updated_at);
      setTitle(data.resume.title);
      setCompany(data.resume.company);
      setDocument(data.resume.document);
      setDirty(false);
      if (syncUrl) window.history.replaceState(null, '', `/resume?id=${data.resume.id}`);
      setNotice(
        data.resume.legacy ? '已载入原有文字草稿，保存时会转换为分块简历。' : '已载入云端简历。'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败。');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void list().catch((e) => setError(e.message));
    const initial = params.get('id'),
      pending = temporary.read();
    if (
      pending &&
      (!initial || pending.id === initial) &&
      pending.document?.format === 'shangan-resume-v1' &&
      Array.isArray(pending.document.sections) &&
      typeof pending.document.basics?.name === 'string'
    ) {
      setDocument(pending.document);
      setTitle(pending.title);
      setCompany(pending.company);
      setId(pending.id);
      setUpdatedAt(pending.updatedAt);
      setDirty(!pending.saved);
      setNotice(
        pending.saved
          ? '已恢复当前标签页的已保存简历版本。'
          : '已恢复当前标签页中尚未保存的简历修改。'
      );
      ready.current = true;
      setInitialLoading(false);
    } else if (initial)
      void load(initial, false).finally(() => {
        ready.current = true;
        if (mounted.current) setInitialLoading(false);
      });
    else {
      ready.current = true;
      setInitialLoading(false);
    }
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(next: ResumeDocument) {
    setDocument(next);
    setDirty(true);
    setNotice('');
  }
  async function save(asNew = false) {
    setBusy(true);
    setError('');
    try {
      const data = await request('/api/resumes', 'POST', {
        ...(!asNew && id ? { id, expectedUpdatedAt: updatedAt } : {}),
        title: asNew ? `${title.slice(0, 110)} · 新版本` : title,
        company,
        document,
      });
      if (!mounted.current || window.location.pathname !== '/resume') {
        temporary.write({
          document,
          title: data.resume.title,
          company,
          id: data.resume.id,
          updatedAt: data.resume.updated_at,
          saved: true,
        });
        return;
      }
      setId(data.resume.id);
      setUpdatedAt(data.resume.updated_at);
      setTitle(data.resume.title);
      setDirty(false);
      temporary.clear();
      setNotice(asNew ? '已另存为新的简历版本。' : '简历已保存到个人工作台。');
      window.history.replaceState(null, '', `/resume?id=${data.resume.id}`);
      await list();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, direction: number) {
    const sections = [...document.sections];
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    change({ ...document, sections });
  }
  async function removeVersion() {
    if (
      !id ||
      !window.confirm(`永久删除简历「${title}」？该版本及其未保存修改会被删除，其他版本保留。`)
    )
      return;
    setBusy(true);
    setError('');
    try {
      await request('/api/entries', 'DELETE', { id });
      temporary.clear();
      if (!mounted.current || window.location.pathname !== '/resume') return;
      setId(undefined);
      setUpdatedAt(undefined);
      setTitle('我的求职简历');
      setCompany('');
      setDocument(emptyResume('', email));
      setDirty(false);
      window.history.replaceState(null, '', '/resume');
      setNotice('当前简历版本已删除，其他版本保持不变。');
      await list();
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  if (initialLoading)
    return (
      <main className="site-main resume-page">
        <div className="site-page-title">
          <h1>简历编辑工作室</h1>
        </div>
        <section className="site-card" role="status">
          正在载入你的简历版本…
        </section>
      </main>
    );
  return (
    <main className="site-main resume-page">
      <div className="site-page-title resume-toolbar">
        <div>
          <p className="site-eyebrow">MAKE YOUR EXPERIENCE CLEAR</p>
          <h1>简历编辑工作室</h1>
          <p>写清真实经历，为不同岗位保留自己的版本。</p>
        </div>
        <div className="site-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (dirty && !window.confirm('新建会放弃未保存的修改，是否继续？')) return;
              temporary.clear();
              window.history.replaceState(null, '', '/resume');
              setId(undefined);
              setUpdatedAt(undefined);
              setTitle('我的求职简历');
              setCompany('');
              setDocument(emptyResume('', email));
              setDirty(false);
              setNotice('已新建空白简历。');
            }}
          >
            <Plus size={16} />
            新建简历
          </button>
          <button className="button secondary" disabled={busy} onClick={() => window.print()}>
            <Printer size={16} />
            打印 / 导出 PDF
          </button>
          <button className="button primary" disabled={busy} onClick={() => void save()}>
            <Save size={16} />
            保存简历
          </button>
          <button
            className="button secondary site-danger"
            disabled={busy || !id}
            onClick={() => void removeVersion()}
          >
            <Trash2 size={16} />
            删除当前版本
          </button>
        </div>
      </div>
      <div className="site-notice">
        当前支持文字分块编辑、A4 预览与 PDF 导出。DOCX / 文字型 PDF 文件导入和保真编辑正在开发中。
        <br />
        未保存的修改会在当前标签页临时保留；保存到账号后可跨设备继续编辑。
      </div>
      <fieldset className="resume-interactive" disabled={busy}>
        <div className="resume-controls">
          <label>
            我的简历版本
            <select
              aria-label="选择简历版本"
              value={id || ''}
              disabled={busy}
              onChange={(e) => {
                if (e.target.value) void load(e.target.value);
              }}
            >
              <option value="">当前未保存草稿</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                  {item.company ? ` · ${item.company}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            简历标题
            <input
              value={title}
              maxLength={120}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <label>
            目标公司（选填）
            <input
              value={company}
              maxLength={100}
              onChange={(e) => {
                setCompany(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <button className="button secondary" disabled={busy} onClick={() => void save(true)}>
            <Copy size={16} />
            另存新版本
          </button>
          {nextOffset !== null && (
            <button
              className="site-text-link"
              onClick={() => void list(nextOffset).catch((e) => setError(e.message))}
            >
              加载更多版本
            </button>
          )}
        </div>
        <div className="resume-status">
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
          {dirty && <p className="muted">有未保存的修改。保存后可在其他设备登录继续编辑。</p>}
          <p className="muted">
            当前支持手动分块编辑与浏览器 PDF 导出。自动文件解析、AI
            改写尚未开放；可将现有简历文字粘贴到对应模块。
          </p>
        </div>
        <div className="resume-workbench">
          <section className="resume-editor">
            <div className="site-card">
              <h2>基本信息</h2>
              <div className="resume-basics">
                {[
                  { key: 'name', label: '姓名', max: 60 },
                  { key: 'headline', label: '求职意向', max: 100 },
                  { key: 'email', label: '联系邮箱', max: 254 },
                  { key: 'phone', label: '联系电话', max: 50 },
                  { key: 'city', label: '所在城市', max: 60 },
                  { key: 'links', label: '作品集 / 个人链接', max: 300 },
                ].map(({ key, label, max }) => (
                  <label key={key}>
                    {label}
                    <input
                      value={document.basics[key as keyof ResumeDocument['basics']]}
                      maxLength={max}
                      onChange={(e) =>
                        change({
                          ...document,
                          basics: { ...document.basics, [key]: e.target.value },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
            {document.sections.map((section, index) => (
              <section className="site-card resume-section-editor" key={section.id}>
                <div className="resume-section-tools">
                  <label>
                    模块名称
                    <input
                      aria-label={`模块 ${index + 1} 名称`}
                      value={section.title}
                      maxLength={60}
                      onChange={(e) =>
                        change({
                          ...document,
                          sections: document.sections.map((s, i) =>
                            i === index ? { ...s, title: e.target.value } : s
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    aria-label={`上移模块 ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    aria-label={`下移模块 ${index + 1}`}
                    disabled={index === document.sections.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    aria-label={`删除模块 ${index + 1}`}
                    disabled={document.sections.length === 1}
                    onClick={() =>
                      change({
                        ...document,
                        sections: document.sections.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <textarea
                  aria-label={`${section.title}内容`}
                  rows={7}
                  value={section.body}
                  maxLength={5000}
                  onChange={(e) =>
                    change({
                      ...document,
                      sections: document.sections.map((s, i) =>
                        i === index ? { ...s, body: e.target.value } : s
                      ),
                    })
                  }
                  placeholder="填写真实经历：背景、负责的任务、采取的行动与可核实的结果。"
                />
              </section>
            ))}
            <button
              className="button secondary"
              disabled={document.sections.length >= 12}
              onClick={() =>
                change({
                  ...document,
                  sections: [
                    ...document.sections,
                    { id: crypto.randomUUID(), title: '补充经历', body: '' },
                  ],
                })
              }
            >
              <Plus size={16} />
              添加模块
            </button>
          </section>
          <section className="resume-preview-panel" aria-label="简历预览">
            <div className="resume-preview-label">
              <FileText size={16} /> A4 排版预览
            </div>
            <article className="resume-preview">
              <header>
                <h2>{document.basics.name || '你的姓名'}</h2>
                {document.basics.headline && (
                  <p className="resume-headline">{document.basics.headline}</p>
                )}
                <p className="resume-contact">
                  {[document.basics.city, document.basics.phone, document.basics.email]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {document.basics.links && <p className="resume-contact">{document.basics.links}</p>}
              </header>
              {document.sections
                .filter((s) => s.body.trim())
                .map((section) => (
                  <section key={section.id}>
                    <h3>{section.title}</h3>
                    <p>{section.body}</p>
                  </section>
                ))}
              {document.sections.every((s) => !s.body.trim()) && (
                <p className="resume-preview-empty">从左侧填写经历，这里会同步展示排版。</p>
              )}
            </article>
          </section>
        </div>
      </fieldset>
    </main>
  );
}
