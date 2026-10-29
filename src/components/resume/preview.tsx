"use client";
import { useEffect, useRef, useState } from "react";
import { resumeHtml, type LayoutReport } from "@/lib/resume/document";
import { selectFontFaces, fontFaceCSS } from "@/lib/resume/fonts";
import type { Resume } from "@/lib/resume/model";
const fonts = new Map<string, Promise<string>>();
function loadFile(file: string) {
  if (!fonts.has(file))
    fonts.set(
      file,
      fetch(`/fonts/${file}`)
        .then(async (r) => {
          if (!r.ok) throw new Error("字体加载失败");
          const bytes = new Uint8Array(await r.arrayBuffer());
          let binary = "";
          for (let i = 0; i < bytes.length; i += 16384)
            binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
          return btoa(binary);
        })
        .catch((e) => {
          fonts.delete(file);
          throw e;
        }),
    );
  return fonts.get(file)!;
}
async function loadFont(resume: Resume) {
  return (
    await Promise.all(
      selectFontFaces(resume).map(async (face) =>
        fontFaceCSS(face, await loadFile(face.file)),
      ),
    )
  ).join("");
}
export function ResumePreview({
  resume,
  onLayout,
}: {
  resume: Resume;
  onLayout: (layout: LayoutReport) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onLayout);
  callback.current = onLayout;
  const [font, setFont] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const requiredKey =
    resume.style.font +
    ":" +
    selectFontFaces(resume)
      .map((face) => face.file)
      .join(",");
  const [fontError, setFontError] = useState("");
  const [scale, setScale] = useState(0.65);
  const [pages, setPages] = useState(1);
  const [html, setHtml] = useState("");
  const nonce = useRef("");
  useEffect(() => {
    let active = true;
    setFontError("");
    loadFont(resume)
      .then((s) => {
        if (active) {
          setFont(s);
          setLoadedKey(requiredKey);
        }
      })
      .catch(() => {
        if (active) {
          setFontError("字体加载失败，请刷新重试。");
          callback.current({
            pages: 0,
            splits: 0,
            overflow: true,
            error: "字体加载失败",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [requiredKey]);
  useEffect(() => {
    if (!font || loadedKey !== requiredKey) {
      nonce.current = "";
      callback.current({ pages: 0, splits: 0, overflow: false });
      return;
    }
    nonce.current = crypto.randomUUID().replaceAll("-", "");
    setHtml(resumeHtml(resume, font, nonce.current));
    callback.current({ pages: 0, splits: 0, overflow: false });
  }, [resume, font, loadedKey, requiredKey]);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setScale(
        Math.min(1, Math.max(0.2, (entries[0].contentRect.width - 24) / 794)),
      ),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "sayq-resume-layout" ||
        event.data?.nonce !== nonce.current
      )
        return;
      setPages(Math.max(1, event.data.pages));
      callback.current({
        pages: event.data.pages,
        splits: event.data.splits,
        overflow: event.data.overflow,
        error: event.data.error,
      });
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <div ref={host} className="resume-preview-host">
      <div className="resume-preview-meta">
        <span>A4 · 210 × 297 mm</span>
        <span>{Math.round(scale * 100)}% 自适应</span>
      </div>
      {fontError ? (
        <p role="alert" className="error-text">
          {fontError}
        </p>
      ) : !font || !html || loadedKey !== requiredKey ? (
        <div className="resume-preview-loading">正在加载中英文字体与排版…</div>
      ) : (
        <div className="resume-preview-scroll">
          <div
            style={{
              height: (1123 * pages + 20 * (pages - 1)) * scale,
              width: 794 * scale,
              margin: "0 auto",
            }}
          >
            <iframe
              key={nonce.current}
              ref={frame}
              title="简历 A4 分页实时预览"
              sandbox="allow-scripts"
              srcDoc={html}
              style={{
                width: 794,
                height: 1123 * pages + 20 * (pages - 1),
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: 0,
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
