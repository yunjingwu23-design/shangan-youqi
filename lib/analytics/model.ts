import { z } from 'zod';

export const categories = [
  'daily_internship',
  'conversion_internship',
  'autumn_recruitment',
  'spring_recruitment',
] as const;
export const pageLabels: Record<string, string> = {
  '/': '首页',
  '/jobs': '岗位列表',
  '/jobs/:id': '岗位详情',
  '/jobs/calendar': '招聘日历',
  '/search': '全站搜索',
  '/login': '邮箱登录',
  '/privacy': '隐私与使用统计',
  '/resume': '简历编辑器',
  '/workspace': '求职工作台',
  '/workspace/favorites': '收藏岗位',
  '/workspace/schedule': '日程提醒',
  '/workspace/settings': '账号设置',
  '/workspace/interviews': 'AI 复盘历史',
  '/workspace/interviews/new': '新建 AI 复盘',
  '/workspace/interviews/:id': 'AI 复盘详情',
  '/workspace/interviews/:id/progress': 'AI 转写进度',
  '/workspace/interviews/:id/transcript': '逐字稿校对',
  '/workspace/interviews/:id/report': 'AI 复盘报告',
  '/interview-center': '面试中心',
  '/interview-center/practice': '文字面试练习',
  '/interview-center/mock': '真人 Mock',
  '/interview-center/notes': '手动复盘',
  '/interview-center/history': '面试历史',
  '/interview-center/plan': '面试计划',
  '/resources': '免费面经',
  '/resources/:slug': '面经详情',
  '/resources/mine': '我的资料',
  '/resources/store': '资料商城',
  '/resources/radar': '面经雷达',
};
// Only public job/city/company vocabulary is sent. Never transmit a raw search.
export const searchVocabulary = [
  '产品',
  '产品经理',
  '运营',
  '技术',
  '研发',
  '设计',
  '数据',
  '数据分析',
  '金融',
  '投行',
  '行研',
  '咨询',
  '风控',
  '人力资源',
  '市场',
  '财务',
  '前端',
  '后端',
  '算法',
  '实习',
  '北京',
  '上海',
  '深圳',
  '广州',
  '杭州',
  '成都',
  '中金',
  '中金公司',
  '华泰',
  '腾讯',
  '阿里巴巴',
  '字节跳动',
  '美团',
  '百度',
  '微软',
  '日常实习',
  '转正实习',
  '秋招',
  '春招',
  'cicc',
] as const;
export function safeSearchKeyword(value: string | null) {
  const text = (value || '').normalize('NFKC').trim().toLowerCase();
  return searchVocabulary.find((word) => word === text) || null;
}
export const sourceLabels: Record<string, string> = {
  direct: '直接访问',
  internal: '站内访问',
  baidu: '百度',
  google: 'Google',
  bing: 'Bing',
  wechat: '微信',
  social: '社交平台',
  referral: '其他外部来源',
};
export function trafficSource(
  referrer: string,
  origin: string
): 'direct' | 'internal' | 'baidu' | 'google' | 'bing' | 'wechat' | 'social' | 'referral' {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    if (!['http:', 'https:'].includes(url.protocol)) return 'direct';
    if (url.origin === origin) return 'internal';
    const host = url.hostname.toLowerCase();
    const within = (domain: string) => host === domain || host.endsWith('.' + domain);
    if (within('baidu.com')) return 'baidu';
    if (within('google.com') || within('google.com.hk')) return 'google';
    if (within('bing.com')) return 'bing';
    if (within('weixin.qq.com')) return 'wechat';
    if (['linkedin.com', 'weibo.com', 'xiaohongshu.com', 'zhihu.com', 't.co'].some(within))
      return 'social';
    return 'referral';
  } catch {
    return 'direct';
  }
}
export function analyticsPage(path: string): string | null {
  if (Object.hasOwn(pageLabels, path)) return path;
  if (/^\/jobs\/[a-zA-Z0-9-]+$/.test(path)) return '/jobs/:id';
  const interview = path.match(
    /^\/workspace\/interviews\/[a-f0-9-]{36}(\/(progress|transcript|report))?$/
  );
  if (interview) return '/workspace/interviews/:id' + (interview[1] || '');
  if (/^\/(resources|interviews)\/[a-z0-9-]+$/.test(path)) return '/resources/:slug';
  return null;
}
export const clientEventSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(['page_view', 'job_click', 'category_click', 'application_link_click', 'search']),
    page: z.string().refine((v) => Object.hasOwn(pageLabels, v), '不支持的统计页面。'),
    source: z
      .enum(['direct', 'internal', 'baidu', 'google', 'bing', 'wechat', 'social', 'referral'])
      .default('direct'),
    jobId: z.uuid().optional(),
    category: z.enum(categories).optional(),
    keyword: z.enum(searchVocabulary).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (['job_click', 'application_link_click'].includes(v.type) && !v.jobId)
      ctx.addIssue({ code: 'custom', message: '岗位事件缺少已发布岗位。', path: ['jobId'] });
    if (v.type === 'category_click' && !v.category)
      ctx.addIssue({ code: 'custom', message: '请选择有效岗位分类。', path: ['category'] });
    if (v.type === 'search' && (!v.keyword || !['/jobs', '/search'].includes(v.page)))
      ctx.addIssue({ code: 'custom', message: '搜索统计仅接受公开词表。', path: ['keyword'] });
    if (v.keyword && v.type !== 'search')
      ctx.addIssue({ code: 'custom', message: '此事件不接受搜索词。' });
  });
