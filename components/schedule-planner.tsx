'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  addMonths,
  dayKey,
  daysFromToday,
  formatDateLabel,
  formatTime,
  isSameMonth,
  monthGrid,
  nextRoundHour,
  relativeLabel,
  reminderBucket,
  scheduleKindHints,
  scheduleKindLabels,
  scheduleKinds,
  sortEvents,
  summarize,
  toLocalInputValue,
  weekdayLabels,
  type ScheduleEvent,
  type ScheduleJobOption,
  type ScheduleKind,
  type ScheduleState,
} from '@/lib/schedule';

type Filter = 'all' | ScheduleKind;
type View = 'month' | 'list';

type FormState = {
  id: string | null;
  title: string;
  kind: ScheduleKind;
  company: string;
  role: string;
  job_entry_id: string;
  starts_at: string;
  duration_minutes: string;
  remind_days: string;
  note: string;
};

const durationOptions = [
  { value: '', label: '不设置' },
  { value: '30', label: '30 分钟' },
  { value: '45', label: '45 分钟' },
  { value: '60', label: '1 小时' },
  { value: '90', label: '1.5 小时' },
  { value: '120', label: '2 小时' },
  { value: '180', label: '3 小时' },
];

const remindOptions = [
  { value: '0', label: '当天提醒' },
  { value: '1', label: '提前 1 天' },
  { value: '2', label: '提前 2 天' },
  { value: '3', label: '提前 3 天' },
  { value: '7', label: '提前 1 周' },
];

function emptyForm(seed?: Date): FormState {
  return {
    id: null,
    title: '',
    kind: 'deadline',
    company: '',
    role: '',
    job_entry_id: '',
    starts_at: toLocalInputValue(seed || nextRoundHour()),
    duration_minutes: '',
    remind_days: '1',
    note: '',
  };
}

function formFromEvent(event: ScheduleEvent): FormState {
  return {
    id: event.id,
    title: event.title,
    kind: event.kind,
    company: event.company,
    role: event.role,
    job_entry_id: event.job_entry_id || '',
    starts_at: toLocalInputValue(event.starts_at),
    duration_minutes: event.duration_minutes ? String(event.duration_minutes) : '',
    remind_days: String(event.remind_days),
    note: event.note,
  };
}

