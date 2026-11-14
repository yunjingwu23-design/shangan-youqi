// 纯常量：前后台共用，不含 zod，方便客户端组件直接引用。
export const feedbackKindOptions = [
  { value: 'bug', label: '功能异常', hint: '页面打不开、按钮没反应、数据显示错误' },
  { value: 'suggestion', label: '功能建议', hint: '希望增加或改进的能力' },
  { value: 'content', label: '内容纠错', hint: '岗位信息、面经、薪资数据有误' },
  { value: 'other', label: '其他', hint: '合作、投诉或其他想说的话' },
] as const;

export const feedbackStatusOptions = [
  { value: 'new', label: '待处理' },
  { value: 'reviewing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'dismissed', label: '已忽略' },
] as const;

export type FeedbackKind = (typeof feedbackKindOptions)[number]['value'];
export type FeedbackStatus = (typeof feedbackStatusOptions)[number]['value'];

export const feedbackKindLabels = Object.fromEntries(
  feedbackKindOptions.map((item) => [item.value, item.label])
) as Record<FeedbackKind, string>;

export const feedbackStatusLabels = Object.fromEntries(
  feedbackStatusOptions.map((item) => [item.value, item.label])
) as Record<FeedbackStatus, string>;

export type FeedbackItem = {
  id: string;
  kind: FeedbackKind;
  content: string;
  contact: string | null;
  pagePath: string | null;
  userAgent: string | null;
  status: FeedbackStatus;
  adminNote: string | null;
  createdAt: string;
};
