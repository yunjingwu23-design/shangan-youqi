'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDraftState } from '@/components/drafts';
import { ArrowRight, Check, Plus, Save, Trash2 } from 'lucide-react';
import { practiceTracks } from '@/lib/preparation';
import {
  createPlan,
  parsePlan,
  planProgress,
  type PrepPlan,
  type PrepStage,
  type PrepTask,
} from '@/lib/prep-plan';
import type { Entry } from '@/lib/validation';

async function call(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401 ? '登录已过期，请重新登录。' : data.error || '保存失败，请重试。'
    );
  return data;
}

export function PrepPlan() {
  const params = useSearchParams();
  const [plans, setPlans] = useState<Entry[]>([]);
  const [jobs, setJobs] = useState<Entry[]>([]);
  const [savedId, setSavedId] = useDraftState<string | undefined>('prep:id', undefined);
  const [plan, setPlan] = useState<PrepPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [direction, setDirection] = useState<string>('互联网 / 产品');
  const [jobId, setJobId] = useState('');

  async function load() {
    const [planRows, appRows] = await Promise.all([
      call('/api/entries?kind=interview_review'),
      call('/api/entries?kind=application'),
    ]);
    setPlans(
      planRows.entries.filter(
        (entry: Entry) => parsePlan(entry.content) !== null
      )
    );
    setJobs(appRows.entries);
    const requested = params.get('id');
    if (requested) {
      const entry =
        planRows.entries.find((item: Entry) => item.id === requested) ||
        (await call('/api/entries?kind=interview_review&id=' + encodeURIComponent(requested)))
          .entries[0];
      const parsed = entry ? parsePlan(entry.content) : null;
      if (!parsed) throw new Error('准备计划不存在或已删除。');
      if (savedId !== requested) open(entry, parsed);
    }
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : '加载失败。'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('id')]);

  function open(entry: Entry, parsed: PrepPlan) {
    setSavedId(entry.id);
    setPlan(parsed);
    setDirection(parsed.direction);
    setJobId(parsed.jobId);
    setNotice('');
    window.history.replaceState(null, '', '/interview-center/plan?id=' + entry.id);
  }

  function startNew() {
    const job = jobs.find((j) => j.id === jobId);
    setPlan(createPlan(direction, jobId, job ? `${job.company} · ${job.title}` : ''));
    setSavedId(undefined);
    setNotice('已生成准备计划，勾选完成的任务后记得保存。');
    window.history.replaceState(null, '', '/interview-center/plan');
  }

  function toggleTask(stageId: string, taskId: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      stages: plan.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              tasks: stage.tasks.map((task) =>
                task.id === taskId ? { ...task, done: !task.done } : task
              ),
            }
          : stage
      ),
    });
  }

  function addTask(stageId: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      stages: plan.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              tasks: [
                ...stage.tasks,
                { id: `${stage.id}-${Date.now()}`, title: '', done: false },
              ],
            }
          : stage
      ),
    });
  }

  function updateTaskTitle(stageId: string, taskId: string, title: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      stages: plan.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              tasks: stage.tasks.map((task) =>
                task.id === taskId ? { ...task, title } : task
              ),
            }
          : stage
      ),
    });
  }

  function removeTask(stageId: string, taskId: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      stages: plan.stages.map((stage) =>
        stage.id === stageId
          ? { ...stage, tasks: stage.tasks.filter((task) => task.id !== taskId) }
          : stage
      ),
    });
  }

  async function save() {
    if (!plan) return;
    setBusy(true);
    setError('');
    try {
      const job = jobs.find((j) => j.id === plan.jobId);
      const title = plan.jobTitle || (job ? `${job.company} · ${job.title}` : '面试准备计划');
      const result = await call('/api/entries', savedId ? 'PATCH' : 'POST', {
        ...(savedId ? { id: savedId } : { kind: 'interview_review' }),
        title,
        company: job?.company || '',
        content: JSON.stringify(plan),
      });
      setSavedId(result.entry.id);
      window.history.replaceState(null, '', '/interview-center/plan?id=' + result.entry.id);
      setNotice('准备计划已保存，进度已同步到你的账号。');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }

  const progress = plan ? planProgress(plan) : null;

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">A PLAN YOU CAN FINISH</p>
        <h1>面试准备计划</h1>
        <p>把准备拆成能勾选的小步骤，进度保存在你的账号里。</p>
      </div>

      {!plan ? (
        <div className="preparation-grid">
          <section className="site-card">
            <h2>新建一份准备计划</h2>
            <p className="muted">选择目标方向，自动生成分阶段任务清单，之后可自由增删和勾选。</p>
            <label>
              准备方向
              <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                {Object.values(practiceTracks).map((track) => (
                  <option key={track.label}>{track.label}</option>
                ))}
              </select>
            </label>
            <label>
              关联投递岗位（选填）
              <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">暂不关联</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.company} · {job.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary" onClick={startNew}>
              <Plus size={16} />
              生成准备计划
            </button>
            {error && (
              <p className="site-error" role="alert">
                {error}
              </p>
            )}
          </section>
          <aside className="site-card">
            <h2>继续之前的计划</h2>
            {plans.length === 0 ? (
              <p className="muted">还没有保存过的准备计划。</p>
            ) : (
              <div className="practice-history">
                {plans.map((entry) => (
                  <button
                    key={entry.id}
                    className="practice-history-row"
                    onClick={() => open(entry, parsePlan(entry.content)!)}
                  >
                    {entry.title}
                    <span>
                      {(() => {
                        const p = parsePlan(entry.content);
                        return p ? `${planProgress(p).done}/${planProgress(p).total} 完成` : '';
                      })()}
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            )}
            <p className="muted" style={{ marginTop: '1rem' }}>
              准备计划与你保存的文字练习、复盘笔记一起，统一存在「我的面试历史」中。
            </p>
            <Link href="/interview-center/history" className="site-text-link">
              查看我的面试历史 →
            </Link>
          </aside>
        </div>
      ) : (
        <>
          <section className="site-card prep-progress">
            <div className="site-section-title">
              <div>
                <span className="job-badge">{plan.direction}</span>
                <h2>{plan.jobTitle || '未关联岗位的准备计划'}</h2>
              </div>
              <span className="mock-timer">
                {progress?.done}/{progress?.total} 完成
              </span>
            </div>
            <div className="prep-progress-bar">
              <div
                className="prep-progress-fill"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>
            <p className="muted">
              {progress?.percent === 100
                ? '全部完成，祝你面试顺利。'
                : '完成一项就勾选一项，进度会自动保存（记得点下方保存）。'}
            </p>
          </section>

          {plan.stages.map((stage) => (
            <PrepStageCard
              key={stage.id}
              stage={stage}
              onToggle={(taskId) => toggleTask(stage.id, taskId)}
              onAdd={() => addTask(stage.id)}
              onTitle={(taskId, title) => updateTaskTitle(stage.id, taskId, title)}
              onRemove={(taskId) => removeTask(stage.id, taskId)}
            />
          ))}

          <div className="site-actions" style={{ marginTop: '1rem' }}>
            <button className="button primary" disabled={busy} onClick={() => void save()}>
              <Save size={16} />
              保存准备计划
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setPlan(null);
                setSavedId(undefined);
                window.history.replaceState(null, '', '/interview-center/plan');
              }}
            >
              返回计划列表
            </button>
          </div>
          {error && (
            <p className="site-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="site-success" role="status">
              {notice}
            </p>
          )}
        </>
      )}
    </main>
  );
}

