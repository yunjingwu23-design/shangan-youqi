"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  MapPin,
  ArrowRight,
  Check,
  Search,
  X,
} from "lucide-react";
import {
  useState,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Job } from "@/lib/data";
import { Button } from "./ui/button";
export function useLocal<T>(key: string, initial: T) {
  const [value, setValueState] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const current = useRef(value);
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          current.current = parsed;
          setValueState(parsed);
        }
        setError("");
      } catch {
        setError("本地数据无法读取，请检查浏览器存储设置。");
      }
    }
    read();
    setReady(true);
    function sync(e: Event) {
      if (e instanceof StorageEvent && e.key !== key && e.key !== null) return;
      if (e instanceof CustomEvent && e.detail !== key) return;
      read();
    }
    window.addEventListener("storage", sync);
    window.addEventListener("sayq:storage", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("sayq:storage", sync);
    };
  }, [key]);
  const setValue: Dispatch<SetStateAction<T>> = (action) => {
    const next =
      typeof action === "function"
        ? (action as (old: T) => T)(current.current)
        : action;
    current.current = next;
    setValueState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError("");
      window.dispatchEvent(new CustomEvent("sayq:storage", { detail: key }));
    } catch {
      setError("保存失败：浏览器存储空间不足或不可用。");
    }
  };
  return { value, setValue, ready, error };
}
export function JobCard({ job }: { job: Job }) {
  const { value: saved, setValue } = useLocal<string[]>("sayq:favorites", []);
  const selected = saved.includes(job.id);
  return (
    <article className="job-card">
      <div className="job-card-top">
        <div className="company-lockup">
          <span
            className="company-mark"
            style={{ color: job.color, background: job.color + "0c" }}
          >
            {job.initials}
          </span>
          <div>
            <b>{job.company}</b>
            <small>
              {job.industry} <span>·</span> {job.department}
            </small>
          </div>
        </div>
        <button
          className={`bookmark ${selected ? "selected" : ""}`}
          aria-label={`${selected ? "取消收藏" : "收藏"}${job.title}`}
          onClick={() =>
            setValue(
              selected
                ? saved.filter((id) => id !== job.id)
                : [...saved, job.id],
            )
          }
        >
          <Bookmark size={18} fill={selected ? "currentColor" : "none"} />
        </button>
      </div>
      <Link href={`/jobs/${job.id}`} className="job-title">
        {job.title} <ArrowUpRight size={18} />
      </Link>
      <div className="job-meta">
        <span>
          <MapPin size={13} />
          {job.city}
        </span>
        <span>{job.year}</span>
        <span>{job.salary}</span>
      </div>
      <div className="tags">
        <span className={job.category === "转正实习" ? "tag tag-green" : "tag"}>
          {job.category}
        </span>
        {job.tags.slice(0, 2).map((t) => (
          <span className="tag tag-light" key={t}>
            {t}
          </span>
        ))}
      </div>
      <div className="job-card-bottom">
        <span>
          <i /> 演示岗位{" "}
          <span className="muted">· {job.date.slice(5)} 更新</span>
        </span>
        <Link
          href={`/jobs/${job.id}`}
          aria-label={`查看${job.company}岗位详情`}
        >
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "没有找到匹配的内容",
  description = "试试调整关键词或筛选条件，下一份机会或许就在这里。",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Search size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function DemoNote({ children }: { children?: React.ReactNode }) {
  return (
    <div className="demo-note">
      <span className="status-dot" />{" "}
      {children ||
        "当前为交互演示，数据仅保存在此浏览器，不代表真实招聘或服务。"}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = dialog.current;
    const selector =
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
    element?.querySelector<HTMLElement>(selector)?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const all = Array.from(
          element?.querySelectorAll<HTMLElement>(selector) || [],
        );
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-shade" onClick={onClose}>
      <section
        ref={dialog}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button aria-label="关闭弹窗" onClick={onClose} className="icon-link">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function CopyButton({
  text,
  label = "复制邮箱",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? (
          <>
            <Check size={14} />
            已复制
          </>
        ) : (
          label
        )}
      </Button>
      {error && (
        <span role="alert" className="error-text">
          无法访问剪贴板，请手动选择复制。
        </span>
      )}
    </>
  );
}
