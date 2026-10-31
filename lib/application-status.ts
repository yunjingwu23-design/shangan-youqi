export const applicationStatusValues = [
  'planned',
  'applied',
  'assessment',
  'ai_interview',
  'interview_1',
  'interview_2',
  'interview_3',
  'interview_4',
  'interview_5',
  'oral_oc',
  'offer',
] as const;
// Retained for old records and clients. No interview round is inferred.
export const legacyStatusValues = ['planned', 'applied', 'interview', 'offer', 'closed'] as const;
export const statusValues = [...applicationStatusValues, 'interview', 'closed'] as const;
export const statusLabels = {
  planned: '未投递',
  applied: '已投递',
  assessment: '测评',
  ai_interview: 'AI 面',
  interview_1: '一面',
  interview_2: '二面',
  interview_3: '三面',
  interview_4: '四面',
  interview_5: '五面',
  oral_oc: '口头 OC',
  offer: '已 Offer',
  interview: '面试中（未细分）',
  closed: '已结束',
} as const satisfies Record<(typeof statusValues)[number], string>;
