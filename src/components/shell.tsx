"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Search, Menu, X, ArrowRight } from "lucide-react";
export function Logo({ large = false }: { large?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${large ? "brand-large" : ""}`}
      aria-label="上岸有期首页"
    >
      <img src="/logo.png" alt="上岸有期官方 Logo" width={68} height={68} />
      <span>
        <strong>上岸有期</strong>
        <small>SHANG AN YOU QI</small>
      </span>
    </Link>
  );
}
const nav = [
  ["/jobs", "找岗位"],
  ["/workspace", "求职工作台"],
  ["/resume", "智能简历"],
  ["/review", "面试复盘"],
  ["/interviews", "面经中心"],
  ["/mock", "真人 Mock"],
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="site-header">
        <div className="nav-inner">
          <Logo />
          <nav
            className={open ? "main-nav open" : "main-nav"}
            aria-label="主导航"
          >
            {nav.map(([href, label]) => (
              <Link
                onClick={() => setOpen(false)}
                className={`${path.startsWith(href) ? "active" : ""} ${["/interviews", "/mock"].includes(href) ? "nav-secondary" : ""}`}
                href={href}
                key={href}
              >
                {label}
                {href === "/mock" && <span className="nav-new">NEW</span>}
              </Link>
            ))}
            <div className="tools-menu">
              <button
                className={
                  ["/radar", "/store", "/calendar"].some((v) =>
                    path.startsWith(v),
                  )
                    ? "active"
                    : ""
                }
              >
                更多工具 <span>⌄</span>
              </button>
              <div className="tools-dropdown">
                {[
                  ["/radar", "面经雷达"],
                  ["/store", "资料商城"],
                  ["/calendar", "招聘日历"],
                  ["/account", "个人中心"],
                  ["/admin", "运营后台"],
                ].map(([href, label]) => (
                  <Link key={href} href={href} onClick={() => setOpen(false)}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
          <div className="nav-actions">
            <Link href="/search" className="icon-link" aria-label="全站搜索">
              <Search size={19} />
            </Link>
            <span className="nav-divider" />
            <Link href="/login" className="login-link">
              登录 / 注册 <ArrowUpRight size={15} />
            </Link>
            <button
              className="mobile-menu icon-link"
              onClick={() => setOpen(!open)}
              aria-label={open ? "收起导航" : "展开导航"}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <Logo />
            <p>让每一份努力，都离上岸更近一点。</p>
          </div>
          <div className="footer-links">
            <div>
              <b>发现机会</b>
              <Link href="/jobs">岗位广场</Link>
              <Link href="/search">全站搜索</Link>
              <Link href="/calendar">招聘日历</Link>
            </div>
            <div>
              <b>求职成长</b>
              <Link href="/workspace">我的工作台</Link>
              <Link href="/resume">智能简历</Link>
              <Link href="/interviews">面经中心</Link>
            </div>
            <div>
              <b>更多支持</b>
              <Link href="/mock">真人 Mock</Link>
              <Link href="/account">账号与隐私</Link>
              <Link href="/admin">运营后台</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 上岸有期 · Shang An You Qi</span>
          <span>初版交互样品 · 所有岗位与内容均为演示数据</span>
          <Link href="/jobs">
            去发现下一份机会 <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </>
  );
}
