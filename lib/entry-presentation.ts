import type { Entry } from './validation';
export function entryPresentation(entry: Entry): { summary: string; editor: string | null } {
  try {
    const value = JSON.parse(entry.content);
    if (!value || typeof value !== 'object') return { summary: entry.content, editor: null };
    if (entry.kind === 'resume' && value.format === 'shangan-resume-v1')
      return {
        summary: `排版简历${typeof value.basics?.headline === 'string' && value.basics.headline ? ' · ' + value.basics.headline : ''}`,
        editor: `/resume?id=${entry.id}`,
      };
    if (entry.kind === 'interview_review' && value.format === 'shangan-text-mock-v1')
      return {
        summary: `文字面试练习 · ${Array.isArray(value.answers) ? value.answers.filter((v: unknown) => typeof v === 'string' && v.trim()).length : 0} 道题已作答`,
        editor: '/mock',
      };
    if (entry.kind === 'interview_review' && value.format === 'shangan-mock-interest-v1')
      return {
        summary: `Mock 服务意向（未确认预约） · ${typeof value.availability === 'string' ? value.availability : ''}`,
        editor: '/mock#mentor',
      };
    if (entry.kind === 'interview_review' && value.format === 'shangan-manual-review-v1')
      return {
        summary:
          typeof value.reflection === 'string' && value.reflection
            ? value.reflection
            : typeof value.questions === 'string'
              ? value.questions
              : '手动复盘笔记',
        editor: '/review',
      };
  } catch {
    /* Older plain-text drafts continue to use the existing editor. */
  }
  return { summary: entry.content, editor: null };
}
