'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDraftState, useDraftStorage } from '@/components/drafts';
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
export function MockPractice({
  signedIn,
  mode = 'practice',
}: {
  signedIn: boolean;
  mode?: 'practice' | 'service';
}) {
  const [track, setTrack] = useDraftState<PracticeTrack>('practice:track', 'product'),
    [started, setStarted] = useDraftState('practice:started', false),
    [index, setIndex] = useDraftState('practice:index', 0),
    [answers, setAnswers] = useDraftState<string[]>('practice:answers', ['', '', '', '', '']),
    [notes, setNotes] = useDraftState('practice:notes', ''),
    [seconds, setSeconds] = useDraftState('practice:seconds', 0),
    [paused, setPaused] = useDraftState('practice:paused', false),
    [savedId, setSavedId] = useDraftState<string | undefined>('practice:id', undefined),
    [history, setHistory] = useState<Entry[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [intent, setIntent] = useDraftState('mock:intent', {
      direction: '互联网 / 产品',
      availability: '',
      note: '',
    });
  const router = useRouter(),
    params = useSearchParams();
  const practiceIdentity = useDraftStorage<string>('practice:id');
  const questions = practiceTracks[track].questions;
  async function load() {
    if (!signedIn) return;
    const data = await call('/api/entries?kind=interview_review');
    const requested = params.get('id');
    if (mode === 'practice' && requested) {
      const target =
        data.entries.find((entry: Entry) => entry.id === requested) ||
        (await call('/api/entries?kind=interview_review&id=' + encodeURIComponent(requested)))
          .entries[0];
      if (!target || preparationPayload(target.content)?.format !== 'shangan-text-mock-v1')
        throw new Error('练习记录不存在或已删除。');
      if (practiceIdentity.read() !== requested) openPractice(target);
    }
    setHistory(
      data.entries.filter(
        (entry: Entry) => preparationPayload(entry.content)?.format === 'shangan-text-mock-v1'
      )
    );
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [signedIn, params.get('id'), mode]);
  useEffect(() => {
    if (mode !== 'practice' || !started || paused) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [started, paused, mode]);
  function openPractice(entry: Entry) {
    const saved = preparationPayload(entry.content);
    if (!saved || typeof saved.track !== 'string' || !Object.hasOwn(practiceTracks, saved.track))
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
    window.history.replaceState(null, '', '/interview-center/practice?id=' + entry.id);
  }
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
      window.history.replaceState(null, '', '/interview-center/practice?id=' + data.entry.id);
      setNotice('练习回答已保存到个人工作台。');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`site-main ${mode === 'service' ? 'ia-mock-service' : 'ia-mock-practice'}`}>
      <div className="site-page-title">
        <p className="site-eyebrow">PRACTICE WITH PURPOSE</p>
        <h1>{mode === 'service' ? '真人 Mock Interview' : '文字面试练习'}</h1>
        <p>先把真实经历说清楚，再为下一次对话多做一点准备。</p>
        <p className="ia-draft-note">
          未保存的文字会在当前标签页临时保留；需要点击保存才会同步到账号。
        </p>
      </div>
      <div className="preparation-grid">
        {mode === 'practice' && (
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
            <p className="muted">
              题目是通用练习提示，不是企业真题，也没有自动评分或实时语音服务。
            </p>
            {!signedIn ? (
              <Link className="button primary" href="/login?next=%2Finterview-center%2Fpractice">
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
                    window.history.replaceState(null, '', '/interview-center/practice');
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
                    onClick={() => openPractice(entry)}
                  >
                    {entry.title}
                    <span>{new Date(entry.updated_at).toLocaleDateString('zh-CN')}</span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </section>
            )}
          </section>
        )}
        {mode === 'service' && (
          <aside>
            <section id="mentor" className="site-card">
              <span className="job-badge">真人 Mock</span>
              <h2>向专业人士预约一对一练习</h2>
              <p>覆盖互联网、技术、金融、咨询与通用面试方向。</p>
              <div className="site-notice">
                导师资料与预约服务尚未开放，目前不展示虚构导师、不收取预约费用。
              </div>
              <p className="muted">可以先保存你的服务意向。意向不是已确认的预约或订单。</p>
              {!signedIn ? (
                <Link className="button primary" href="/login?next=%2Finterview-center%2Fmock">
                  登录并保存服务意向 →
                </Link>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!signedIn) {
                      router.push('/login?next=%2Finterview-center%2Fmock');
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
              <Link href="/interview-center/practice" className="site-text-link">
                先做一次文字练习 →
              </Link>
            </section>
            <section className="site-card">
              <h3>面试之后，留下复盘</h3>
              <p>把实际问答和下一步练习记下来，让每次准备都能延续。</p>
              <Link className="site-text-link" href="/review">
                打开复盘中心 →
              </Link>
            </section>
          </aside>
        )}
      </div>
    </main>
  );
}
export function ReviewNotebook({ interviewsEnabled }: { interviewsEnabled: boolean }) {
  const [rows, setRows] = useState<Entry[]>([]),
    [jobs, setJobs] = useState<Entry[]>([]),
    [id, setId] = useDraftState<string | undefined>('notes:id', undefined),
    [title, setTitle] = useDraftState('notes:title', '我的面试复盘'),
    [jobId, setJobId] = useDraftState('notes:jobId', ''),
    [round, setRound] = useDraftState('notes:round', '一面'),
    [date, setDate] = useDraftState('notes:date', ''),
    [questions, setQuestions] = useDraftState('notes:questions', ''),
    [answers, setAnswers] = useDraftState('notes:answers', ''),
    [reflection, setReflection] = useDraftState('notes:reflection', ''),
    [nextSteps, setNextSteps] = useDraftState('notes:nextSteps', ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const params = useSearchParams();
  const noteIdentity = useDraftStorage<string>('notes:id');
  async function load() {
    const [records, applications] = await Promise.all([
      call('/api/entries?kind=interview_review'),
      call('/api/entries?kind=application'),
    ]);
    setRows(records.entries);
    const requested = params.get('id');
    if (requested) {
      const entry =
        records.entries.find((item: Entry) => item.id === requested) ||
        (await call('/api/entries?kind=interview_review&id=' + encodeURIComponent(requested)))
          .entries[0];
      if (!entry) throw new Error('笔记不存在或已被删除。');
      if (
        noteIdentity.read() !== requested &&
        !['shangan-text-mock-v1', 'shangan-mock-interest-v1'].includes(
          preparationPayload(entry.content)?.format
        )
      )
        open(entry);
    }
    setJobs(applications.entries);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [params.get('id')]);
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
      window.history.replaceState(null, '', '/interview-center/notes?id=' + result.entry.id);
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
        <h1>手动复盘笔记</h1>
        <p>先还原发生了什么，再找到下一次可以做得更好的地方。</p>
        <p className="ia-draft-note">
          未保存的笔记在当前标签页临时保留，保存后才会同步到其他设备。
        </p>
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
                window.history.replaceState(null, '', '/interview-center/notes');
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
        <aside className="site-card">
          <h2>所有面试记录</h2>
          <p>录音复盘、文字练习和笔记统一保存在我的面试历史中。</p>
          <Link href="/interview-center/history" className="button secondary">
            查看我的面试历史 →
          </Link>
        </aside>
      </div>
    </main>
  );
}
