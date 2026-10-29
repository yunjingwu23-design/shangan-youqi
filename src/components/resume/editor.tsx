"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Download,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Check,
  LockKeyhole,
} from "lucide-react";
import {
  blankResume,
  resumeSchema,
  sectionKinds,
  sectionLabels,
  type Resume,
} from "@/lib/resume/model";
import { loadResumes, putResume, deleteResume } from "@/lib/resume/storage";
import type { LayoutReport } from "@/lib/resume/document";
import { ResumePreview } from "./preview";
import { Button } from "@/components/ui/button";
import { Modal, PageHeading } from "@/components/common";
export function ResumeEditor() {
  const [versions, setVersions] = useState<Resume[]>([]);
  const [current, setCurrent] = useState<Resume | null>(null);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [consent, setConsent] = useState(false);
  const [upload, setUpload] = useState(false);
  const [original, setOriginal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [layout, setLayout] = useState<LayoutReport>({
    pages: 0,
    splits: 0,
    overflow: false,
  });
  const input = useRef<HTMLInputElement>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    let active = true;
    loadResumes()
      .then((values) => {
        if (!active) return;
        setVersions(values);
        setCurrent(values[0] || null);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setError(
            "无法读取本地简历库。请检查浏览器存储设置；为避免覆盖旧数据，暂不保存。",
          );
          setStorageAvailable(false);
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  function update(next: Resume) {
    if (!storageAvailable) return;
    next = { ...next, updatedAt: new Date().toISOString() };
    setCurrent(next);
    setVersions((old) => [next, ...old.filter((v) => v.id !== next.id)]);
    setSaveState("正在保存…");
    const stamp = next.updatedAt + next.id;
    latest.current = stamp;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        await putResume(next);
        if (latest.current === stamp) setSaveState("已私密保存到此浏览器");
      })
      .catch(() => {
        setSaveState("保存失败");
        setError(
          "未能保存简历，可能是浏览器空间不足。请先导出 PDF，避免关闭页面丢失内容。",
        );
      });
  }
  async function session() {
    const r = await fetch("/api/resume/session", { cache: "no-store" });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "无法建立处理会话。");
    return result.csrf as string;
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (!consent) {
      setError("请先确认同意临时解析该文件。");
      return;
    }
    if (!/\.(docx|pdf)$/i.test(file.name) || file.size > 3 * 1024 * 1024) {
      setError("仅支持 3MB 以内的 DOCX 或文字型 PDF。");
      return;
    }
    if (versions.length >= 30) {
      setError("最多保存 30 个版本，请先删除不需要的版本。");
      return;
    }
    setBusy("正在提取文字与识别模块…");
    setError("");
    try {
      const csrf = await session();
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/resume/import", {
        method: "POST",
        headers: { "x-resume-csrf": csrf },
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "导入失败");
      const resume = resumeSchema.parse(body.resume);
      update(resume);
      setUpload(false);
      setNotice(
        "已识别为可编辑模块，请对照原文校对姓名、联系方式、日期和阅读顺序。",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败，请重试。");
    } finally {
      setBusy("");
      if (input.current) input.current.value = "";
    }
  }
  async function exportPDF() {
    if (!current) return;
    setBusy("正在生成文字型 PDF…");
    setError("");
    try {
      await queue.current;
      const csrf = await session();
      const response = await fetch("/api/resume/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-resume-csrf": csrf },
        body: JSON.stringify(current),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "导出失败");
      }
      const blob = await response.blob();
      if (!blob.type.includes("application/pdf"))
        throw new Error("导出结果不是 PDF，请重试。");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = current.name.replace(/[\\/:*?"<>|]/g, "-") + ".pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNotice(
        `已生成 ${response.headers.get("X-Resume-Pages") || ""} 页 PDF，保留可选择与复制的文字。`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败，请重试。");
    } finally {
      setBusy("");
    }
  }
  async function remove() {
    if (!current) return;
    setBusy("正在删除…");
    try {
      await queue.current;
      await deleteResume(current.id);
      const rest = versions.filter((v) => v.id !== current.id);
      setVersions(rest);
      setCurrent(rest[0] || null);
      setConfirmDelete(false);
      setNotice("此版本及其导入原文已从当前浏览器删除。");
    } catch {
      setError("删除失败，请重试。");
    } finally {
      setBusy("");
    }
  }
  const disabled = !!busy || !storageAvailable;
  return (
    <div className="page-width page-section resume-page">
      <PageHeading
        eyebrow="YOUR EXPERIENCE, WELL TOLD"
        title="你的经历，值得被认真看见。"
        description="上传、校对、编辑和导出，把每一段真实经历表达清楚。"
        action={
          <Button
            variant="outline"
            onClick={() => setUpload(true)}
            disabled={disabled || !ready}
          >
            <Upload size={16} />
            导入简历
          </Button>
        }
      />
      <div className="resume-privacy">
        <LockKeyhole size={16} />
        <div>
          <b>私密浏览器工作区</b>
          <span>
            版本仅保存在当前浏览器，不生成公开简历链接、不跨设备同步。导入与导出经本站服务端临时处理，不保存原文件；共享设备请使用后删除。
          </span>
        </div>
      </div>
      {error && (
        <div className="resume-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="关闭错误提示">
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="inline-notice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="关闭简历提示">
            ×
          </button>
        </div>
      )}
      {busy && (
        <div className="resume-processing" role="status">
          {busy} 请勿关闭页面。
        </div>
      )}
      {!ready ? (
        <div className="loading">正在读取私密简历库…</div>
      ) : !current ? (
        <div className="resume-welcome">
          <div className="resume-welcome-icon">
            <FileText size={40} strokeWidth={1} />
          </div>
          <span className="eyebrow">
            FROM YOUR FIRST DRAFT, TO YOUR NEXT CHAPTER
          </span>
          <h2>
            先把简历放进来，
            <br />
            再一起打磨每一行。
          </h2>
          <p>
            支持文字型 DOCX 与 PDF，自动识别教育、经历和技能模块。
            <br />
            左侧编辑，右侧 A4 分页预览，导出真正的文字型 PDF。
          </p>
          <div className="row">
            <Button onClick={() => setUpload(true)} disabled={disabled}>
              <Upload size={16} />
              上传我的简历
            </Button>
            <Button
              variant="outline"
              onClick={() => update(blankResume())}
              disabled={disabled}
            >
              <Plus size={16} />
              从空白开始
            </Button>
          </div>
          <small>
            不提供扫描件 OCR · 不承诺复杂模板无损还原 · 无需 AI 密钥
          </small>
        </div>
      ) : (
        <>
          <div className="resume-version-bar">
            <label>
              当前版本
              <select
                aria-label="切换简历版本"
                value={current.id}
                disabled={!!busy}
                onChange={async (e) => {
                  await queue.current;
                  const next = versions.find((v) => v.id === e.target.value);
                  if (next) {
                    setCurrent(next);
                    setSaveState("已私密保存到此浏览器");
                  }
                }}
              >
                {versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="resume-save" role="status">
              <Check size={13} />
              {saveState || "本地私密版本"}
            </span>
            <div className="resume-version-actions">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || versions.length >= 30}
                onClick={() =>
                  update({
                    ...current,
                    id: crypto.randomUUID(),
                    name: (current.name + " · 副本").slice(0, 100),
                  })
                }
              >
                <Copy size={14} />
                复制版本
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} />
                删除
              </Button>
              <Button
                size="sm"
                disabled={disabled || layout.overflow || layout.pages === 0}
                onClick={exportPDF}
              >
                <Download size={15} />
                导出 PDF
              </Button>
            </div>
          </div>
          <div className="resume-studio">
            <div className="resume-editor-column">
              <div className="resume-edit-heading">
                <h2>模块编辑</h2>
                <span>自动保存 · {versions.length}/30 个版本</span>
              </div>
              <fieldset disabled={disabled}>
                <div className="resume-editor-block">
                  <label>
                    版本名称
                    <input
                      aria-label="简历版本名称"
                      value={current.name}
                      maxLength={100}
                      onChange={(e) =>
                        update({ ...current, name: e.target.value })
                      }
                    />
                  </label>
                  <div className="resume-source-label">
                    {current.source.filename
                      ? `来源：${current.source.filename}`
                      : "手动创建"}
                    {current.source.originalText && (
                      <button type="button" onClick={() => setOriginal(true)}>
                        对照导入原文
                      </button>
                    )}
                  </div>
                </div>
                <div className="resume-editor-block">
                  <h3>个人信息</h3>
                  <label>
                    姓名
                    <input
                      aria-label="简历姓名"
                      maxLength={100}
                      value={current.personal.name}
                      onChange={(e) =>
                        update({
                          ...current,
                          personal: {
                            ...current.personal,
                            name: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    求职意向 / 一句话介绍
                    <input
                      maxLength={200}
                      aria-label="求职意向"
                      value={current.personal.headline}
                      onChange={(e) =>
                        update({
                          ...current,
                          personal: {
                            ...current.personal,
                            headline: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    联系方式（可换行，自行核对）
                    <textarea
                      aria-label="简历联系方式"
                      rows={3}
                      maxLength={2000}
                      value={current.personal.contact}
                      onChange={(e) =>
                        update({
                          ...current,
                          personal: {
                            ...current.personal,
                            contact: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
                {current.sections.map((section, index) => (
                  <div className="resume-editor-block" key={section.id}>
                    <div className="resume-section-header">
                      <span>
                        {String(index + 1).padStart(2, "0")} /{" "}
                        {sectionLabels[section.kind]}
                      </span>
                      <div>
                        <button
                          aria-label={`上移${section.title}`}
                          disabled={index === 0}
                          onClick={() => {
                            const sections = [...current.sections];
                            [sections[index - 1], sections[index]] = [
                              sections[index],
                              sections[index - 1],
                            ];
                            update({ ...current, sections });
                          }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          aria-label={`下移${section.title}`}
                          disabled={index === current.sections.length - 1}
                          onClick={() => {
                            const sections = [...current.sections];
                            [sections[index + 1], sections[index]] = [
                              sections[index],
                              sections[index + 1],
                            ];
                            update({ ...current, sections });
                          }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          aria-label={`删除模块${section.title}`}
                          onClick={() => {
                            if (confirm(`删除“${section.title}”模块及其内容？`))
                              update({
                                ...current,
                                sections: current.sections.filter(
                                  (s) => s.id !== section.id,
                                ),
                              });
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <label>
                      模块标题
                      <input
                        aria-label={`模块标题${index + 1}`}
                        maxLength={100}
                        value={section.title}
                        onChange={(e) =>
                          update({
                            ...current,
                            sections: current.sections.map((s) =>
                              s.id === section.id
                                ? { ...s, title: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      日期 / 时间范围（可选）
                      <input
                        aria-label={`模块日期${index + 1}`}
                        value={section.period}
                        maxLength={120}
                        placeholder="例如：2025.06 – 2025.09"
                        onChange={(e) =>
                          update({
                            ...current,
                            sections: current.sections.map((s) =>
                              s.id === section.id
                                ? { ...s, period: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      内容（保留真实经历，可直接修改其中的日期）
                      <textarea
                        aria-label={`模块内容${index + 1}`}
                        rows={Math.min(
                          12,
                          Math.max(4, section.content.split("\n").length + 1),
                        )}
                        maxLength={18000}
                        value={section.content}
                        onChange={(e) =>
                          update({
                            ...current,
                            sections: current.sections.map((s) =>
                              s.id === section.id
                                ? { ...s, content: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
                <label className="resume-add-section">
                  新增模块
                  <select
                    aria-label="新增简历模块"
                    value=""
                    disabled={current.sections.length >= 30}
                    onChange={(e) => {
                      const kind = e.target
                        .value as (typeof sectionKinds)[number];
                      if (!kind) return;
                      update({
                        ...current,
                        sections: [
                          ...current.sections,
                          {
                            id: crypto.randomUUID(),
                            kind,
                            title: sectionLabels[kind],
                            period: "",
                            content: "",
                          },
                        ],
                      });
                    }}
                  >
                    <option value="">＋ 选择模块类型</option>
                    {sectionKinds.map((k) => (
                      <option value={k} key={k}>
                        {sectionLabels[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
            </div>
            <div className="resume-preview-column">
              <div className="resume-layout-controls">
                <h2>实时预览</h2>
                <div>
                  <label>
                    字体
                    <select
                      aria-label="简历字体"
                      disabled={disabled}
                      value={current.style.font}
                      onChange={(e) =>
                        update({
                          ...current,
                          style: {
                            ...current.style,
                            font: e.target.value as "sans" | "serif",
                          },
                        })
                      }
                    >
                      <option value="sans">思源黑体</option>
                      <option value="serif">思源宋体</option>
                    </select>
                  </label>
                  {(
                    [
                      ["fontSize", "字号", 9, 15, 0.5],
                      ["lineHeight", "行距", 1.2, 2, 0.05],
                      ["sectionGap", "段距", 6, 28, 1],
                      ["margin", "页边距", 12, 26, 1],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="number"
                        aria-label={`简历${label}`}
                        min={min}
                        max={max}
                        step={step}
                        disabled={disabled}
                        value={current.style[key]}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n >= min && n <= max)
                            update({
                              ...current,
                              style: { ...current.style, [key]: n },
                            });
                        }}
                      />
                      {key === "margin" && <small>mm</small>}
                    </label>
                  ))}
                </div>
              </div>
              <div
                className={`resume-layout-status ${layout.overflow ? "has-overflow" : ""}`}
                role="status"
              >
                {layout.error
                  ? layout.error
                  : layout.pages === 0
                    ? "正在重新排版…"
                    : layout.overflow
                      ? "检测到文字溢出或超过 20 页，已禁用导出。请调整字号、间距或拆分内容。"
                      : `${layout.pages} 页 A4 · ${layout.splits ? `${layout.splits} 处长段落已自动跨页，请检查分页` : "未检测到溢出"} · 导出保留文字层`}
              </div>
              <ResumePreview resume={current} onLayout={setLayout} />
              <div className="resume-template-warning">
                <b>关于原模板</b>
                {current.source.warnings.length ? (
                  current.source.warnings.map((w, i) => <p key={i}>{w}</p>)
                ) : (
                  <p>使用平台标准 A4 模板。请在导出前校对内容与分页。</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="resume-ai-note">
        <span>下一步：AI 简历优化与 JD 匹配</span>
        <p>
          接口已预留，尚未接入。当前不会调用 OpenAI，也不会自动编造或改写经历。
        </p>
      </div>
      {upload && (
        <Modal
          title="导入简历，开始编辑"
          onClose={() => {
            if (!busy) setUpload(false);
          }}
        >
          <div className="resume-upload-dialog">
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            {busy && <p role="status">{busy}</p>}
            <div className="resume-upload-drop">
              <Upload size={30} strokeWidth={1.5} />
              <h3>DOCX 或文字型 PDF</h3>
              <p>最大 3MB · PDF 最多 12 页 · 不支持扫描件 OCR</p>
              <label className="resume-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={!!busy}
                />
                我同意将文件发送至本站临时解析；原文件不保存，识别结果仅存于当前浏览器。
              </label>
              <input
                ref={input}
                type="file"
                aria-label="选择简历文件"
                accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                disabled={!consent || !!busy}
                onChange={(e) => importFile(e.target.files?.[0])}
              />
            </div>
            <p>
              复杂表格、多栏、页眉页脚、照片和精细排版可能发生变化。导入后请对照原文检查，不承诺无损编辑。
            </p>
          </div>
        </Modal>
      )}
      {original && current && (
        <Modal title="对照提取原文" onClose={() => setOriginal(false)}>
          <p>这是提取后的原文，不是原始文件的版式。请在本地文档查看原模板。</p>
          <pre className="resume-original">{current.source.originalText}</pre>
        </Modal>
      )}
      {confirmDelete && current && (
        <Modal
          title={`删除“${current.name}”？`}
          onClose={() => setConfirmDelete(false)}
        >
          <p>会删除此版本、识别原文和修改内容；其他版本保留。操作无法撤销。</p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              保留
            </Button>
            <Button onClick={remove} disabled={!!busy}>
              确认删除简历
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
