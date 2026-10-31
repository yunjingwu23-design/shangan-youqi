import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  MessageSquareText,
  LayoutDashboard,
  BookOpen,
  Headphones,
} from 'lucide-react';
import { jobTypes } from '@/lib/catalog';
export default function Home() {
  const modules = [
    {
      href: '/workspace',
      title: '把机会，变成清晰的下一步',
      label: '我的求职工作台',
      text: '记录岗位、跟进状态、保存个人资料。每一次投递，都有迹可循。',
      icon: LayoutDashboard,
    },
    {
      href: '/resume',
      title: '把真实经历，写得更有分量',
      label: '简历编辑工作室',
      text: '分块编辑、岗位版本、A4 预览和 PDF 导出，让准备落在实处。',
      icon: FileText,
    },
    {
      href: '/interviews',
      title: '让准备，多一点方向',
      label: '面经与准备指南',
      text: '从问题拆解到复盘方法，建立自己的面试准备节奏。',
      icon: BookOpen,
    },
  ];
  return (
    <main className="site-main">
      <section className="home-hero">
        <div>
          <p className="site-eyebrow">YOUR CAREER, YOUR WAY</p>
          <h1>
            下一份好机会，
            <br />
            从这里<span>开始。</span>
          </h1>
          <p className="home-intro">
            找实习、准备校招，认真对待每一个可能。
            <br />
            让岗位、简历和每一次面试，在同一个地方连接起来。
          </p>
          <form action="/jobs" className="home-search">
            <label className="sr-only" htmlFor="home-query">
              搜索岗位或公司
            </label>
            <input id="home-query" name="q" placeholder="搜索公司、岗位或方向" maxLength={100} />
            <input type="hidden" name="mode" value="fuzzy" />
            <button className="button primary" type="submit">
              寻找机会
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="home-quick">
            <span>从这里开始</span>
            <Link href="/jobs?type=autumn_recruitment">秋招</Link>
            <Link href="/jobs?type=daily_internship">日常实习</Link>
            <Link href="/resume">打磨简历</Link>
          </div>
        </div>
        <div className="home-illustration" aria-label="求职准备流程">
          <ArrowUpRight size={110} strokeWidth={1} />
          <p>ONE STEP CLOSER</p>
          <div className="home-steps">
            <span>
              <BriefcaseBusiness size={19} />
              发现机会
            </span>
            <i />
            <span>
              <FileText size={19} />
              认真准备
            </span>
            <i />
            <span>
              <Headphones size={19} />
              持续复盘
            </span>
          </div>
          <small>每一步，都算数。</small>
        </div>
      </section>
      <section className="home-section">
        <div className="site-section-title">
          <div>
            <p className="site-eyebrow">01 / OPPORTUNITIES</p>
            <h2>找到适合你的招聘方向</h2>
          </div>
          <Link href="/jobs">
            全部岗位
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="recruitment-grid">
          {Object.entries(jobTypes).map(([key, label], i) => (
            <Link key={key} href={`/jobs?type=${key}`}>
              <span>0{i + 1}</span>
              <h3>{label}</h3>
              <p>
                {
                  [
                    '在实践里，积累第一段经验',
                    '了解有明确留用说明的机会',
                    '把握校招的重要一站',
                    '为新的招聘季做好准备',
                  ][i]
                }
              </p>
              <ArrowUpRight size={22} />
            </Link>
          ))}
        </div>
      </section>
      <section className="home-section">
        <div className="site-section-title">
          <div>
            <p className="site-eyebrow">02 / YOUR WORKSPACE</p>
            <h2>准备与行动，放在同一个地方</h2>
          </div>
        </div>
        <div className="home-modules">
          {modules.map(({ href, title, label, text, icon: Icon }) => (
            <Link href={href} key={href} className="site-card">
              <Icon size={24} />
              <p className="site-eyebrow">{label}</p>
              <h3>{title}</h3>
              <p>{text}</p>
              <ArrowRight size={20} />
            </Link>
          ))}
        </div>
      </section>
      <section className="home-interview">
        <div>
          <MessageSquareText size={28} />
          <p className="site-eyebrow">03 / GROW THROUGH PRACTICE</p>
          <h2>每次面试，都能成为下一次的底气。</h2>
          <p>练习表达，整理真实回答，记录值得继续打磨的地方。</p>
          <div className="site-actions">
            <Link href="/mock" className="button primary">
              开始文字面试练习
              <ArrowRight size={16} />
            </Link>
            <Link href="/review" className="button secondary">
              打开复盘中心
            </Link>
          </div>
        </div>
        <div className="home-quote">
          “
          <p>
            不用一下走到终点。
            <br />
            先走好眼前这一步。
          </p>
          <small>上岸有期 · YOUR NEXT CHAPTER</small>
        </div>
      </section>
    </main>
  );
}
