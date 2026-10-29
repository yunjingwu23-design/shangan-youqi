"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  ArrowLeft,
  MapPin,
  Clock,
  CalendarDays,
  ArrowRight,
  Plus,
  Check,
  ExternalLink,
  Mail,
  Info,
} from "lucide-react";
import { categories, jobs, posts, type Job } from "@/lib/data";
import { searchJobs, searchPosts } from "@/lib/search";
import {
  JobCard,
  PageHeading,
  Empty,
  DemoNote,
  CopyButton,
  useLocal,
} from "./common";
import { Button } from "./ui/button";
import {
  initialWorkspace,
  newApplication,
  type WorkspaceData,
} from "@/lib/workspace";
export function JobsPage() {
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get("type") || "全部");
  const [q, setQ] = useState(params.get("q") || "");
  const [city, setCity] = useState("全部城市");
  const [industry, setIndustry] = useState("全部行业");
  const [year, setYear] = useState("全部届别");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [precise, setPrecise] = useState(false);
  const matched = searchJobs(q, precise)
    .filter(
      (j) =>
        (category === "全部" || j.category === category) &&
        (city === "全部城市" || j.city === city) &&
        (industry === "全部行业" || j.industry === industry) &&
        (year === "全部届别" || j.year === year),
    )
    .sort((a, b) =>
      sort === "company"
        ? a.company.localeCompare(b.company, "zh-CN")
        : b.date.localeCompare(a.date),
    );
  function reset() {
    setQ("");
    setCategory("全部");
    setCity("全部城市");
    setIndustry("全部行业");
    setYear("全部届别");
    setPage(1);
  }
  return (
    <div className="page-width page-section">
      <PageHeading
        eyebrow="FIND YOUR NEXT CHAPTER"
        title="好机会，值得认真发现。"
        description="从实习到校招，找到与你同频的下一站。"
        action={
          <Link className="text-link" href="/workspace">
            我的求职工作台 <ArrowUpRight size={16} />
          </Link>
        }
      />
      <DemoNote>
        当前为演示岗位，不代表企业真实招聘状态；投递前请前往官方渠道核验。
      </DemoNote>
      <div className="jobs-search">
        <Search size={20} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="搜索公司、岗位或关键词"
          aria-label="搜索岗位"
        />
        <div className="mode-switch">
          <button
            className={!precise ? "on" : ""}
            onClick={() => {
              setPrecise(false);
              setPage(1);
            }}
          >
            模糊
          </button>
          <button
            className={precise ? "on" : ""}
            onClick={() => {
              setPrecise(true);
              setPage(1);
            }}
          >
            精准
          </button>
        </div>
      </div>
      <div className="filter-panel">
        <div className="tab-list">
          {["全部", ...categories].map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="filter-row">
          {[
            [
              city,
              setCity,
              ["全部城市", "北京", "上海", "深圳", "广州"],
              "城市",
            ],
            [
              industry,
              setIndustry,
              ["全部行业", "金融", "互联网", "专业服务", "消费品"],
              "行业",
            ],
            [year, setYear, ["全部届别", "2027届", "不限届别"], "毕业届别"],
          ].map(([value, setter, options, label]) => (
            <label key={label as string}>
              {label as string}
              <select
                aria-label={label as string}
                value={value as string}
                onChange={(e) => {
                  (setter as (s: string) => void)(e.target.value);
                  setPage(1);
                }}
              >
                {(options as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <button className="reset-link" onClick={reset}>
            重置筛选
          </button>
        </div>
      </div>
      <div className="results-top">
        <span>
          找到 <b>{matched.length}</b> 个演示机会
        </span>
        <select
          aria-label="排序方式"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="newest">按发布时间排序</option>
          <option value="company">按公司名称排序</option>
        </select>
      </div>
      {matched.length ? (
        <div className="jobs-grid">
          {matched.slice((page - 1) * 6, page * 6).map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      ) : (
        <Empty
          action={
            <Button variant="outline" onClick={reset}>
              清除筛选
            </Button>
          }
        />
      )}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          上一页
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil(matched.length / 6))}
        </span>
        <button
          disabled={page * 6 >= matched.length}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
      <p className="fine-print">
        转正实习仅指招聘方明确表示有留用可能，不代表保证转正。
      </p>
    </div>
  );
}
export function SearchPage() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [precise, setPrecise] = useState(params.get("mode") === "precise");
  const [type, setType] = useState("全部");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const js = searchJobs(q, precise),
    ps = searchPosts(q, precise);
  const cs = [...new Set(js.map((j) => j.company))];
  const results = [
    ...(type === "全部" || type === "岗位"
      ? js.map((j) => ({ key: "job:" + j.id, node: <JobCard job={j} /> }))
      : []),
    ...(type === "全部" || type === "公司"
      ? cs.map((c) => ({
          key: "company:" + c,
          node: (
            <Link
              href={`/jobs?q=${encodeURIComponent(c)}`}
              className="result-card"
            >
              <span className="tag">公司 · 演示</span>
              <h3>
                {c}
                <ArrowUpRight size={18} />
              </h3>
              <p>
                已收录 {js.filter((j) => j.company === c).length} 个演示岗位
              </p>
            </Link>
          ),
        }))
      : []),
    ...(type === "全部" || type === "面经"
      ? ps.map((p) => ({
          key: "post:" + p.id,
          node: (
            <Link href={`/interviews/${p.id}`} className="result-card">
              <span className="tag">原创示例 · 面经</span>
              <h3>
                {p.title}
                <ArrowUpRight size={18} />
              </h3>
              <p>
                {p.company} · {p.category}
              </p>
            </Link>
          ),
        }))
      : []),
  ];
  return (
    <div className="page-width page-section">
      <PageHeading
        eyebrow="SEARCH, WITH CLARITY"
        title="你在找的，或许就在这里。"
        description="公司、岗位与面试准备，一个入口连接你的求职线索。"
      />
      <form
        className="jobs-search"
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(
            `/search?q=${encodeURIComponent(q)}&mode=${precise ? "precise" : "fuzzy"}`,
          );
        }}
      >
        <Search />
        <input
          aria-label="全站搜索关键词"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="试试“中金”“财务”或“四大”"
        />
        <Button type="submit">
          搜索 <ArrowRight size={16} />
        </Button>
      </form>
      <div className="search-mode-detail">
        <div className="mode-switch">
          <button
            className={!precise ? "on" : ""}
            onClick={() => {
              setPrecise(false);
              setPage(1);
            }}
          >
            智能模糊搜索
          </button>
          <button
            className={precise ? "on" : ""}
            onClick={() => {
              setPrecise(true);
              setPage(1);
            }}
          >
            精准搜索
          </button>
        </div>
        <span>
          {precise
            ? "仅匹配公司、岗位及内容的直接关键词，不扩展别名或同义词。"
            : "使用可维护的公司别名与岗位词典联想，仅返回已收录的演示内容。"}
        </span>
      </div>
      <div className="list-controls">
        <div className="tab-list">
          {["全部", "岗位", "公司", "面经", "招聘动态"].map((t) => (
            <button
              key={t}
              className={type === t ? "active" : ""}
              onClick={() => {
                setType(t);
                setPage(1);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="muted">{results.length} 条结果</span>
      </div>
      {results.length ? (
        <div className="jobs-grid">
          {results.slice((page - 1) * 6, page * 6).map((r) => (
            <div key={r.key}>{r.node}</div>
          ))}
        </div>
      ) : (
        <Empty
          title={type === "招聘动态" ? "暂未收录招聘动态" : "没有找到匹配结果"}
          description="换个关键词或切换搜索模式试试。"
        />
      )}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          上一页
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil(results.length / 6))}
        </span>
        <button
          disabled={page * 6 >= results.length}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
export function JobDetail({ job }: { job: Job }) {
  const {
    value: data,
    setValue,
    ready,
    error,
  } = useLocal<WorkspaceData>("sayq:workspace", initialWorkspace);
  const [notice, setNotice] = useState("");
  const exists = data.records.some((r) => r.jobId === job.id);
  return (
    <div className="page-width page-section">
      <Link className="back-link" href="/jobs">
        <ArrowLeft size={15} /> 返回岗位广场
      </Link>
      <DemoNote>
        这是一份虚构的演示 JD。邮箱使用
        example.com，不接收真实投递；来源链接仅指向企业官网。
      </DemoNote>
      <div className="detail-grid">
        <article className="detail-main">
          <div className="detail-header">
            <span
              className="company-mark large"
              style={{ color: job.color, background: job.color + "0c" }}
            >
              {job.initials}
            </span>
            <div>
              <div className="eyebrow">
                {job.company} / {job.department}
              </div>
              <h1>{job.title}</h1>
              <div className="job-meta">
                <span>
                  <MapPin size={14} />
                  {job.city}
                </span>
                <span>{job.salary}</span>
                <span>{job.year}</span>
              </div>
            </div>
          </div>
          <div className="detail-tags">
            <span className="tag">{job.category}</span>
            {job.tags.map((t) => (
              <span className="tag tag-light" key={t}>
                {t}
              </span>
            ))}
          </div>
          <section>
            <h2>岗位职责</h2>
            <ol>
              {job.duties.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          </section>
          <section>
            <h2>任职要求</h2>
            <ol>
              {job.requirements.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          </section>
          <section>
            <h2>实习时长与出勤要求</h2>
            <p>{job.attendance}</p>
          </section>
          <section>
            <h2>留用情况</h2>
            {job.retention ? (
              <div className="retention">
                <b>有留用可能（以招聘方实际考核及安排为准）</b>
                <p>{job.retention}</p>
                <small>证据来源：本页演示 JD，非官方招聘承诺。</small>
              </div>
            ) : (
              <p>本演示 JD 未明确留用机会，不作转正承诺。</p>
            )}
          </section>
          <section className="application-box">
            <div className="section-inline">
              <h2>投递方式</h2>
              <Mail size={21} />
            </div>
            <p>投递邮箱（演示）</p>
            <strong className="apply-email">{job.email}</strong>
            <div className="row">
              <CopyButton text={job.email} />
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`mailto:${job.email}?subject=${encodeURIComponent(job.subject)}`}
                >
                  打开邮件客户端 <ArrowUpRight size={14} />
                </a>
              </Button>
            </div>
            <p>邮件标题要求</p>
            <div className="subject-line">
              <span>{job.subject}</span>
              <CopyButton text={job.subject} label="复制标题" />
            </div>
            <div className="fine-print">
              请勿向演示邮箱发送个人资料。真实岗位上线后，投递信息将在本 JD
              内统一维护。
            </div>
          </section>
          <section className="source-section">
            <h2>来源与核验</h2>
            <p>来源：演示数据（非官方 JD）</p>
            <a
              className="text-link"
              href={job.source}
              target="_blank"
              rel="noopener noreferrer"
            >
              访问企业官网，自行核验招聘机会 <ExternalLink size={14} />
            </a>
            <p>演示发布时间：{job.date} · 最后核验：尚未核验</p>
            <small>打开站外链接不会自动将你的记录标记为“已投递”。</small>
          </section>
        </article>
        <aside className="detail-side">
          <div className="panel">
            <span className="eyebrow">MAKE YOUR NEXT MOVE</span>
            <h3>好机会，先记下来。</h3>
            <p>加入工作台后，信息会自动填入。你可以继续编辑、安排下一步。</p>
            <Button
              disabled={!ready}
              onClick={() => {
                if (exists) {
                  setNotice("已在工作台中，无需重复添加。");
                  return;
                }
                setValue({
                  ...data,
                  records: [...data.records, newApplication(job)],
                });
                setNotice("已加入工作台，当前状态为“想投递”。");
              }}
            >
              {exists ? <Check size={16} /> : <Plus size={16} />}{" "}
              {exists ? "已加入工作台" : "加入我的工作台"}
            </Button>
            {notice && (
              <p className="success-text" role="status">
                {notice}
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <Link href="/workspace" className="text-link">
              打开工作台 <ArrowRight size={15} />
            </Link>
            <div className="side-info">
              <span>
                <CalendarDays size={15} />
                演示截止日期
              </span>
              <b>{job.deadline}</b>
              <small>未经官方核验，请勿据此安排真实投递。</small>
            </div>
          </div>
          <div className="panel soft-panel">
            <Info size={19} />
            <h4>你的投递，由你确认</h4>
            <p>加入工作台只代表收藏机会，不代表已经向招聘方提交申请。</p>
          </div>
        </aside>
      </div>
      <div className="section-heading related-heading">
        <h2>也许你还会感兴趣</h2>
        <Link href="/jobs" className="text-link">
          更多岗位 <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="jobs-grid">
        {jobs
          .filter((j) => j.id !== job.id)
          .slice(0, 3)
          .map((j) => (
            <JobCard job={j} key={j.id} />
          ))}
      </div>
    </div>
  );
}
