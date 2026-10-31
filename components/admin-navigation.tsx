'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminRoles, type AdminRole } from '@/lib/admin/model';
export function AdminNavigation({ role }: { role: AdminRole }) {
  const path = usePathname(),
    links = [
      { href: '/admin', label: '运营概览' },
      { href: '/admin/jobs', label: 'JD 管理表格' },
      { href: '/admin/jobs/new', label: '导入 / 新建 JD' },
      { href: '/admin/review', label: '审核工作台' },
      { href: '/admin/logs', label: '操作日志' },
      ...(role === 'super_admin' ? [{ href: '/admin/system', label: '管理员账号' }] : []),
    ];
  return (
    <div className="admin-section-bar">
      <nav aria-label="后台功能导航">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={path === link.href ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <span className="admin-role-badge">{adminRoles[role]}</span>
    </div>
  );
}
