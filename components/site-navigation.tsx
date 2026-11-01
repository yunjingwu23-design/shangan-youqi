'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  LayoutDashboard,
  Headphones,
  BookOpen,
  Search,
  UserRound,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import {
  siteLinks,
  moduleLinks,
  moduleForPath,
  activeModuleLink,
  pageLabel,
  adminLinks,
} from '@/lib/navigation';
import { DraftProvider } from '@/components/drafts';
const icons = [BriefcaseBusiness, LayoutDashboard, Headphones, BookOpen];
export function SiteLinks({
  mobile = false,
  compact = false,
}: {
  mobile?: boolean;
  compact?: boolean;
}) {
  const module = moduleForPath(usePathname());
  return (
    <nav
      className={mobile ? 'ia-mobile-nav' : `site-links ${compact ? 'site-links-compact' : ''}`}
      aria-label={mobile ? '移动端核心导航' : '主站导航'}
    >
      {siteLinks.map((link, i) => {
        const Icon = icons[i];
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={module === link.key ? 'page' : undefined}
          >
            {mobile && <Icon size={20} strokeWidth={1.7} />}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="site-header ia-header">
      <div className="site-header-main">
        <Brand />
        <div className="site-desktop-nav">
          <SiteLinks />
        </div>
        <div className="site-account">
          <Link className="ia-search-link" href="/search" aria-label="全站搜索">
            <Search size={19} />
          </Link>
          <Link className="button secondary" href={signedIn ? '/workspace/settings' : '/login'}>
            <UserRound size={16} />
            {signedIn ? '我的账号' : '登录 / 注册'}
          </Link>
        </div>
      </div>
    </header>
  );
}
function LocationNavigation() {
  const path = usePathname(),
    query = useSearchParams();
  const module = moduleForPath(path),
    active = activeModuleLink(path, new URLSearchParams(query));
  const root = siteLinks.find((item) => item.key === module),
    label = pageLabel(path);
  const router = useRouter(),
    previous = useRef<string | null>(null);
  const [canBack, setCanBack] = useState(false);
  useEffect(() => {
    if (previous.current && previous.current !== path) setCanBack(true);
    else if (!previous.current && document.referrer) {
      try {
        setCanBack(new URL(document.referrer).origin === location.origin);
      } catch {
        /* module fallback */
      }
    }
    previous.current = path;
  }, [path]);
  if (path === '/') return null;
  if (path === '/admin' || path.startsWith('/admin/'))
    return (
      <div className="ia-location">
        <div className="ia-breadcrumb-row">
          <nav className="ia-breadcrumbs" aria-label="后台面包屑">
            <Link href="/admin">管理后台</Link>
            {path !== '/admin' && (
              <>
                <span aria-hidden="true">/</span>
                <span aria-current="page">
                  {path === '/admin/jobs/new'
                    ? '导入 / 新建 JD'
                    : path.startsWith('/admin/jobs/')
                      ? 'JD 编辑与审核'
                      : path === '/admin/review'
                        ? '审核工作台'
                        : path === '/admin/logs'
                          ? '操作日志'
                          : path === '/admin/analytics'
                            ? '数据分析中心'
                            : path === '/admin/accept'
                              ? '领取管理员邀请'
                              : path === '/admin/jobs'
                                ? '岗位管理与 JD 录入'
                                : adminLinks.find((link) => link.href === path)?.label ||
                                  '管理页面'}
                </span>
              </>
            )}
          </nav>
          <button
            className="ia-back"
            onClick={() => (canBack ? router.back() : router.push('/admin'))}
          >
            <ArrowLeft size={14} />
            返回上一页
          </button>
        </div>
      </div>
    );
  return (
    <div className="ia-location">
      {root && (
        <nav className="ia-module-nav" aria-label={`${root.label}模块导航`}>
          <Link href={root.href} className="ia-module-home">
            {root.label}
            <span> / </span>
          </Link>
          {moduleLinks[module!].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="ia-breadcrumb-row">
        <nav className="ia-breadcrumbs" aria-label="面包屑">
          <Link href="/">首页</Link>
          {root && (
            <>
              <span aria-hidden="true">/</span>
              {path === root.href ? (
                <span aria-current="page">{root.label}</span>
              ) : (
                <Link href={root.href}>{root.label}</Link>
              )}
            </>
          )}
          {label && path !== root?.href && (
            <>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{label}</span>
            </>
          )}
        </nav>
        <button
          className="ia-back"
          onClick={() => (canBack ? router.back() : router.push(root?.href || '/'))}
        >
          <ArrowLeft size={14} />
          返回上一页
        </button>
      </div>
    </div>
  );
}
export function SiteChrome({
  children,
  signedIn,
  scope,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  scope: string;
}) {
  const path = usePathname(),
    admin = path === '/admin' || path.startsWith('/admin/');
  return (
    <DraftProvider key={scope} scope={scope}>
      <div className={admin ? 'ia-shell ia-admin-shell' : 'ia-shell'}>
        <a className="ia-skip" href="#page-content">
          跳到页面内容
        </a>
        {admin ? (
          <header className="site-header ia-header">
            <div className="site-header-main">
              <Brand />
              <strong className="ia-admin-label">管理后台</strong>
              <nav className="site-links" aria-label="后台导航">
                {adminLinks.map((link) => (
                  <Link
                    href={link.href}
                    key={link.href}
                    aria-current={
                      (
                        link.href === '/admin'
                          ? path === '/admin' ||
                            path.startsWith('/admin/jobs') ||
                            path === '/admin/review'
                          : link.href === '/admin/system'
                            ? path === link.href || path === '/admin/logs'
                            : path === link.href ||
                              (link.href === '/admin/data' && path === '/admin/analytics')
                      )
                        ? 'page'
                        : undefined
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Link href="/">返回前台</Link>
            </div>
          </header>
        ) : (
          <SiteHeader signedIn={signedIn} />
        )}
        <LocationNavigation />
        <div id="page-content" className="ia-page-content">
          {children}
        </div>
        {!admin && (
          <>
            <footer className="site-footer ia-footer">
              <div>
                <strong>上岸有期</strong>
                <p>让每一步，都离上岸更近。</p>
              </div>
              <p>招聘信息以原始来源为准 · 个人数据仅自己可见</p>
              <Link href="/">回到首页 ↑</Link>
            </footer>
            <SiteLinks mobile />
          </>
        )}
      </div>
    </DraftProvider>
  );
}
