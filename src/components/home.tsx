"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Grid2X2,
  Check,
  FileText,
  MoveUpRight,
  SlidersHorizontal,
  Compass,
  CalendarDays,
} from "lucide-react";
import { jobs, categories } from "@/lib/data";
import { JobCard } from "./common";
import { Button } from "./ui/button";
export function Home() {
  const [q, setQ] = useState("");
  const [precise, setPrecise] = useState(false);
  const [category, setCategory] = useState("全部");
  const router = useRouter();
  const filtered =
    category === "全部" ? jobs : jobs.filter((j) => j.category === category);
  return (
    <>
      <section className="home-hero">
        <div className="hero-grid page-width">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span /> 为每一个认真准备的你 <span className="kicker-line" />
            </div>
            <h1>
              好机会，
              <br />
              与你
              <span className="hero-word">
                有期而遇
                <svg viewBox="0 0 400 20" aria-hidden="true">
                  <path d="M3 14 Q190 0 392 9" />
                </svg>
              </span>
              <span className="hero-period">。</span>
            </h1>
            <p>
              从第一份实习，到心动的 Offer。
              <br />
              发现机会、管理投递、准备面试，每一步都更有底气。
            </p>
            <div className="hero-search">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(
                    `/search?q=${encodeURIComponent(q)}&mode=${precise ? "precise" : "fuzzy"}`,
                  );
                }}
              >
                <Search size={21} />
                <input
                  aria-label="搜索公司或岗位"
                  placeholder="搜索公司、岗位，找到你的下一站"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button aria-label="搜索">
                  <ArrowUpRight size={24} />
                </button>
              </form>
              <div className="search-below">
                <div className="mode-switch">
                  <button
                    className={!precise ? "on" : ""}
                    onClick={() => setPrecise(false)}
                  >
                    <Sparkles size={12} />
                    智能模糊
                  </button>
                  <button
                    className={precise ? "on" : ""}
                    onClick={() => setPrecise(true)}
                  >
                    精准搜索
                  </button>
                </div>
                <span>
                  热门：
                  {["中金", "四大", "产品实习"].map((s) => (
                    <Link href={`/search?q=${s}`} key={s}>
                      {s}
                    </Link>
                  ))}
                </span>
              </div>
            </div>
            <div className="hero-proof">
              <span className="small-avatars">
                <i>Y</i>
                <i>W</i>
                <i>L</i>
                <i>+</i>
              </span>
              <span>认真求职的人，都值得被好机会看见</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="求职工具界面示意">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="visual-label">
              <span /> YOUR NEXT CHAPTER
            </div>
            <div className="float-note note-top">
              <span className="note-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <b>你的下一站，正在靠近</b>
                <small>每一点准备，都算数。</small>
              </div>
              <ArrowUpRight size={20} />
            </div>
            <div className="preview-board">
              <div className="preview-head">
                <Grid2X2 size={15} />
                <b>我的上岸计划</b>
                <span className="mini-tag">2027 秋招</span>
                <span>•••</span>
              </div>
              <div className="preview-stats">
                <div>
                  <small>正在推进</small>
                  <strong>
                    12<span> 个机会</span>
                  </strong>
                </div>
                <div className="tiny-chart">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span className="trend">↗ 一步步向前</span>
              </div>
              <div className="preview-table">
                <div className="preview-tr">
                  <span>公司 / 岗位</span>
                  <span>当前进度</span>
                  <span>下一步</span>
                </div>
                {[
                  ["C", "中金公司", "行业研究实习生", "一面", "准备面试"],
                  ["B", "字节跳动", "产品实习生", "已投递", "等待反馈"],
                  ["P", "普华永道", "审计助理", "Offer", "确认意向"],
                ].map(([a, b, c, d, e], i) => (
                  <div className="preview-tr" key={b}>
                    <div>
                      <i className={`mini-company mini-company-${i}`}>{a}</i>
                      <span>
                        <b>{b}</b>
                        <small>{c}</small>
                      </span>
                    </div>
                    <span>
                      <em className={`preview-status s-${i}`}>{d}</em>
                    </span>
                    <span>{e}</span>
                  </div>
                ))}
              </div>
              <div className="preview-bottom">
                <Check size={12} /> 所有努力，都有迹可循 <span>演示工作台</span>
              </div>
            </div>
            <div className="float-note offer-note">
              <span className="offer-check">
                <Check size={24} />
              </span>
              <div>
                <small>这一次，轮到你了</small>
                <b>You've got an Offer!</b>
              </div>
              <span className="confetti">✦</span>
            </div>
            <span className="visual-caption">
              A LITTLE MORE PREPARED. A LITTLE CLOSER.
            </span>
            <span className="deco-star">✳</span>
          </div>
        </div>
      </section>
      <section className="category-strip page-width">
        {categories.map((c, i) => (
          <Link href={`/jobs?type=${encodeURIComponent(c)}`} key={c}>
            <span className="category-index">0{i + 1}</span>
            <div>
              <strong>{c}</strong>
              <small>
                {
                  [
                    "把兴趣，变成第一段经历",
                    "积累经验，也争取留下",
                    "抓住毕业前的重要一程",
                    "新的春天，新的可能",
                  ][i]
                }
              </small>
            </div>
            <ArrowUpRight size={21} />
          </Link>
        ))}
      </section>
      <section className="section page-width">
        <div className="section-heading">
          <div>
            <div className="eyebrow">OPPORTUNITIES, CURATED FOR YOU</div>
            <h2>
              下一份机会，就在这里<span className="heading-dot">.</span>
            </h2>
            <p>少一点信息噪音，多一点值得认真考虑的选择。</p>
          </div>
          <Link href="/jobs" className="text-link">
            探索全部岗位 <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="list-controls">
          <div className="tab-list">
            {["全部", ...categories].map((c) => (
              <button
                className={category === c ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <Link href="/jobs" className="filter-link">
            <SlidersHorizontal size={14} /> 筛选岗位
          </Link>
        </div>
        <div className="jobs-grid">
          {filtered.slice(0, 6).map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
        <div className="center-action">
          <Button variant="outline" asChild>
            <Link href="/jobs">
              查看更多机会 <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </section>
      <section className="workspace-section">
        <div className="page-width workspace-promo">
          <div>
            <div className="eyebrow">LESS CHAOS. MORE PROGRESS.</div>
            <h2>
              求职，不必手忙脚乱。
              <br />
              把每一步，都安排明白。
            </h2>
            <p>
              告别散落的 Excel 和备忘录。
              <br />
              一个属于你的工作台，让机会、进度和下一步清晰可见。
            </p>
            <ul>
              <li>
                <Check size={16} />
                一张表，管理所有投递
              </li>
              <li>
                <Check size={16} />
                自定义状态、颜色与个人风格
              </li>
              <li>
                <Check size={16} />
                从发现岗位到面试准备，顺畅衔接
              </li>
            </ul>
            <Button asChild>
              <Link href="/workspace">
                打开我的求职工作台 <ArrowUpRight size={17} />
              </Link>
            </Button>
            <small className="promo-footnote">
              免费体验 · 演示数据仅保存在当前浏览器
            </small>
          </div>
          <div className="workspace-promo-art">
            <div className="promo-window">
              <div className="window-dots">
                <i />
                <i />
                <i />
                <span>我的求职工作台</span>
                <Grid2X2 size={14} />
              </div>
              <h3>
                每一份努力，都有进展 <span>✦</span>
              </h3>
              <div className="promo-window-tabs">
                <b>▦ 全部投递</b>
                <span>◫ 看板</span>
                <span>▦ 日历</span>
                <span>＋ 新增记录</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>公司</th>
                    <th>岗位名称</th>
                    <th>当前状态</th>
                    <th>下一步日期</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["中金公司", "行业研究实习生", "一面", "11-02"],
                    ["字节跳动", "产品实习生", "已投递", "11-05"],
                    ["普华永道", "审计助理", "Offer", "11-08"],
                    ["欧莱雅", "品牌市场实习", "想投递", "11-10"],
                  ].map(([a, b, c, d], i) => (
                    <tr key={a}>
                      <td>{a}</td>
                      <td>{b}</td>
                      <td>
                        <em className={`preview-status s-${i % 3}`}>{c}</em>
                      </td>
                      <td>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="promo-add">＋ 新增一行</div>
            </div>
            <span className="art-note">
              <Check size={15} /> 有条不紊，离上岸更近。
            </span>
          </div>
        </div>
      </section>
      <section className="section page-width growth-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">PREPARE BETTER, GO FURTHER</div>
            <h2>
              机会之外，还有成长<span className="heading-dot">.</span>
            </h2>
            <p>把准备做在前面，让每一次面试都更从容。</p>
          </div>
        </div>
        <div className="growth-grid">
          {[
            {
              href: "/interviews",
              icon: Compass,
              n: "01",
              title: "面经中心",
              desc: "看见真实的面试问题，找到自己的准备方向。",
              cta: "浏览面经",
              class: "sage",
            },
            {
              href: "/resume",
              icon: FileText,
              n: "02",
              title: "智能简历",
              desc: "让每一段经历，被更清楚、更有力地表达。",
              cta: "打开简历编辑器",
              class: "sand",
            },
            {
              href: "/mock",
              icon: CalendarDays,
              n: "03",
              title: "真人 Mock",
              desc: "在真正的面试前，先和专业人士练习一次。",
              cta: "探索模拟面试",
              class: "lavender",
            },
          ].map((x) => (
            <Link
              className={`growth-card ${x.class}`}
              href={x.href}
              key={x.href}
            >
              <div>
                <x.icon size={25} strokeWidth={1.5} />
                <span>{x.n}</span>
              </div>
              <h3>{x.title}</h3>
              <p>{x.desc}</p>
              <b>
                {x.cta}
                <MoveUpRight size={17} />
              </b>
            </Link>
          ))}
        </div>
      </section>
      <section className="closing page-width">
        <span>不用一下子走到终点，</span>
        <h2>下一步，向更好的自己出发。</h2>
        <Link href="/jobs">
          去发现机会 <ArrowUpRight size={21} />
        </Link>
        <div className="closing-star">✳</div>
      </section>
    </>
  );
}
