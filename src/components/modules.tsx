"use client";
import Link from "next/link";
import { clearResumes } from "@/lib/resume/storage";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  LockKeyhole,
  ScanLine,
  FileText,
  Radar,
  ShoppingBag,
  CalendarDays,
  Mic,
  Plus,
  ShieldCheck,
  Settings2,
  Check,
} from "lucide-react";
import { posts } from "@/lib/data";
import { initialWorkspace, type WorkspaceData } from "@/lib/workspace";
import { PageHeading, DemoNote, Empty, Modal, useLocal } from "./common";
import { Button } from "./ui/button";
import { Logo } from "./shell";
export function Login() {
  return (
    <div className="login-page page-width">
      <div className="login-story">
        <div className="eyebrow">A GOOD START, TOGETHER</div>
        <h1>
          你的下一程，
          <br />
          从这里<span>开始。</span>
        </h1>
        <p>
          把机会、准备与每一步进展，
          <br />
          放在一个属于你的地方。
        </p>
        <div className="login-story-line" />
        <small>从发现机会，到收获 Offer。</small>
      </div>
      <div className="login-panel">
        <Logo large />
        <h2>欢迎来到上岸有期</h2>
        <p>认真准备的你，值得更好的机会。</p>
        <div className="oauth-unavailable">
          <ScanLine size={43} strokeWidth={1} />
          <b>微信扫码登录暂未开通</b>
          <span>
            等待微信开放平台网站应用审核与配置。
            <br />
            正式上线后将使用官方授权二维码。
          </span>
        </div>
        <Button disabled>
          <LockKeyhole size={16} />
          微信登录 · 暂未开通
        </Button>
        <Link href="/workspace" className="btn btn-outline">
          体验本地演示工作台 <ArrowUpRight size={16} />
        </Link>
        <small>演示模式不建立真实账号，不上传或同步你的数据。</small>
        <p className="login-privacy">
          真实账号、跨设备同步和安全开发认证将在后续阶段接入。
          <br />
          本页未生成任何登录二维码。
        </p>
      </div>
    </div>
  );
}
const profileDefault = {
  nickname: "认真准备的你",
  school: "",
  major: "",
  year: "2027",
  industry: "",
  city: "",
  avatar: "",
};
export function Account() {
  const {
    value: profile,
    setValue,
    error,
  } = useLocal("sayq:profile", profileDefault);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="page-width page-section narrow-page">
      <PageHeading
        eyebrow="YOUR OWN SPACE"
        title="让我们更了解你。"
        description="完善资料可以帮助你梳理方向，非必要信息都可以跳过。"
      />
      <DemoNote>个人资料为本地演示设置，当前未登录真实账号。</DemoNote>
      <div className="panel">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt="本地自定义头像" />
          ) : (
            <span>{profile.nickname.slice(0, 1)}</span>
          )}
          <div>
            <h3>你的个人资料</h3>
            <p>由你定义，不止一面。</p>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice("资料已保存至当前浏览器。");
          }}
        >
          {[
            ["nickname", "昵称"],
            ["school", "学校（可选）"],
            ["major", "专业（可选）"],
            ["year", "毕业年份（可选）"],
            ["industry", "意向行业（可选）"],
            ["city", "意向城市（可选）"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                aria-label={label}
                type={key === "year" ? "number" : "text"}
                min={2020}
                max={2040}
                value={profile[key as keyof typeof profile]}
                onChange={(e) =>
                  setValue({ ...profile, [key]: e.target.value })
                }
                maxLength={60}
              />
            </label>
          ))}
          <label className="full-width">
            本地头像（PNG/JPEG/WebP，不超过 1MB）
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  !["image/png", "image/jpeg", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 1024 * 1024
                ) {
                  setNotice("头像格式不支持或超过 1MB。");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  setValue({ ...profile, avatar: reader.result as string });
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <div className="row full-width">
            <Button type="submit">
              保存资料 <Check size={15} />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setValue({ ...profile, avatar: "" })}
            >
              恢复默认头像
            </Button>
          </div>
        </form>
        {notice && (
          <p role="status" className="success-text">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
      </div>
      <div className="panel privacy-panel">
        <h3>账号与数据</h3>
        <p>
          当前数据仅在此浏览器保存。真实账号上线后将提供安全退出、数据导出及注销申请。
        </p>
        <div className="row">
          <Button variant="outline" asChild>
            <Link href="/workspace">导出投递记录</Link>
          </Button>
          <Button variant="outline" onClick={() => setDeleting(true)}>
            删除本地演示数据
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">查看登录状态</Link>
          </Button>
        </div>
      </div>
      {deleting && (
        <Modal title="清除本地演示数据？" onClose={() => setDeleting(false)}>
          <p>
            会移除本浏览器的资料、工作台、收藏、简历版本、复盘和预约意向。无法撤销，也不会影响其他设备。
          </p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setDeleting(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                try {
                  await clearResumes();
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith("sayq:"))
                    .forEach((k) => localStorage.removeItem(k));
                  location.reload();
                } catch {
                  setNotice("未能清除简历库，请检查浏览器存储设置后重试。");
                  setDeleting(false);
                }
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
export function Interviews() {
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("全部公司");
  const matched = posts.filter(
    (p) =>
      (company === "全部公司" || p.company === company) &&
      `${p.company}${p.title}${p.category}`.includes(q),
  );
  return (
    <div className="page-width page-section">
      <PageHeading
        eyebrow="REAL QUESTIONS. BETTER PREPARATION."
        title="准备多一点，面试从容一点。"
        description="从问题出发，整理自己的思路，而不是背诵别人的答案。"
        action={
          <Link href="/radar" className="text-link">
            探索面经雷达 <ArrowUpRight size={17} />
          </Link>
        }
      />
      <DemoNote>
        以下为平台原创的面试准备示例，不是真实面试记录或企业官方题库。
      </DemoNote>
      <div className="content-hero">
        <div>
          <span className="eyebrow">THE PREPARATION NOTEBOOK</span>
          <h2>
            好的回答，
            <br />
            从好的准备开始。
          </h2>
          <p>理解问题，回到经历，找到属于你的表达。</p>
        </div>
        <div className="notebook-art">
          <FileText size={56} strokeWidth={1} />
          <span>
            YOUR STORY
            <br />
            MATTERS.
          </span>
        </div>
      </div>
      <div className="content-filter">
        <input
          aria-label="搜索面经"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索公司、岗位或面试问题"
        />
        <select
          aria-label="筛选公司"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        >
          {["全部公司", ...posts.map((p) => p.company)].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="posts-grid">
        {matched.map((p, i) => (
          <Link href={`/interviews/${p.id}`} className="post-card" key={p.id}>
            <div className={`post-art post-art-${i % 3}`}>
              <span>
                PREPARATION
                <br />
                NOTES.
              </span>
              <b>0{i + 1}</b>
              <ArrowUpRight size={25} />
            </div>
            <div className="post-body">
              <div className="row">
                <span className="tag">平台原创示例</span>
                <small>{p.category}</small>
              </div>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <div>
                {p.company}
                <span>
                  {p.time} <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!matched.length && <Empty />}
    </div>
  );
}
export function InterviewDetail({ id }: { id: string }) {
  const p = posts.find((p) => p.id === id)!;
  return (
    <div className="page-width page-section narrow-page">
      <Link className="back-link" href="/interviews">
        <ArrowLeft size={15} />
        返回面经中心
      </Link>
      <DemoNote>平台原创准备示例，不代表企业真实面试内容或评价。</DemoNote>
      <article className="article panel">
        <span className="eyebrow">PREPARATION NOTES / {p.company}</span>
        <h1>{p.title}</h1>
        <p>{p.summary}</p>
        <h2>从这些问题开始练习</h2>
        {p.questions.map((q, i) => (
          <section key={q}>
            <h3>
              0{i + 1} / {q}
            </h3>
            <p>
              先明确问题的核心，再选择一段你真实参与的经历。尝试用背景、目标、行动和结果组织回答，区分团队成果与你个人承担的工作。
            </p>
            <div className="article-tip">
              练习提示：录下自己的口头回答，检查是否回答了问题、是否提供了具体证据。不编造经历或结果。
            </div>
          </section>
        ))}
        <Button variant="outline" asChild>
          <Link href="/review">
            记录一次文字复盘 <ArrowUpRight size={16} />
          </Link>
        </Button>
      </article>
    </div>
  );
}
export function Review() {
  const {
    value: notes,
    setValue,
    error,
  } = useLocal(
    "sayq:reviews",
    [] as {
      id: string;
      company: string;
      role: string;
      round: string;
      date: string;
      question: string;
      answer: string;
      feeling: string;
    }[],
  );
  const [form, setForm] = useState({
    company: "",
    role: "",
    round: "一面",
    date: "",
    question: "",
    answer: "",
    feeling: "",
  });
  const [notice, setNotice] = useState("");
  return (
    <div className="page-width page-section">
      <PageHeading
        eyebrow="REFLECT. LEARN. MOVE FORWARD."
        title="每一次面试，都有新的收获。"
        description="把问题和回答记下来，下一次更有底气。"
      />
      <DemoNote>
        文字笔记支持本地保存。AI 分析与音频转写开发中，不会生成伪造的 AI 评价。
      </DemoNote>
      <div className="module-split">
        <div className="panel">
          <h3>新建文字复盘</h3>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              setValue([...notes, { ...form, id: crypto.randomUUID() }]);
              setNotice("文字复盘已保存到此浏览器。");
            }}
          >
            {[
              ["company", "面试公司"],
              ["role", "面试岗位"],
              ["round", "面试轮次"],
              ["date", "面试日期"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required={key === "company"}
                  type={key === "date" ? "date" : "text"}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            {[
              ["question", "面试问题"],
              ["answer", "实际回答"],
              ["feeling", "个人感受与复盘备注"],
            ].map(([key, label]) => (
              <label key={key} className="full-width">
                {label}
                <textarea
                  required={key === "question"}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder="写下真实发生的内容…"
                />
              </label>
            ))}
            <Button type="submit">保存文字复盘</Button>
          </form>
          {notice && (
            <p role="status" className="success-text">
              {notice}
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
        <div>
          <div className="panel feature-pending">
            <Mic size={26} />
            <h3>AI 与录音能力 · 开发中</h3>
            <p>
              后续支持经授权的录音上传、中英文转写及可编辑的 AI
              建议。上传前需确认录制与处理权限。
            </p>
          </div>
          <div className="panel">
            <h3>我的复盘笔记</h3>
            {notes.length ? (
              notes.map((n) => (
                <details className="review-note" key={n.id}>
                  <summary>
                    {n.company} · {n.round}
                    <small>{n.date}</small>
                  </summary>
                  <h4>{n.question}</h4>
                  <p>{n.answer}</p>
                  <p>{n.feeling}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("删除这条本地复盘？"))
                        setValue(notes.filter((v) => v.id !== n.id));
                    }}
                  >
                    删除笔记
                  </Button>
                </details>
              ))
            ) : (
              <Empty
                title="从第一次复盘开始"
                description="写下经验，也为下一轮留下一点提醒。"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export function Mock() {
  const [booking, setBooking] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [industry, setIndustry] = useState("全部方向");
  const {
    value: requests,
    setValue,
    error,
  } = useLocal(
    "sayq:mock-requests",
    [] as { id: string; mentor: string; time: string; brief: string }[],
  );
  const mentors = [
    {
      name: "Alex",
      industry: "金融研究",
      role: "行业研究 / 金融求职",
      color: "sage",
      desc: "练习研究框架、报告表达与专业问题。",
    },
    {
      name: "Mia",
      industry: "互联网产品",
      role: "产品思维 / 项目表达",
      color: "sand",
      desc: "从用户需求到项目复盘，练习结构化表达。",
    },
    {
      name: "Ryan",
      industry: "专业服务",
      role: "案例分析 / 英文面试",
      color: "lavender",
      desc: "围绕案例讨论与行为面试，开展模拟练习。",
    },
  ];
  return (
    <div className="page-width page-section">
      <PageHeading
        eyebrow="PRACTICE WITH A HUMAN"
        title="正式面试前，先练习一次。"
        description="在安全的练习空间里，找到更自然的表达。"
      />
      <DemoNote>
        导师均为虚构示例，资历未核验。预约仅为本地流程原型，不收款、不安排真实服务。
      </DemoNote>
      <div className="content-filter">
        <select
          aria-label="面试方向"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          {["全部方向", ...mentors.map((m) => m.industry)].map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </div>
      <div className="mentor-grid">
        {mentors
          .filter((m) => industry === "全部方向" || industry === m.industry)
          .map((m) => (
            <article className="mentor-card" key={m.name}>
              <div className={`mentor-art ${m.color}`}>
                <div>{m.name.slice(0, 1)}</div>
                <span>MOCK INTERVIEW</span>
                <small>示例导师 · 未核验</small>
              </div>
              <div className="mentor-body">
                <div className="row">
                  <h2>{m.name}</h2>
                  <span className="tag">{m.industry}</span>
                </div>
                <h4>{m.role}</h4>
                <p>{m.desc}</p>
                <div className="mentor-service">
                  <span>45 分钟模拟 + 15 分钟反馈</span>
                  <b>服务原型</b>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBooking(m.name);
                    setNotice("");
                  }}
                >
                  体验预约流程 <ArrowUpRight size={15} />
                </Button>
              </div>
            </article>
          ))}
      </div>
      {requests.length > 0 && (
        <div className="panel booking-list">
          <h3>本地预约意向（未提交）</h3>
          {requests.map((r) => (
            <div key={r.id}>
              <span>
                {r.mentor} · {r.time.replace("T", " ")} · {r.brief}
              </span>
              <button
                onClick={() => {
                  if (confirm("删除本地意向？"))
                    setValue(requests.filter((x) => x.id !== r.id));
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
      {booking && (
        <Modal
          title={`与 ${booking} 练习 · 预约演示`}
          onClose={() => setBooking(null)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setValue([
                ...requests,
                {
                  id: crypto.randomUUID(),
                  mentor: booking,
                  time: String(fd.get("time")),
                  brief: String(fd.get("brief")),
                },
              ]);
              setNotice("意向已保存至当前浏览器，未发送给面试官或运营。");
            }}
          >
            <label>
              意向时间
              <input type="datetime-local" name="time" required />
            </label>
            <label>
              希望练习的方向
              <textarea
                name="brief"
                maxLength={500}
                required
                placeholder="请勿填写敏感信息。"
              />
            </label>
            <label className="check-label">
              <input type="checkbox" required />
              我理解这是本地演示，不会产生真实预约。
            </label>
            <p className="muted">
              本轮不上传简历或 JD 文件。后续分享材料会逐次征求你的授权。
            </p>
            <Button type="submit">保存本地意向</Button>
            {notice && (
              <p role="status" className="success-text">
                {notice}
              </p>
            )}
            {error && <p className="error-text">{error}</p>}
          </form>
        </Modal>
      )}
    </div>
  );
}
export function Calendar() {
  const { value: data } = useLocal<WorkspaceData>(
    "sayq:workspace",
    initialWorkspace,
  );
  const events = data.records
    .flatMap((r) => [
      ...(r.nextAt
        ? [
            {
              id: r.id + "next",
              date: r.nextAt,
              title: `${r.company} · 下一步安排`,
              role: r.role,
            },
          ]
        : []),
      ...(r.deadline
        ? [
            {
              id: r.id + "end",
              date: r.deadline,
              title: `${r.company} · 演示截止时间`,
              role: r.role,
            },
          ]
        : []),
    ])
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="page-width page-section">
      <PageHeading
        eyebrow="MAKE ROOM FOR YOUR NEXT STEP"
        title="重要的日子，心里有数。"
        description="来自你的工作台，下一步安排和岗位截止时间汇集于此。"
        action={
          <Button asChild variant="outline">
            <Link href="/workspace">编辑我的日程</Link>
          </Button>
        }
      />
      <DemoNote>
        日期来自本地演示数据或个人录入，未经官方核验。邮件、微信与系统提醒尚未接入。
      </DemoNote>
      <div className="panel">
        <h3>我的招聘日程</h3>
        {events.map((e) => (
          <div className="calendar-event" key={e.id}>
            <CalendarDays size={20} />
            <b>{e.date}</b>
            <span>
              {e.title}
              <small>{e.role}</small>
            </span>
            <Link href="/workspace" aria-label={`编辑${e.title}`}>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        ))}
        {!events.length && (
          <Empty
            title="还没有安排日程"
            description="前往工作台填写下一步日期或截止时间。"
          />
        )}
      </div>
    </div>
  );
}
const moduleInfo = {
  resume: {
    eyebrow: "YOUR EXPERIENCE, WELL TOLD",
    title: "每段经历，都值得好好表达。",
    desc: "为不同的目标岗位，准备更合适的自己。",
    icon: FileText,
    name: "智能简历工作室",
    body: "DOCX 与文字型 PDF 提取、人工确认、模块编辑、A4 预览与版本保存将在后续阶段交付。",
    steps: [
      "上传文字型 DOCX / PDF",
      "确认识别结果与版式",
      "编辑模块与目标岗位版本",
      "预览并导出 PDF",
    ],
  },
  radar: {
    eyebrow: "FOLLOW THE SIGNAL, NOT THE NOISE",
    title: "把值得关注的线索，留在视野里。",
    desc: "以合法来源和人工审核，连接你的求职准备。",
    icon: Radar,
    name: "全网面经雷达",
    body: "授权数据接口、关键词订阅、来源索引、去重与失效链接处理开发中。当前未连接任何第三方平台，不进行自动抓取。",
    steps: [
      "选择公司与岗位关键词",
      "接入授权数据源",
      "人工审核与去重",
      "查看来源并处理失效链接",
    ],
  },
  store: {
    eyebrow: "GOOD PREPARATION HAS VALUE",
    title: "把好内容，变成你的准备底气。",
    desc: "平台原创与获授权资料，聚焦真正有用的练习。",
    icon: ShoppingBag,
    name: "面经资料商城",
    body: "商品、版权授权、订单、内容权限及退款模型已纳入规划。本轮不开放购买，不收取任何费用。",
    steps: [
      "原创面试准备指南",
      "授权专题与 Case 练习",
      "清晰的内容权限",
      "完整的售后与退款流程",
    ],
  },
};
export function PendingModule({ kind }: { kind: keyof typeof moduleInfo }) {
  const m = moduleInfo[kind];
  const Icon = m.icon;
  return (
    <div className="page-width page-section">
      <PageHeading eyebrow={m.eyebrow} title={m.title} description={m.desc} />
      <DemoNote>功能开发中 · 本页为功能范围预览。</DemoNote>
      <div className="pending-module">
        <div className="pending-icon">
          <Icon size={50} strokeWidth={1} />
        </div>
        <span className="tag">COMING NEXT</span>
        <h2>{m.name}</h2>
        <p>{m.body}</p>
        <div className="pending-steps">
          {m.steps.map((s, i) => (
            <div key={s}>
              <span>0{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
        <Button variant="outline" asChild>
          <Link href="/workspace">
            先把投递安排好 <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
    </div>
  );
}
export function Admin() {
  return (
    <div className="page-width page-section">
      <PageHeading
        eyebrow="OPERATIONS, WITH CARE"
        title="运营管理中心"
        description="让每一条招聘信息，都经过认真核验。"
      />
      <DemoNote>
        后台尚未接入真实身份认证与数据库。当前页面只展示运营流程，不允许修改公开数据。
      </DemoNote>
      <div className="admin-layout">
        <aside className="panel">
          <Logo />
          <nav>
            {[
              ["/admin", "运营总览"],
              ["/admin/jobs", "岗位管理"],
              ["/admin/import", "批量导入 JD"],
              ["/admin/content", "内容与来源"],
              ["/admin/dictionaries", "搜索词典"],
            ].map(([url, label]) => (
              <Link key={url} href={url}>
                {label}
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </nav>
        </aside>
        <div>
          <div className="admin-lock panel">
            <ShieldCheck size={35} strokeWidth={1.3} />
            <h2>管理员安全登录 · 待配置</h2>
            <p>
              后续通过服务端验证管理员角色，再开放岗位编辑、审核与发布。
              <br />
              前端不会通过本地开关授予管理员权限。
            </p>
            <Button disabled>
              <LockKeyhole size={15} />
              管理功能暂未开通
            </Button>
          </div>
          <div className="admin-process panel">
            <h3>岗位发布流程</h3>
            <div>
              {[
                "录入原始 JD",
                "结构化提取",
                "人工校正与来源核验",
                "审核发布",
                "定期检查失效",
              ].map((s, i) => (
                <span key={s}>
                  <b>0{i + 1}</b>
                  {s}
                </span>
              ))}
            </div>
            <p>
              转正实习必须保存留用原文证据；投递邮箱、邮件标题与岗位一同审核；关键操作写入审计日志。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
