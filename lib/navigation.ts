export const siteLinks = [
  { href: '/', label: '首页' },
  { href: '/jobs', label: '岗位广场' },
  { href: '/workspace', label: '求职工作台' },
  { href: '/interviews', label: '面经中心' },
  { href: '/resume', label: '我的简历' },
  { href: '/review', label: 'AI 复盘' },
  { href: '/mock', label: '模拟面试' },
];
// Return destinations are application routes, never external URLs or API calls.
export function safeReturnPath(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\x00-\x20]/.test(value)
  )
    return '/workspace';
  try {
    const url = new URL(value, 'https://shangan.invalid');
    if (
      url.origin !== 'https://shangan.invalid' ||
      !['/', '/jobs', '/workspace', '/interviews', '/resume', '/review', '/mock', '/admin'].some(
        (prefix) =>
          url.pathname === prefix || (prefix !== '/' && url.pathname.startsWith(prefix + '/'))
      )
    )
      return '/workspace';
    return url.pathname + url.search;
  } catch {
    return '/workspace';
  }
}
