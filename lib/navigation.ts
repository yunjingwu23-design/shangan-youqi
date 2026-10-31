export const siteLinks = [
  { href: '/jobs', label: '找岗位', key: 'jobs' },
  { href: '/workspace', label: '我的求职', key: 'career' },
  { href: '/interview-center', label: '面试中心', key: 'interview' },
  { href: '/resources', label: '面经资料', key: 'resources' },
] as const;
export type ModuleKey = (typeof siteLinks)[number]['key'];
export const moduleLinks: Record<ModuleKey, { href: string; label: string }[]> = {
  jobs: [
    { href: '/jobs', label: '全部岗位' },
    { href: '/jobs?type=daily_internship', label: '日常实习' },
    { href: '/jobs?type=conversion_internship', label: '转正实习' },
    { href: '/jobs?type=autumn_recruitment', label: '秋招' },
    { href: '/jobs?type=spring_recruitment', label: '春招' },
    { href: '/jobs/calendar', label: '招聘日历' },
  ],
  career: [
    { href: '/workspace', label: '求职工作台' },
    { href: '/resume', label: '我的简历' },
    { href: '/workspace/favorites', label: '收藏岗位' },
    { href: '/workspace/schedule', label: '日程与提醒' },
  ],
  interview: [
    { href: '/workspace/interviews', label: 'AI 面试复盘' },
    { href: '/interview-center/mock', label: '真人 Mock' },
    { href: '/interview-center/history', label: '我的面试历史' },
    { href: '/interview-center/plan', label: '面试准备计划' },
  ],
  resources: [
    { href: '/resources', label: '免费面经' },
    { href: '/resources/radar', label: '全网面经雷达' },
    { href: '/resources/store', label: '原创及授权商城' },
    { href: '/resources/mine', label: '我的资料' },
  ],
};
export const adminLinks = [
  { href: '/admin', label: '内容运营' },
  { href: '/admin/services', label: '服务运营' },
  { href: '/admin/data', label: '数据中心' },
  { href: '/admin/system', label: '系统管理' },
];
const within = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/');
export function moduleForPath(path: string): ModuleKey | null {
  if (within(path, '/jobs')) return 'jobs';
  if (
    within(path, '/workspace/interviews') ||
    within(path, '/interview-center') ||
    ['/mock', '/review'].includes(path)
  )
    return 'interview';
  if (within(path, '/workspace') || within(path, '/resume')) return 'career';
  if (within(path, '/resources') || within(path, '/interviews')) return 'resources';
  return null;
}
export function activeModuleLink(path: string, query: URLSearchParams) {
  const module = moduleForPath(path);
  if (!module) return null;
  if (module === 'jobs' && path === '/jobs') {
    const type = query.get('type');
    return (
      moduleLinks.jobs.find(
        (link) => new URL(link.href, 'https://site.invalid').searchParams.get('type') === type
      )?.href || '/jobs'
    );
  }
  if (path.startsWith('/interview-center/practice')) return '/interview-center/plan';
  if (path.startsWith('/interview-center/notes')) return '/interview-center/history';
  if (
    module === 'resources' &&
    !['/resources/radar', '/resources/store', '/resources/mine'].includes(path)
  )
    return '/resources';
  return (
    [...moduleLinks[module]]
      .sort((a, b) => b.href.length - a.href.length)
      .find((link) => within(path, link.href))?.href || null
  );
}
export function pageLabel(path: string) {
  const labels: Record<string, string> = {
    '/resume': '我的简历',
    '/workspace/settings': '账号与资料',
    '/workspace/favorites': '收藏岗位',
    '/workspace/schedule': '日程与提醒',
    '/jobs/calendar': '招聘日历',
    '/interview-center/mock': '真人 Mock',
    '/interview-center/history': '我的面试历史',
    '/interview-center/plan': '面试准备计划',
    '/interview-center/practice': '文字面试练习',
    '/interview-center/notes': '手动复盘笔记',
    '/resources/radar': '全网面经雷达',
    '/resources/store': '原创及授权商城',
    '/resources/mine': '我的资料',
    '/workspace/interviews': 'AI 面试复盘',
    '/workspace/interviews/new': '上传面试录音',
    '/search': '全站搜索',
    '/login': '邮箱登录',
  };
  if (labels[path]) return labels[path];
  if (path.startsWith('/workspace/interviews/'))
    return path.endsWith('/transcript')
      ? '逐字稿校对'
      : path.endsWith('/report')
        ? '复盘报告'
        : '转写与分析进度';
  if (path.startsWith('/jobs/')) return '岗位详情';
  if (path.startsWith('/resources/')) return '面经正文';
  return null;
}
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
      ![
        '/',
        '/jobs',
        '/workspace',
        '/interviews',
        '/resume',
        '/review',
        '/mock',
        '/admin',
        '/interview-center',
        '/resources',
        '/search',
      ].some(
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
