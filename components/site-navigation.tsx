'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Brand } from '@/components/brand';
import { siteLinks } from '@/lib/navigation';
export function SiteLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={compact ? 'site-links site-links-compact' : 'site-links'} aria-label="主站导航">
      {siteLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={
            (link.href === '/' ? pathname === '/' : pathname.startsWith(link.href))
              ? 'page'
              : undefined
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="site-header-main">
        <Brand />
        <div className="site-desktop-nav">
          <SiteLinks />
        </div>
        <div className="site-account">
          <Link className="button primary" href={signedIn ? '/workspace' : '/login'}>
            {signedIn ? '我的工作台' : '邮箱登录'}
          </Link>
          <button
            className="site-menu-button"
            aria-label={open ? '关闭导航' : '打开导航'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="site-mobile-nav" aria-label="移动端主站导航">
          {siteLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