export type ClientEvent = z.input<typeof clientEventSchema>;
export type BusinessEvent =
  | 'job_save'
  | 'workspace_add'
  | 'resume_save'
  | 'resume_upload'
  | 'ai_interview_create'
  | 'ai_report_request'
  | 'mock_interest';
export function beijingDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function dateShift(day: string, delta: number) {
  return new Date(Date.parse(day + 'T00:00:00Z') + delta * 86400000).toISOString().slice(0, 10);
}
export function analyticsRange(params: URLSearchParams, now = new Date()) {
  const today = beijingDate(now),
    preset = params.get('preset') || '7d';
  let from: string, to: string;
  if (preset === 'custom') {
    from = z.iso.date().parse(params.get('from'));
    to = z.iso.date().parse(params.get('to'));
  } else {
    if (!['today', 'yesterday', '7d', '30d'].includes(preset)) throw new Error('ANALYTICS_RANGE');
    to = preset === 'yesterday' ? dateShift(today, -1) : today;
    from = dateShift(to, preset === '7d' ? -6 : preset === '30d' ? -29 : 0);
  }
  if (from > to || to > today || from < dateShift(today, -89)) throw new Error('ANALYTICS_RANGE');
  return { from, to };
}
export type AnalyticsReport = {
  meta: {
    from: string;
    to: string;
    timezone: string;
    retentionDays: number;
    searchMinVisitors: number;
    startedAt: string;
  };
  totals: {
    pv: number;
    uv: number;
    new_users: number;
    active_users: number;
    application_clicks: number;
    job_saves: number;
    workspace_adds: number;
  };
  trend: { day: string; pv: number; uv: number; new_users: number; active_users: number }[];
  sources: { source: string; views: number }[];
  pages: { page_key: string; views: number; visitors: number }[];
  categories: {
    category: string;
    views: number;
    detail_views: number;
    clicks: number;
    application_clicks: number;
    saves: number;
    workspace_adds: number;
  }[];
  jobs: {
    id: string;
    title: string;
    company: string;
    views: number;
    clicks: number;
    application_clicks: number;
    saves: number;
    workspace_adds: number;
  }[];
  companies: { company: string; views: number; clicks: number; application_clicks: number }[];
  keywords: { keyword: string; searches: number; visitors: number }[];
  features: Record<string, number>;
  operations: { action: string; count: number }[];
};
