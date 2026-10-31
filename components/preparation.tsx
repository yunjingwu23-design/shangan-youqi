'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Save, Play, Check, Headphones } from 'lucide-react';
import { preparationPayload, practiceTracks, type PracticeTrack } from '@/lib/preparation';
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
export function MockPractice({ signedIn }: { signedIn: boolean }) {
  const [track, setTrack] = useState<PracticeTrack>('product'),
    [started, setStarted] = useState(false),
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<string[]>(['', '', '', '', '']),
    [notes, setNotes] = useState(''),
    [seconds, setSeconds] = useState(0),
    [paused, setPaused] = useState(false),
    [savedId, setSavedId] = useState<string | undefined>(),
    [history, setHistory] = useState<Entry[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [intent, setIntent] = useState({ direction: '互联网 / 产品', availability: '', note: '' });
  const router = useRouter();
  const questions = practiceTracks[track].questions;
  async function load() {
    if (!signedIn) return;
    const data = await call('/api/entries?kind=interview_review');
    setHistory(
      data.entries.filter(
        (entry: Entry) => preparationPayload(entry.content)?.format === 'shangan-text-mock-v1'
      )
    );
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [signedIn]);
  useEffect(() => {
    if (!started || paused) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [started, paused]);
  async function save() {
    setBusy(true);
    setError('');
    try {
      const content = JSON.stringify({
        format: 'shangan-text-mock-v1',
        track,
        questions,
        answers,
        notes,
        seconds,
      });
      const data = await call('/api/entries', savedId ? 'PATCH' : 'POST', {
        ...(savedId ? { id: savedId } : { kind: 'interview_review' }),
        title: `文字模拟 · ${practiceTracks[track].label}`,
        content,
      });
      setSavedId(data.entry.id);
      setNotice('练习回答已保存到个人工作台。');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">PRACTICE WITH PURPOSE</p>
        <h1>模拟面试与表达练习</h1>
        <p>先把真实经历说清楚，再为下一次对话多做一点准备。</p>
      </div>
      <div className="preparation-grid">
        <section className="site-card mock-practice">
          <div className="site-section-title">
            <div>
              <span className="job-badge">自主文字练习</span>
              <h2>{started ? '专注一次真实的回答' : '给自己一次完整作答的机会'}</h2>
            </div>
            {started && (
              <span className="mock-timer">
                {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                {String(seconds % 60).padStart(2, '0')}
              </span>
            )}
          </div>
          <p className="muted">题目是通用练习提示，不是企业真题，也没有自动评分或实时语音服务。</p>
          {!signedIn ? (
            <Link className="button primary" href="/login?next=%2Fmock">
              登录并开始练习
              <ArrowRight size={16} />
            </Link>
          ) : !started ? (
            <>
              <label>
                练习方向
                <select value={track} onChange={(e) => setTrack(e.target.value as PracticeTrack)}>
                  {Object.entries(practiceTracks).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
              <p>共 5 个问题，按自己的节奏作答。回答会在你点击保存后写入个人账号。</p>
              <button
                className="button primary"
                onClick={() => {
                  setStarted(true);
                  setPaused(false);
                  setIndex(0);
                  setAnswers(['', '', '', '', '']);
                  setNotes('');
                  setSeconds(0);
                  setSavedId(undefined);
                  setNotice('');
                }}
              >
                <Play size={16} />
                开始文字模拟
              </button>
            </>
          ) : (
            <>
              <div className="mock-question-count">
                QUESTION {index + 1} / {questions.length}
              </div>
              <h3 className="mock-question">{questions[index]}</h3>
              <label>
                我的回答
                <textarea
                  value={answers[index]}
                  maxLength={2000}
                  rows={8}
                  placeholder="写下你会如何回答，尽量保留具体事实和个人行动。"
                  onChange={(e) =>
                    setAnswers((old) => old.map((v, i) => (i === index ? e.target.value : v)))
                  }
                />
              </label>
              <div className="site-actions">
                <button
                  className="button secondary"
                  disabled={index === 0}
                  onClick={() => setIndex(index - 1)}
                >
                  上一题
                </button>
                <button
                  className="button secondary"
                  disabled={index === questions.length - 1}
                  onClick={() => setIndex(index + 1)}
                >
                  下一题
                </button>
                <button className="site-text-link" onClick={() => setPaused(!paused)}>
                  {paused ? '继续计时' : '暂停计时'}
                </button>
              </div>
              <label className="mock-notes">
                练习后的观察
                <textarea
                  value={notes}
                  rows={3}
                  maxLength={2000}
                  placeholder="哪些例子需要补充？哪段回答可以更直接？"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <div className="site-actions">
                <button className="button primary" disabled={busy} onClick={() => void save()}>
                  <Save size={16} />
                  保存本次练习
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setPaused(true);
                    setStarted(false);
                  }}
                >
                  返回练习设置
                </button>
              </div>
            </>
          )}
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
          {history.length > 0 && (
            <section className="practice-history">
              <h3>我的练习记录</h3>
              {history.map((entry) => (
                <button
                  key={entry.id}
                  className="practice-history-row"
                  onClick={() => {
                    const saved = preparationPayload(entry.content);
                    if (
                      !saved ||
                      typeof saved.track !== 'string' ||
                      !Object.hasOwn(practiceTracks, saved.track)
                    )
                      return;
                    setTrack(saved.track);
                    setAnswers(
                      Array.isArray(saved.answers) &&
                        saved.answers.length === 5 &&
                        saved.answers.every((v: unknown) => typeof v === 'string')
                        ? saved.answers
                        : ['', '', '', '', '']
                    );
                    setNotes(typeof saved.notes === 'string' ? saved.notes : '');
                    setSeconds(Number(saved.seconds) || 0);
                    setSavedId(entry.id);
                    setStarted(true);
                    setPaused(true);
                    setIndex(0);
                    setNotice('已载入保存的文字练习。');
                  }}
                >
                  {entry.title}
                  <span>{new Date(entry.updated_at).toLocaleDateString('zh-CN')}</span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </section>
          )}
        </section>
        <aside>
          <section id="mentor" className="site-card">
            <span className="job-badge">真人 Mock</span>
            <h2>向专业人士预约一对一练习</h2>
            <p>覆盖互联网、技术、金融、咨询与通用面试方向。</p>
            <div className="site-notice">
              导师资料与预约服务尚未开放，目前不展示虚构导师、不收取预约费用。
            </div>
            <p className="muted">可以先保存你的服务意向。意向不是已确认的预约或订单。</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!signedIn) {
                  router.push('/login?next=%2Fmock');
                  return;
                }
                setBusy(true);
                void call('/api/entries', 'POST', {
                  kind: 'interview_review',
                  title: `真人 Mock 意向 · ${intent.direction}`,
                  content: JSON.stringify({ format: 'shangan-mock-interest-v1', ...intent }),
                })
                  .then(() => setNotice('预约意向已保存到个人工作台，尚未确认导师或时间。'))
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              <label>
                希望练习的方向
                <select
                  value={intent.direction}
                  onChange={(e) => setIntent({ ...intent, direction: e.target.value })}
                >
                  {Object.values(practiceTracks).map((track) => (
                    <option key={track.label}>{track.label}</option>
                  ))}
                </select>
              </label>
              <label>
                方便的时间（选填）
                <input
                  value={intent.availability}
                  maxLength={200}
                  onChange={(e) => setIntent({ ...intent, availability: e.target.value })}
                  placeholder="例如：周末下午"
                />
              </label>
              <label>
                希望重点练习的内容
                <textarea
                  value={intent.note}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => setIntent({ ...intent, note: e.target.value })}
                />
              </label>
              <button className="button secondary" type="submit" disabled={busy}>
                {signedIn ? '保存预约意向' : '登录后保存意向'}
              </button>
            </form>
          </section>
          <section className="site-card">
            <h3>面试之后，留下复盘</h3>
            <p>把实际问答和下一步练习记下来，让每次准备都能延续。</p>
            <Link className="site-text-link" href="/review">
              打开复盘中心 →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
export function ReviewNotebook({ interviewsEnabled }: { interviewsEnabled: boolean }) {
  const [rows, setRows] = useState<Entry[]>([]),
    [jobs, setJobs] = useState<Entry[]>([]),
    [id, setId] = useState<string | undefined>(),
    [title, setTitle] = useState('我的面试复盘'),
    [jobId, setJobId] = useState(''),
    [round, setRound] = useState('一面'),
    [date, setDate] = useState(''),
    [questions, setQuestions] = useState(''),
    [answers, setAnswers] = useState(''),
    [reflection, setReflection] = useState(''),
    [nextSteps, setNextSteps] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function load() {
    const [records, applications] = await Promise.all([
      call('/api/entries?kind=interview_review'),
      call('/api/entries?kind=application'),
    ]);
    setRows(records.entries);
    setJobs(applications.entries);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const job = jobs.find((j) => j.id === jobId);
      const content = JSON.stringify({
        format: 'shangan-manual-review-v1',
        jobId,
        jobTitle: job?.title || '',
        round,
        date,
        questions,
        answers,
        reflection,
        nextSteps,
      });
      const result = await call('/api/entries', id ? 'PATCH' : 'POST', {
        ...(id ? { id } : { kind: 'interview_review' }),
        title,
        company: job?.company || '',
        content,
      });
      setId(result.entry.id);
      setNotice('复盘笔记已保存到个人工作台。');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  function open(entry: Entry) {
    const data = preparationPayload(entry.content);
    setId(entry.id);
    setTitle(entry.title);
    setJobId(typeof data?.jobId === 'string' ? data.jobId : '');
    setRound(typeof data?.round === 'string' ? data.round : '一面');
    setDate(typeof data?.date === 'string' ? data.date : '');
    setQuestions(typeof data?.questions === 'string' ? data.questions : '');
    setAnswers(typeof data?.answers === 'string' ? data.answers : '');
    setReflection(typeof data?.reflection === 'string' ? data.reflection : entry.content);
    setNextSteps(typeof data?.nextSteps === 'string' ? data.nextSteps : '');
    setNotice('已载入复盘记录。');
  }
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">TURN EXPERIENCE INTO PROGRESS</p>
        <h1>面试复盘中心</h1>
        <p>先还原发生了什么，再找到下一次可以做得更好的地方。</p>
      </div>
      <section className="review-ai-banner">
        <div>
          <Headphones size={26} />
          <h2>录音转写与 AI 面试复盘</h2>
          <p>
            {interviewsEnabled
              ? '上传已获授权的录音，校对逐字稿后生成有原文依据的报告。'
              : '录音转写与 AI 分析正在内测准备中。你现在可以先保存真实问答和自己的复盘笔记。'}
          </p>
        </div>
        {interviewsEnabled ? (
          <Link className="button primary" href="/workspace/interviews">
            进入录音复盘
            <ArrowRight size={16} />
          </Link>
        ) : (
          <span className="job-badge">AI 内测尚未开放</span>
        )}
      </section>
      <div className="preparation-grid">
        <form className="site-card review-form" onSubmit={(event) => void save(event)}>
          <div className="site-section-title">
            <h2>我的复盘笔记</h2>
            <button
              type="button"
              className="site-text-link"
              onClick={() => {
                setId(undefined);
                setTitle('我的面试复盘');
                setJobId('');
                setRound('一面');
                setDate('');
                setQuestions('');
                setAnswers('');
                setReflection('');
                setNextSteps('');
                setNotice('');
              }}
            >
              新建笔记
            </button>
          </div>
          <label>
            复盘标题
            <input
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="form-two-col">
            <label>
              关联投递岗位
              <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">暂不关联</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.company} · {job.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              面试轮次
              <select value={round} onChange={(e) => setRound(e.target.value)}>
                {['一面', '二面', 'HR 面', '终面', '其他'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            面试日期
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {[
            { label: '实际被问到的问题', value: questions, set: setQuestions },
            { label: '我当时的实际回答', value: answers, set: setAnswers },
            { label: '我的观察与待确认部分', value: reflection, set: setReflection },
            { label: '下一步练习清单', value: nextSteps, set: setNextSteps },
          ].map((field) => (
            <label key={field.label}>
              {field.label}
              <textarea
                value={field.value}
                maxLength={field.label === '我的观察与待确认部分' ? 6000 : 3000}
                rows={4}
                onChange={(e) => field.set(e.target.value)}
              />
            </label>
          ))}
          <p className="muted">以上为你的手动笔记，不包含自动 AI 评价。记不清的部分请明确标注。</p>
          {error && (
            <p role="alert" className="site-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="site-success">
              {notice}
            </p>
          )}
          <button className="button primary" disabled={busy} type="submit">
            <Save size={16} />
            保存复盘笔记
          </button>
        </form>
        <aside className="site-card review-history">
          <h2>我的复盘记录</h2>
          {!rows.length && <p className="muted">保存第一份笔记，或从模拟面试开始。</p>}
          {rows.map((entry) => {
            const value = preparationPayload(entry.content);
            const practice = value?.format === 'shangan-text-mock-v1';
            const interest = value?.format === 'shangan-mock-interest-v1';
            return (
              <div className="review-history-row" key={entry.id}>
                <span className="job-badge">
                  {practice
                    ? '文字模拟'
                    : value?.format === 'shangan-mock-interest-v1'
                      ? 'Mock 意向'
                      : '复盘笔记'}
                </span>
                <h3>{entry.title}</h3>
                <small>{new Date(entry.updated_at).toLocaleString('zh-CN')}</small>
                {practice ? (
                  <Link className="site-text-link" href="/mock">
                    打开模拟面试 →
                  </Link>
                ) : interest ? (
                  <div>
                    <p className="muted">
                      方向：{typeof value.direction === 'string' ? value.direction : ''}
                      <br />
                      方便时间：
                      {typeof value.availability === 'string' && value.availability
                        ? value.availability
                        : '待确定'}
                      <br />
                      练习需求：{typeof value.note === 'string' ? value.note : ''}
                    </p>
                    <p className="muted">仅为服务意向，尚未确认预约。</p>
                    <Link className="site-text-link" href="/mock#mentor">
                      返回真人 Mock 说明 →
                    </Link>
                  </div>
                ) : (
                  <button className="site-text-link" onClick={() => open(entry)}>
                    查看 / 编辑
                  </button>
                )}
                <button
                  className="site-text-link site-danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('删除这条复盘记录？')) {
                      setBusy(true);
                      void call('/api/entries', 'DELETE', { id: entry.id })
                        .then(() => {
                          if (id === entry.id) setId(undefined);
                          return load();
                        })
                        .catch((e) => setError(e.message))
                        .finally(() => setBusy(false));
                    }
                  }}
                >
                  删除
                </button>
              </div>
            );
          })}
          <Link href="/interviews" className="button secondary">
            阅读复盘方法
            <Check size={15} />
          </Link>
        </aside>
      </div>
    </main>
  );
}