export function SchedulePlanner({
  initialEvents,
  initialJobs,
  initialSetupRequired = false,
}: {
  initialEvents?: ScheduleEvent[];
  initialJobs?: ScheduleJobOption[];
  initialSetupRequired?: boolean;
} = {}) {
  const router = useRouter();
  const hydrated = useRef(initialEvents !== undefined);
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents || []);
  const [jobs, setJobs] = useState<ScheduleJobOption[]>(initialJobs || []);
  const [setupRequired, setSetupRequired] = useState(initialSetupRequired);
  const [loading, setLoading] = useState(initialEvents === undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<View>('month');
  const [filter, setFilter] = useState<Filter>('all');
  const [cursor, setCursor] = useState(() => new Date());
  const [form, setForm] = useState<FormState | null>(null);
  const [now, setNow] = useState(() => new Date());

  async function request(path: string, method = 'GET', data?: unknown) {
    const response = await fetch(path, {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(data !== undefined && { body: JSON.stringify(data) }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace('/login?reason=expired');
      throw new Error('登录已过期，请重新登录。');
    }
    if (!response.ok) throw new Error(result.error || '操作失败，请重试。');
    return result;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [schedule, entries] = await Promise.all([
        request('/api/schedule'),
        request('/api/entries?kind=application').catch(() => ({ entries: [] })),
      ]);
      setEvents(schedule.events || []);
      setSetupRequired(Boolean(schedule.setupRequired));
      setJobs(
        (entries.entries || []).map((entry: { id: string; title: string; company: string }) => ({
          id: entry.id,
          title: entry.title,
          company: entry.company,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败，请重试。');
    } finally {
      setLoading(false);
    }
    // request only depends on the stable router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (hydrated.current) return;
    void load();
  }, [load]);

  // Keep 「今天 / 逾期」 fresh without a full reload.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  // Phones suit the list better: the month grid only has room for dots.
  useEffect(() => {
    if (window.matchMedia('(max-width: 720px)').matches) setView('list');
  }, []);

  // Esc closes the editor.
  useEffect(() => {
    if (!form) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setForm(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [form]);

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.kind === filter)),
    [events, filter]
  );
  const stats = useMemo(() => summarize(events, now), [events, now]);
  const sorted = useMemo(() => sortEvents(visible), [visible]);
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of sorted) {
      const key = dayKey(new Date(event.starts_at));
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [sorted]);
  const upcoming = useMemo(
    () =>
      events
        .filter((event) => event.state === 'open')
        .filter((event) => {
          const bucket = reminderBucket(event, now);
          return bucket === 'overdue' || bucket === 'today' || bucket === 'soon';
        }),
    [events, now]
  );

  const grid = useMemo(() => monthGrid(cursor), [cursor]);

  function openNew(seed?: Date) {
    setNotice('');
    setError('');
    setForm(emptyForm(seed));
  }

  function openEdit(event: ScheduleEvent) {
    setNotice('');
    setError('');
    setForm(formFromEvent(event));
  }

  async function submit() {
    if (!form) return;
    if (!form.title.trim()) {
      setError('请填写日程标题。');
      return;
    }
    if (!form.starts_at) {
      setError('请选择日期与时间。');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      kind: form.kind,
      company: form.company.trim(),
      role: form.role.trim(),
      job_entry_id: form.job_entry_id || null,
      starts_at: new Date(form.starts_at).toISOString(),
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      remind_days: Number(form.remind_days),
      note: form.note,
    };
    try {
      if (form.id) {
        const result = await request(`/api/schedule/${form.id}`, 'PATCH', payload);
        setEvents((current) =>
          current.map((event) => (event.id === form.id ? (result.event as ScheduleEvent) : event))
        );
        setNotice('日程已更新。');
      } else {
        const result = await request('/api/schedule', 'POST', { ...payload, state: 'open' });
        setEvents((current) => [...current, result.event as ScheduleEvent]);
        setNotice('日程已加入你的日历。');
        setCursor(new Date(payload.starts_at));
      }
      setForm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  async function toggleState(event: ScheduleEvent) {
    setBusy(true);
    setError('');
    const state: ScheduleState = event.state === 'open' ? 'done' : 'open';
    try {
      const result = await request(`/api/schedule/${event.id}`, 'PATCH', { state });
      setEvents((current) =>
        current.map((item) => (item.id === event.id ? (result.event as ScheduleEvent) : item))
      );
      setNotice(state === 'done' ? '已标记完成。' : '已恢复为待办。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  async function remove(event: ScheduleEvent) {
    if (!window.confirm(`删除「${event.title}」？此操作不可撤销。`)) return;
    setBusy(true);
    setError('');
    try {
      await request(`/api/schedule/${event.id}`, 'DELETE');
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setNotice('日程已删除。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  if (setupRequired)
    return (
      <section className="site-card sched-setup">
        <span className="sched-tag pending">需要一次初始化</span>
        <h2>日程功能还差一步：建表</h2>
        <p>
          日程数据存在你自己的 Supabase 里。请在项目根目录找到
          <code>执行-日程提醒迁移.sql</code>，整段复制到 Supabase → SQL Editor →
          Run，回来刷新本页即可使用。
        </p>
        <ol>
          <li>打开 Supabase 控制台，进入本项目对应的项目</li>
          <li>左侧选择 SQL Editor，新建查询，粘贴脚本全部内容</li>
          <li>点击 Run，看到 Success 后刷新本页</li>
        </ol>
        <button className="button secondary" type="button" onClick={() => void load()}>
          <RotateCcw size={15} />
          我已执行，重新检测
        </button>
      </section>
    );

  return (
    <>
      {(stats.overdue > 0 || stats.today > 0) && (
        <section className="sched-banner" role="status">
          <span className="sched-banner-icon" aria-hidden="true">
            <BellRing size={17} />
          </span>
          <div>
            <strong>
              {stats.overdue > 0 && `${stats.overdue} 项已逾期`}
              {stats.overdue > 0 && stats.today > 0 && '，'}
              {stats.today > 0 && `今天还有 ${stats.today} 项安排`}
            </strong>
            <p>
              {upcoming[0]
                ? `最近一项：${upcoming[0].company ? `${upcoming[0].company} · ` : ''}${upcoming[0].title}（${relativeLabel(upcoming[0], now)} ${formatTime(upcoming[0].starts_at)}）`
                : '记得在完成后标记为已完成。'}
            </p>
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setFilter('all');
              setView('list');
            }}
          >
            看今天要做什么
          </button>
        </section>
      )}

      <section className="sched-stats" aria-label="日程概览">
        {[
          { key: 'open', label: '待办', value: events.filter((e) => e.state === 'open').length },
          { key: 'today', label: '今天', value: stats.today },
          { key: 'soon', label: '提醒期内', value: stats.soon },
          { key: 'done', label: '已完成', value: stats.done },
        ].map((item) => (
          <div key={item.key} className={`sched-stat ${item.key}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      {error && (
        <p className="sched-alert" role="alert">
          <TriangleAlert size={15} />
          {error}
        </p>
      )}
      {notice && (
        <p className="sched-notice" role="status">
          <Check size={15} />
          {notice}
        </p>
      )}

      <section className="sched-toolbar" aria-label="日程工具栏">
        <div className="sched-month-nav">
          <button
            type="button"
            aria-label="上个月"
            onClick={() => setCursor(addMonths(cursor, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <strong>
            {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
          </strong>
          <button type="button" aria-label="下个月" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="sched-today" onClick={() => setCursor(new Date())}>
            回到本月
          </button>
        </div>
        <div className="sched-toolbar-right">
          <div className="sched-views" role="group" aria-label="切换视图">
            <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>
              <CalendarDays size={14} />
              月历
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <Clock size={14} />
              列表
            </button>
          </div>
          <button className="button primary" type="button" onClick={() => openNew()}>
            <Plus size={15} />
            新建日程
          </button>
        </div>
      </section>

      <div className="sched-filters" role="group" aria-label="按类型筛选">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          全部
          <span>{events.length}</span>
        </button>
        {scheduleKinds.map((kind) => {
          const count = events.filter((event) => event.kind === kind).length;
          return (
            <button
              key={kind}
              type="button"
              className={`kind-${kind}`}
              aria-pressed={filter === kind}
              onClick={() => setFilter(kind)}
            >
              {scheduleKindLabels[kind]}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="sched-loading">
          <LoaderCircle size={16} className="spin" />
          正在读取你的日程…
        </p>
      ) : events.length === 0 ? (
        <section className="site-card sched-empty">
          <CalendarPlus size={26} />
          <h2>把求职节点放进日历</h2>
          <p>
            投递截止、笔试时段、面试时间、复盘计划都可以记在这里。到期前后会在页面顶部提醒你，不会发短信或邮件。
          </p>
          <button className="button primary" type="button" onClick={() => openNew()}>
            <Plus size={15} />
            安排第一条日程
          </button>
        </section>
      ) : view === 'month' ? (
        <section className="sched-calendar" aria-label="月历">
          <div className="sched-calendar-head">
            {weekdayLabels.map((label) => (
              <span key={label}>周{label}</span>
            ))}
          </div>
          <div className="sched-calendar-grid">
            {grid.map((date) => {
              const key = dayKey(date);
              const dayEvents = byDay.get(key) || [];
              const outside = !isSameMonth(date, cursor);
              const today = daysFromToday(date, now) === 0;
              return (
                <div
                  key={key}
                  className={`sched-cell${outside ? ' outside' : ''}${today ? ' today' : ''}`}
                >
                  <button
                    type="button"
                    className="sched-cell-add"
                    aria-label={`在 ${date.getMonth() + 1} 月 ${date.getDate()} 新建日程`}
                    onClick={() =>
                      openNew(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0))
                    }
                  >
                    <span>{date.getDate()}</span>
                    <Plus size={11} />
                  </button>
                  <div className="sched-cell-events">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className={`sched-chip kind-${event.kind}${
                          event.state === 'done' ? ' done' : ''
                        }${reminderBucket(event, now) === 'overdue' ? ' overdue' : ''}`}
                        title={`${formatTime(event.starts_at)} ${event.title}`}
                        onClick={() => openEdit(event)}
                      >
                        <i aria-hidden="true" />
                        <span>
                          {formatTime(event.starts_at)} {event.title}
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <button
                        type="button"
                        className="sched-chip-more"
                        onClick={() => {
                          setFilter('all');
                          setView('list');
                        }}
                      >
                        +{dayEvents.length - 2} 项
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : sorted.length === 0 ? (
        <p className="sched-empty-line">这个筛选条件下还没有日程。</p>
      ) : (
        <section className="sched-list" aria-label="日程列表">
          {sorted.map((event) => (
            <article
              key={event.id}
              className={`sched-row kind-${event.kind}${event.state === 'done' ? ' done' : ''}`}
            >
              <div className="sched-row-date">
                <strong>{formatDateLabel(event.starts_at, now)}</strong>
                <span>
                  {formatTime(event.starts_at)}
                  {event.duration_minutes ? ` · ${event.duration_minutes} 分钟` : ''}
                </span>
              </div>
              <div className="sched-row-body">
                <div className="sched-row-title">
                  <span className={`sched-tag ${event.kind}`}>
                    {scheduleKindLabels[event.kind]}
                  </span>
                  <h3>{event.title}</h3>
                </div>
                {(event.company || event.role) && (
                  <p className="sched-row-meta">
                    {[event.company, event.role].filter(Boolean).join(' · ')}
                  </p>
                )}
                {event.note && <p className="sched-row-note">{event.note}</p>}
                {event.job_entry_id && (
                  <Link
                    className="sched-row-link"
                    href={`/workspace?entry=${event.job_entry_id}`}
                    prefetch={false}
                  >
                    查看对应的投递记录 ↗
                  </Link>
                )}
                <p
                  className={`sched-row-hint${
                    reminderBucket(event, now) === 'overdue' ? ' overdue' : ''
                  }`}
                >
                  {reminderBucket(event, now) === 'overdue' && event.state === 'open'
                    ? '已逾期，尽快处理'
                    : event.state === 'done'
                      ? '已完成'
                      : `${remindOptions.find((option) => option.value === String(event.remind_days))?.label || `提前 ${event.remind_days} 天`}提醒`}
                </p>
              </div>
              <div className="sched-row-actions">
                <button
                  type="button"
                  className="sched-icon-button"
                  aria-label={event.state === 'open' ? '标记完成' : '恢复待办'}
                  title={event.state === 'open' ? '标记完成' : '恢复待办'}
                  disabled={busy}
                  onClick={() => void toggleState(event)}
                >
                  {event.state === 'open' ? <Check size={15} /> : <RotateCcw size={15} />}
                </button>
                <button
                  type="button"
                  className="sched-icon-button"
                  aria-label="编辑"
                  title="编辑"
                  onClick={() => openEdit(event)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="sched-icon-button danger"
                  aria-label="删除"
                  title="删除"
                  disabled={busy}
                  onClick={() => void remove(event)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {form && (
        <div className="sched-dialog-backdrop" onClick={() => setForm(null)}>
          <div
            className="sched-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sched-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="sched-dialog-title">{form.id ? '编辑日程' : '新建日程'}</h2>
              <button
                type="button"
                className="sched-icon-button"
                aria-label="关闭"
                onClick={() => setForm(null)}
              >
                <X size={16} />
              </button>
            </header>
            <div className="sched-form">
              <label className="sched-field full">
                <span>日程标题</span>
                <input
                  value={form.title}
                  maxLength={120}
                  placeholder="例如：腾讯产品岗网申截止"
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </label>
              <div className="sched-field full">
                <span>类型</span>
                <div className="sched-kind-picker" role="group" aria-label="日程类型">
                  {scheduleKinds.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className={`kind-${kind}`}
                      aria-pressed={form.kind === kind}
                      title={scheduleKindHints[kind]}
                      onClick={() => setForm({ ...form, kind })}
                    >
                      {scheduleKindLabels[kind]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="sched-field">
                <span>公司</span>
                <input
                  value={form.company}
                  maxLength={100}
                  placeholder="选填"
                  onChange={(event) => setForm({ ...form, company: event.target.value })}
                />
              </label>
              <label className="sched-field">
                <span>岗位</span>
                <input
                  value={form.role}
                  maxLength={100}
                  placeholder="选填"
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                />
              </label>
              <label className="sched-field">
                <span>日期与时间</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                />
              </label>
              <label className="sched-field">
                <span>时长</span>
                <select
                  value={form.duration_minutes}
                  onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })}
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sched-field">
                <span>站内提醒</span>
                <select
                  value={form.remind_days}
                  onChange={(event) => setForm({ ...form, remind_days: event.target.value })}
                >
                  {remindOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sched-field">
                <span>关联工作台岗位</span>
                <select
                  value={form.job_entry_id}
                  onChange={(event) => {
                    const id = event.target.value;
                    const job = jobs.find((item) => item.id === id);
                    setForm({
                      ...form,
                      job_entry_id: id,
                      company: form.company || job?.company || '',
                      role: form.role || job?.title || '',
                    });
                  }}
                >
                  <option value="">不关联</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company ? `${job.company} · ` : ''}
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sched-field full">
                <span>备注</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.note}
                  placeholder="面试形式、准备重点、需要带的材料…"
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                />
              </label>
              <p className="sched-form-hint">
                提醒只在站内展示：到期前后打开本站会在顶部看到提示，不会发送短信或邮件。
              </p>
            </div>
            <footer>
              <button className="button secondary" type="button" onClick={() => setForm(null)}>
                取消
              </button>
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
                {form.id ? '保存修改' : '加入日程'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <p className="sched-footnote">
        想先整理投递进度？
        <Link href="/workspace">去求职工作台</Link>
        把岗位记录下来，这里就能直接关联。
      </p>
    </>
  );
}
