/** Shared, client-safe helpers for the personal schedule. */

export const scheduleKinds = [
  'deadline',
  'online_test',
  'interview',
  'review',
  'follow_up',
  'other',
] as const;
export type ScheduleKind = (typeof scheduleKinds)[number];
export type ScheduleState = 'open' | 'done';

export type ScheduleEvent = {
  id: string;
  user_id?: string;
  title: string;
  kind: ScheduleKind;
  company: string;
  role: string;
  job_entry_id: string | null;
  starts_at: string;
  duration_minutes: number | null;
  remind_days: number;
  note: string;
  state: ScheduleState;
  created_at?: string;
  updated_at?: string;
};

/** A job record from the personal workspace, used by the 「关联岗位」 selector. */
export type ScheduleJobOption = {
  id: string;
  title: string;
  company: string;
};

export const scheduleKindLabels: Record<ScheduleKind, string> = {
  deadline: '投递截止',
  online_test: '笔试 / 测评',
  interview: '面试',
  review: '复盘',
  follow_up: '跟进 / 沟通',
  other: '其他',
};

export const scheduleKindHints: Record<ScheduleKind, string> = {
  deadline: '网申、投递的最后时限',
  online_test: '笔试、在线测评的开放时段',
  interview: '一面、二面、HR 面与终面',
  review: '面试后复盘、整理问题的时间',
  follow_up: '补材料、催进度、HR 沟通',
  other: '自定提醒',
};

export const pad = (value: number) => String(value).padStart(2, '0');

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Whole days from today (negative = past). Both sides are normalised to local midnight. */
export function daysFromToday(target: Date, now: Date = new Date()) {
  const diff = startOfDay(target).getTime() - startOfDay(now).getTime();
  return Math.round(diff / 86400000);
}

export const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'] as const;

/** Monday-first 6x7 grid covering the given month. */
export function monthGrid(cursor: Date) {
  const first = startOfMonth(cursor);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function isSameMonth(date: Date, cursor: Date) {
  return date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth();
}

export type ReminderBucket = 'overdue' | 'today' | 'soon' | 'later' | 'done';

/** A reminder becomes active `remind_days` before the start time. */
export function reminderBucket(event: ScheduleEvent, now: Date = new Date()): ReminderBucket {
  if (event.state === 'done') return 'done';
  const start = new Date(event.starts_at);
  const diff = daysFromToday(start, now);
  if (start.getTime() < now.getTime() && diff <= 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= Math.max(1, event.remind_days)) return 'soon';
  return 'later';
}

export function formatTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateLabel(value: string | Date, now: Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const diff = daysFromToday(date, now);
  const monthDay = `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  const weekday = `周${weekdayLabels[(date.getDay() + 6) % 7]}`;
  if (diff === 0) return `今天 · ${monthDay} ${weekday}`;
  if (diff === 1) return `明天 · ${monthDay} ${weekday}`;
  if (diff === -1) return `昨天 · ${monthDay} ${weekday}`;
  return `${monthDay} ${weekday}`;
}

export function relativeLabel(event: ScheduleEvent, now: Date = new Date()) {
  const diff = daysFromToday(new Date(event.starts_at), now);
  if (diff < -1) return `已过 ${Math.abs(diff)} 天`;
  if (diff === -1) return '昨天';
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff <= 7) return `${diff} 天后`;
  return `${Math.round(diff / 7)} 周后`;
}

export const reminderLabels: Record<ReminderBucket, string> = {
  overdue: '已逾期',
  today: '今天',
  soon: '即将到来',
  later: '稍后',
  done: '已完成',
};

/** Sort helper: open items first by time, then everything else by time. */
export function sortEvents(events: ScheduleEvent[]) {
  return [...events].sort((a, b) => {
    if (a.state !== b.state) return a.state === 'open' ? -1 : 1;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });
}

/** `2026-11-20T14:30` for datetime-local inputs, in the viewer's local zone. */
export function toLocalInputValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function nextRoundHour(date: Date = new Date()) {
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours() + 1,
    0
  );
  return next;
}

export function summarize(events: ScheduleEvent[], now: Date = new Date()) {
  let overdue = 0;
  let today = 0;
  let soon = 0;
  let done = 0;
  for (const event of events) {
    const bucket = reminderBucket(event, now);
    if (bucket === 'overdue') overdue += 1;
    else if (bucket === 'today') today += 1;
    else if (bucket === 'soon') soon += 1;
    else if (bucket === 'done') done += 1;
  }
  return { overdue, today, soon, done, total: events.length };
}