function PrepStageCard({
  stage,
  onToggle,
  onAdd,
  onTitle,
  onRemove,
}: {
  stage: PrepStage;
  onToggle: (taskId: string) => void;
  onAdd: () => void;
  onTitle: (taskId: string, title: string) => void;
  onRemove: (taskId: string) => void;
}) {
  const doneCount = stage.tasks.filter((t) => t.done).length;
  return (
    <section className="site-card prep-stage">
      <div className="site-section-title">
        <h3>{stage.title}</h3>
        <span className="job-badge">
          {doneCount}/{stage.tasks.length}
        </span>
      </div>
      <ul className="prep-task-list">
        {stage.tasks.map((task) => (
          <PrepTaskRow
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onTitle={(title) => onTitle(task.id, title)}
            onRemove={() => onRemove(task.id)}
          />
        ))}
      </ul>
      <button className="site-text-link" onClick={onAdd}>
        <Plus size={14} />
        添加自定义任务
      </button>
    </section>
  );
}

function PrepTaskRow({
  task,
  onToggle,
  onTitle,
  onRemove,
}: {
  task: PrepTask;
  onToggle: () => void;
  onTitle: (title: string) => void;
  onRemove: () => void;
}) {
  return (
    <li className={`prep-task ${task.done ? 'done' : ''}`}>
      <button
        className="prep-task-check"
        onClick={onToggle}
        aria-label={task.done ? '标记为未完成' : '标记为完成'}
        type="button"
      >
        {task.done && <Check size={14} />}
      </button>
      <input
        className="prep-task-title"
        value={task.title}
        maxLength={200}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="写下这一步要做什么"
      />
      <button
        className="prep-task-remove"
        onClick={onRemove}
        aria-label="删除任务"
        type="button"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
