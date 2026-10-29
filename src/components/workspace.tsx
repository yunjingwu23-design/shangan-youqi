"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  Columns3,
  CalendarDays,
  Trash2,
  Copy,
  Check,
  ArrowUpRight,
  Download,
  Settings2,
  ChevronDown,
  X,
} from "lucide-react";
import { categories } from "@/lib/data";
import {
  initialWorkspace,
  newApplication,
  removeStatus,
  type Application,
  type WorkspaceData,
} from "@/lib/workspace";
import { useLocal, DemoNote, Modal, Empty } from "./common";
import { Button } from "./ui/button";
const fields: [keyof Application, string, string][] = [
  ["company", "公司", "text"],
  ["role", "岗位名称", "text"],
  ["category", "招聘类型", "category"],
  ["city", "工作城市", "text"],
  ["channel", "投递渠道", "text"],
  ["appliedAt", "投递日期", "date"],
  ["status", "当前状态", "status"],
  ["nextAt", "下一步日期", "date"],
  ["deadline", "截止时间", "date"],
  ["resume", "简历版本", "text"],
  ["jdUrl", "JD 链接", "text"],
  ["email", "投递邮箱", "text"],
  ["notes", "备注", "text"],
];
export function Workspace() {
  const {
    value: data,
    setValue,
    ready,
    error,
  } = useLocal<WorkspaceData>("sayq:workspace", initialWorkspace);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("none");
  const [settings, setSettings] = useState(false);
  const [manageStatus, setManageStatus] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState("table");
  const [hidden, setHidden] = useState<string[]>([]);
  const [columns, setColumns] = useState(false);
  const [statusName, setStatusName] = useState("");
  const [notice, setNotice] = useState("");
  const [coverError, setCoverError] = useState("");
  function update(id: string, key: keyof Application, value: string) {
    setValue({
      ...data,
      records: data.records.map((r) =>
        r.id === id ? { ...r, [key]: value } : r,
      ),
    });
  }
  const records = data.records
    .filter(
      (r) =>
        (!q ||
          [r.company, r.role, r.city, r.notes].some((s) =>
            s.toLowerCase().includes(q.toLowerCase()),
          )) &&
        (statusFilter === "all" || r.status === statusFilter),
    )
    .sort((a, b) =>
      sort === "company"
        ? a.company.localeCompare(b.company, "zh-CN")
        : sort === "next"
          ? a.nextAt.localeCompare(b.nextAt)
          : 0,
    );
  const counts = [
    ["全部投递", data.records.length],
    [
      "面试进行中",
      data.records.filter((r) => ["s3", "s4", "s5", "s6"].includes(r.status))
        .length,
    ],
    ["收获 Offer", data.records.filter((r) => r.status === "s7").length],
  ];
  function add() {
    const row = newApplication();
    setValue({ ...data, records: [...data.records, row] });
    setNotice("已新增一行，直接点击单元格填写。");
  }
  function exportCSV() {
    const keys = fields.map((f) => f[0]);
    const csv =
      "\uFEFF" +
      [
        fields.map((f) => f[1]),
        ...data.records.map((r) =>
          keys.map((k) =>
            k === "status"
              ? data.statuses.find((s) => s.id === r.status)?.label || ""
              : r[k] || "",
          ),
        ),
      ]
        .map((row) =>
          row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "上岸有期-投递记录.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  function imageUpload(file: File | undefined) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setCoverError("请选择不超过 2MB 的 PNG、JPEG 或 WebP 图片。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue({ ...data, cover: reader.result as string });
      setCoverError("");
    };
    reader.readAsDataURL(file);
  }
  return (
    <div
      className="workspace-page"
      style={{ "--workspace-accent": data.theme } as CSSProperties}
    >
      <div
        className={`workspace-cover cover-${data.cover.startsWith("data:") ? "image" : data.cover}`}
        style={
          data.cover.startsWith("data:")
            ? { backgroundImage: `url(${data.cover})` }
            : undefined
        }
      >
        <div className="page-width">
          <span>YOUR EFFORTS, ALL IN ONE PLACE</span>
          <button onClick={() => setSettings(true)}>
            <Settings2 size={14} />
            个性化工作台
          </button>
        </div>
      </div>
      <div className="page-width workspace-body">
        <div className="workspace-heading">
          <div>
            <span className="workspace-avatar">
              <Table2 size={25} />
            </span>
            <input
              className="workspace-name"
              aria-label="工作台名称"
              value={data.name}
              maxLength={40}
              onChange={(e) => setValue({ ...data, name: e.target.value })}
            />
            <p>不慌不忙，按自己的节奏向前。</p>
          </div>
          <div className="workspace-save" role="status">
            {error ? (
              <span className="error-text">{error}</span>
            ) : (
              <>
                <Check size={14} />
                {ready ? "已保存到此浏览器" : "正在读取…"}
              </>
            )}
            <button onClick={exportCSV} aria-label="导出 CSV">
              <Download size={17} />
            </button>
          </div>
        </div>
        <DemoNote>
          本地演示工作台 ·
          不是真实登录，不支持跨设备同步。请勿在共享设备录入敏感信息。
        </DemoNote>
        <div className="workspace-stat-row">
          {counts.map(([title, count], i) => (
            <div key={title}>
              <span>{title}</span>
              <strong>{String(count).padStart(2, "0")}</strong>
              <small>
                {
                  [
                    "每一份机会，都值得被记录",
                    "把准备做在下一轮之前",
                    "让努力，慢慢有回响",
                  ][i]
                }
              </small>
            </div>
          ))}
        </div>
        <div className="workspace-toolbar">
          <div className="view-tabs">
            {[
              ["table", "表格", Table2],
              ["board", "看板", Columns3],
              ["calendar", "日历", CalendarDays],
            ].map(([key, label, Icon]) => {
              const I = Icon as typeof Table2;
              return (
                <button
                  key={key as string}
                  className={view === key ? "active" : ""}
                  onClick={() => setView(key as string)}
                >
                  <I size={15} />
                  {label as string}
                  {key !== "table" && <small>预览</small>}
                </button>
              );
            })}
          </div>
          <div className="workspace-tools">
            <button onClick={() => setManageStatus(true)}>
              <SlidersHorizontal size={14} />
              管理状态
            </button>
            <button onClick={() => setColumns(true)}>
              <Columns3 size={14} />
              显示列
            </button>
            <Button size="sm" onClick={add}>
              <Plus size={15} />
              新增记录
            </Button>
          </div>
        </div>
        <div className="table-filters">
          <label>
            <Search size={15} />
            <input
              aria-label="搜索投递记录"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索公司、岗位、备注…"
            />
          </label>
          <select
            aria-label="筛选投递状态"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            {data.statuses.map((s) => (
              <option value={s.id} key={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            aria-label="投递记录排序"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="none">默认排序</option>
            <option value="company">按公司排序</option>
            <option value="next">按下一步日期</option>
          </select>
          <span>{records.length} 条记录</span>
        </div>
        {notice && (
          <div className="inline-notice" role="status">
            {notice}
            <button aria-label="关闭提示" onClick={() => setNotice("")}>
              <X size={14} />
            </button>
          </div>
        )}
        {view === "table" ? (
          <div className="table-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th className="row-number">#</th>
                  {fields
                    .filter(([key]) => !hidden.includes(key))
                    .map(([key, label]) => (
                      <th
                        key={key}
                        className={
                          key === "company"
                            ? "freeze-company"
                            : key === "role"
                              ? "freeze-role"
                              : ""
                        }
                      >
                        {label}
                        <ChevronDown size={10} />
                      </th>
                    ))}
                  <th>面试复盘</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id}>
                    <td className="row-number">{i + 1}</td>
                    {fields
                      .filter(([key]) => !hidden.includes(key))
                      .map(([key, label, type]) => (
                        <td
                          key={key}
                          className={
                            key === "company"
                              ? "freeze-company"
                              : key === "role"
                                ? "freeze-role"
                                : ""
                          }
                        >
                          {type === "status" ? (
                            <select
                              aria-label={`${r.company || "新记录"}当前状态`}
                              className="status-select"
                              style={{
                                color: data.statuses.find(
                                  (s) => s.id === r.status,
                                )?.color,
                                background:
                                  (data.statuses.find((s) => s.id === r.status)
                                    ?.color || "#777777") + "14",
                              }}
                              value={r.status}
                              onChange={(e) =>
                                update(r.id, key, e.target.value)
                              }
                            >
                              {data.statuses.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          ) : type === "category" ? (
                            <select
                              aria-label={`${r.company || "新记录"}招聘类型`}
                              value={r.category}
                              onChange={(e) =>
                                update(r.id, key, e.target.value)
                              }
                            >
                              {categories.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={type === "date" ? "date" : "text"}
                              aria-label={`第${i + 1}行${label}`}
                              value={r[key] || ""}
                              placeholder={
                                key === "company"
                                  ? "输入公司"
                                  : key === "role"
                                    ? "输入岗位"
                                    : "—"
                              }
                              onChange={(e) =>
                                update(r.id, key, e.target.value)
                              }
                            />
                          )}
                        </td>
                      ))}
                    <td>
                      <Link
                        href={`/review?application=${r.id}`}
                        className="table-link"
                      >
                        创建复盘 <ArrowUpRight size={12} />
                      </Link>
                    </td>
                    <td className="row-actions">
                      <button
                        aria-label={`复制第${i + 1}行`}
                        onClick={() =>
                          setValue({
                            ...data,
                            records: [
                              ...data.records,
                              { ...r, id: crypto.randomUUID() },
                            ],
                          })
                        }
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        aria-label={`删除第${i + 1}行`}
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-table-row" onClick={add}>
              <Plus size={15} />
              新增一行
            </button>
          </div>
        ) : view === "board" ? (
          <div className="kanban">
            {data.statuses.map((s) => (
              <div className="kanban-column" key={s.id}>
                <h3 style={{ color: s.color }}>
                  <i style={{ background: s.color }} />
                  {s.label}
                  <span>{records.filter((r) => r.status === s.id).length}</span>
                </h3>
                {records
                  .filter((r) => r.status === s.id)
                  .map((r) => (
                    <div className="kanban-card" key={r.id}>
                      <b>{r.company || "未命名公司"}</b>
                      <p>{r.role || "未填写岗位"}</p>
                      <small>
                        {r.city} · {r.nextAt || "待安排"}
                      </small>
                      <select
                        aria-label={`${r.company}看板状态`}
                        value={r.status}
                        onChange={(e) => update(r.id, "status", e.target.value)}
                      >
                        {data.statuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="panel">
            <h3>下一步日程 · 工作台演示</h3>
            {records
              .filter((r) => r.nextAt)
              .sort((a, b) => a.nextAt.localeCompare(b.nextAt))
              .map((r) => (
                <div className="calendar-event" key={r.id}>
                  <CalendarDays size={18} />
                  <b>{r.nextAt}</b>
                  <span>
                    {r.company} · {r.role}
                  </span>
                </div>
              ))}
            {!records.some((r) => r.nextAt) && (
              <Empty
                title="还没有安排下一步"
                description="在表格中填写下一步日期，日程会显示在这里。"
              />
            )}
          </div>
        )}
        {!records.length && view === "table" && (
          <Empty
            title="为下一份机会，留个位置"
            description="新增一条记录，或从岗位广场加入你感兴趣的机会。"
            action={
              <Button variant="outline" onClick={add}>
                新增记录
              </Button>
            }
          />
        )}
        <div className="workspace-bottom">
          <span>本地自动保存 · 支持横向滚动 · 公司与岗位列冻结</span>
          <Link href="/jobs">
            再发现一个机会 <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      {settings && (
        <Modal title="让工作台，更像你" onClose={() => setSettings(false)}>
          <div className="form-stack">
            <label>
              工作台名称
              <input
                value={data.name}
                onChange={(e) => setValue({ ...data, name: e.target.value })}
                maxLength={40}
              />
            </label>
            <label>
              主题颜色
              <input
                type="color"
                aria-label="主题颜色"
                value={data.theme}
                onChange={(e) => setValue({ ...data, theme: e.target.value })}
              />
            </label>
            <label>
              内置封面
              <select
                value={data.cover.startsWith("data:") ? "custom" : data.cover}
                onChange={(e) => setValue({ ...data, cover: e.target.value })}
              >
                <option value="sage">鼠尾草绿</option>
                <option value="sand">暖沙白</option>
                <option value="lavender">雾紫</option>
                {data.cover.startsWith("data:") && (
                  <option value="custom">自定义图片</option>
                )}
              </select>
            </label>
            <label>
              上传封面（本地，最大 2MB）
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => imageUpload(e.target.files?.[0])}
              />
            </label>
            {coverError && (
              <p role="alert" className="error-text">
                {coverError}
              </p>
            )}
            <Button
              variant="outline"
              onClick={() =>
                setValue({ ...data, cover: "sage", theme: "#506950" })
              }
            >
              恢复默认封面与主题
            </Button>
            <p className="muted">更改自动保存，仅影响你的本地工作台。</p>
          </div>
        </Modal>
      )}
      {manageStatus && (
        <Modal title="自定义投递状态" onClose={() => setManageStatus(false)}>
          <p className="muted">
            名称与颜色均可修改。删除状态后，相关记录会移至第一个保留状态。
          </p>
          <div className="status-editor">
            {data.statuses.map((s) => (
              <div key={s.id}>
                <input
                  type="color"
                  aria-label={`${s.label}颜色`}
                  value={s.color}
                  onChange={(e) =>
                    setValue({
                      ...data,
                      statuses: data.statuses.map((t) =>
                        t.id === s.id ? { ...t, color: e.target.value } : t,
                      ),
                    })
                  }
                />
                <input
                  aria-label={`${s.label}状态名称`}
                  value={s.label}
                  maxLength={20}
                  onChange={(e) =>
                    setValue({
                      ...data,
                      statuses: data.statuses.map((t) =>
                        t.id === s.id ? { ...t, label: e.target.value } : t,
                      ),
                    })
                  }
                />
                <button
                  className="icon-link"
                  aria-label={`删除状态${s.label}`}
                  disabled={data.statuses.length <= 1}
                  onClick={() => {
                    if (
                      confirm(
                        `删除状态“${s.label}”？相关记录会移至首个保留状态。`,
                      )
                    ) {
                      setValue(removeStatus(data, s.id));
                      setStatusFilter("all");
                    }
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const label = statusName.trim();
              if (!label) return;
              if (data.statuses.some((s) => s.label === label)) {
                setNotice("该状态已存在");
                return;
              }
              setValue({
                ...data,
                statuses: [
                  ...data.statuses,
                  { id: crypto.randomUUID(), label, color: "#667a94" },
                ],
              });
              setStatusName("");
            }}
          >
            <input
              required
              aria-label="新状态名称"
              placeholder="例如：等待加面"
              maxLength={20}
              value={statusName}
              onChange={(e) => setStatusName(e.target.value)}
            />
            <Button type="submit" size="sm">
              <Plus size={14} />
              添加状态
            </Button>
          </form>
        </Modal>
      )}
      {columns && (
        <Modal title="显示或隐藏列" onClose={() => setColumns(false)}>
          <div className="column-options">
            {fields.map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={!hidden.includes(key)}
                  disabled={["company", "role"].includes(key)}
                  onChange={(e) =>
                    setHidden(
                      e.target.checked
                        ? hidden.filter((k) => k !== key)
                        : [...hidden, key],
                    )
                  }
                />
                {label}
                {["company", "role"].includes(key) && <small>冻结列</small>}
              </label>
            ))}
          </div>
          <p className="muted">
            本轮提供列显示切换；列宽拖动、排序及自定义字段将在后续迭代。
          </p>
        </Modal>
      )}
      {deleteId && (
        <Modal title="删除这条投递记录？" onClose={() => setDeleteId(null)}>
          <p>记录将从当前浏览器移除，此操作无法撤销。</p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              保留记录
            </Button>
            <Button
              onClick={() => {
                setValue({
                  ...data,
                  records: data.records.filter((r) => r.id !== deleteId),
                });
                setDeleteId(null);
              }}
            >
              确认删除
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
