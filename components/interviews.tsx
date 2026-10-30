'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Upload,
  FileAudio,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Check,
  Headphones,
  LoaderCircle,
} from 'lucide-react';
import { MAX_AUDIO_BYTES, type Segment, type InterviewReport } from '@/lib/interviews/schema';
import {
  interviewStatus,
  interviewErrors,
  type InterviewRecord,
  type InterviewDetail,
} from '@/lib/interviews/types';

async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (response.status === 401) {
    window.location.assign('/login?reason=expired');
    throw new Error('请重新登录。');
  }
  if (!response.ok) throw new Error(result.error || '请求未完成，请稍后重试。');
  return result;
}
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : '网络连接失败，请重试。';
const dateText = (value: string) => new Date(value).toLocaleString('zh-CN');
const timeText = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
type Usage = {
  uploads: number;
  monthly_uploads: number;
  audio_seconds: number;
  monthly_audio_seconds: number;
  estimated_usd: number;
  monthly_usd: number;
  input_tokens: number;
  output_tokens: number;
};
function UsageCard({ usage }: { usage: Usage | null }) {
  return (
    usage && (
      <div className="interview-usage">
        <span>
          本月录音{' '}
          <b>
            {usage.uploads} / {usage.monthly_uploads}
          </b>
        </span>
        <span>
          转写调用{' '}
          <b>
            {Math.ceil(usage.audio_seconds / 60)} / {Math.floor(usage.monthly_audio_seconds / 60)}{' '}
            分钟
          </b>
        </span>
        <span>
          费用估算{' '}
          <b>
            US${Number(usage.estimated_usd).toFixed(4)} / {Number(usage.monthly_usd).toFixed(2)}
          </b>
        </span>
        <small>重试与重新生成也计入用量，最终费用以服务商账单为准。</small>
      </div>
    )
  );
}

export function InterviewHistory() {
  const [items, setItems] = useState<InterviewRecord[]>([]),
    [usage, setUsage] = useState<Usage | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [next, setNext] = useState<number | null>(null);
  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const [rows, quota] = await Promise.all([
        request(`/api/interviews?offset=${offset}`),
        request('/api/interviews/usage'),
      ]);
      setItems((old) => (offset ? [...old, ...rows.interviews] : rows.interviews));
      setNext(rows.nextOffset);
      setUsage(quota.usage);
      setError('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main className="interview-page">
      <div className="interview-title">
        <div>
          <p className="eyebrow">TURN EXPERIENCE INTO PROGRESS</p>
          <h1>每次面试，都有下一步</h1>
          <p className="muted">留住真实对话，找到值得练习的地方。</p>
        </div>
        <Link href="/workspace/interviews/new" className="button primary">
          <Plus size={17} />
          上传面试录音
        </Link>
      </div>
      <UsageCard usage={usage} />
      {error && (
        <p role="alert" className="alert error">
          {error}
          <button className="text-button" onClick={() => void load()}>
            重试
          </button>
        </p>
      )}
      {!loading && items.length === 0 ? (
        <section className="interview-empty">
          <Headphones size={38} />
          <h2>从一份真实录音开始</h2>
          <p>上传、校对，再生成属于你的面试复盘。</p>
          <Link className="button primary" href="/workspace/interviews/new">
            创建第一份复盘
            <ArrowRight size={16} />
          </Link>
        </section>
      ) : (
        <div className="interview-list">
          {items.map((item) => (
            <Link
              className="interview-record"
              key={item.id}
              href={`/workspace/interviews/${item.id}/${item.status === 'complete' ? 'report' : item.status === 'review' ? 'transcript' : 'progress'}`}
            >
              <FileAudio size={24} />
              <div>
                <h2>{item.title}</h2>
                <p>
                  {item.job_title} · {item.round}
                </p>
                <small>{dateText(item.created_at)}</small>
              </div>
              <span className="interview-state">{interviewStatus[item.status]}</span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      )}
      {loading && (
        <p role="status" className="muted">
          正在读取你的复盘记录…
        </p>
      )}
      {next !== null && (
        <button className="button secondary" disabled={loading} onClick={() => void load(next)}>
          加载更多
        </button>
      )}
    </main>
  );
}

function uploadFile(
  url: string,
  file: File,
  mimeType: string,
  onProgress: (value: number) => void,
  signal: AbortSignal
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.timeout = 10 * 60 * 1000;
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.setRequestHeader('x-upsert', 'false');
    const abort = () => xhr.abort();
    signal.addEventListener('abort', abort, { once: true });
    const finish = (error?: string) => {
      signal.removeEventListener('abort', abort);
      error ? reject(new Error(error)) : resolve();
    };
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      finish(
        xhr.status >= 200 && xhr.status < 300
          ? undefined
          : '录音上传未完成，请重试或删除记录后重新上传。'
      );
    xhr.onerror = () => finish('上传连接中断，请重试。');
    xhr.ontimeout = () => finish('上传超时，请检查网络后重试。');
    xhr.onabort = () => finish('上传已取消。');
    xhr.send(file);
  });
}
export function InterviewUpload() {
  const router = useRouter();
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]),
    [jobId, setJobId] = useState('new'),
    [jobTitle, setJobTitle] = useState(''),
    [company, setCompany] = useState('');
  const [title, setTitle] = useState(''),
    [round, setRound] = useState('第一轮'),
    [file, setFile] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [contextConsent, setContextConsent] = useState(false),
    [jd, setJd] = useState(''),
    [resume, setResume] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [progress, setProgress] = useState(0),
    [createdId, setCreatedId] = useState<string | null>(null);
  const uploadAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    request('/api/entries?kind=application')
      .then((data) => {
        setJobs(data.entries);
        if (data.entries.length) setJobId(data.entries[0].id);
      })
      .catch((e) => setError(errorText(e)));
    return () => uploadAbort.current?.abort();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('请选择面试录音。');
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError('文件超过 50 MiB，请先导出较小的音频。');
      return;
    }
    setBusy(true);
    setError('');
    uploadAbort.current = new AbortController();
    try {
      let id = createdId;
      if (!id) {
        const selected =
          jobId === 'new'
            ? (
                await request('/api/entries', 'POST', {
                  kind: 'application',
                  title: jobTitle,
                  company,
                })
              ).entry.id
            : jobId;
        const types: Record<string, string> = {
          mp3: 'audio/mpeg',
          m4a: 'audio/mp4',
          wav: 'audio/wav',
          mp4: 'video/mp4',
          webm: 'audio/webm',
          ogg: 'audio/ogg',
        };
        const mimeType = file.type || types[file.name.split('.').pop()?.toLowerCase() || ''];
        const result = await request('/api/interviews', 'POST', {
          jobId: selected,
          title,
          round,
          fileName: file.name,
          fileSize: file.size,
          mimeType,
          recordingConsent: consent,
          contextConsent,
          jd,
          resume,
        });
        id = result.id;
        setCreatedId(id);
      }
      const grant = await request(`/api/interviews/${id}/upload`, 'POST', {});
      const types: Record<string, string> = {
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        wav: 'audio/wav',
        mp4: 'video/mp4',
        webm: 'audio/webm',
        ogg: 'audio/ogg',
      };
      await uploadFile(
        grant.uploadUrl,
        file,
        file.type || types[file.name.split('.').pop()?.toLowerCase() || ''],
        setProgress,
        uploadAbort.current.signal
      );
      await request(`/api/interviews/${id}/transcribe`, 'POST', {});
      router.push(`/workspace/interviews/${id}/progress`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="interview-page interview-narrow">
      <Link className="text-button" href="/workspace/interviews">
        ← 返回复盘记录
      </Link>
      <p className="eyebrow">START WITH THE REAL CONVERSATION</p>
      <h1>上传面试录音</h1>
      <p className="muted">先还原对话，再认真复盘。生成报告前，你可以校对每一段文字。</p>
      <form className="interview-card interview-form" onSubmit={submit}>
        <fieldset disabled={busy || Boolean(createdId)}>
          <label>
            复盘标题
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              placeholder="例如：产品经理 · 一面"
            />
          </label>
          <div className="interview-grid">
            <label>
              关联岗位
              <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
                <option value="new">＋ 新建投递岗位</option>
              </select>
            </label>
            <label>
              面试轮次
              <input
                value={round}
                onChange={(e) => setRound(e.target.value)}
                maxLength={60}
                required
              />
            </label>
          </div>
          {jobId === 'new' && (
            <div className="interview-grid">
              <label>
                岗位名称
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label>
                公司（选填）
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={100}
                />
              </label>
            </div>
          )}
          <label className="interview-upload">
            <Upload size={28} />
            <strong>{file ? file.name : '选择一份录音文件'}</strong>
            <span>MP3 / M4A / WAV / MP4 / WebM / OGG · 最大 50 MiB · 最长 120 分钟</span>
            <input
              type="file"
              accept=".mp3,.m4a,.wav,.mp4,.webm,.ogg"
              required
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setProgress(0);
              }}
            />
          </label>
          <details className="interview-context">
            <summary>补充 JD 和简历（选填）</summary>
            <p className="muted">
              只填写你有权提供的内容。未提供时，报告会明确说明岗位或经历依据不足。
            </p>
            <label>
              岗位 JD
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                maxLength={10000}
                rows={5}
              />
            </label>
            <label>
              简历中的相关经历
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                maxLength={15000}
                rows={5}
              />
            </label>
            <label className="interview-checkbox">
              <input
                type="checkbox"
                checked={contextConsent}
                onChange={(e) => setContextConsent(e.target.checked)}
                required={Boolean(jd || resume)}
              />
              我有权提供上述资料，并同意用于本次复盘分析。
            </label>
          </details>
          <div className="interview-privacy">
            <ShieldCheck size={20} />
            <div>
              <strong>上传前，请确认录音授权</strong>
              <p>
                录音须合法取得，并已获得必要参与者的授权。音频会发送至 OpenAI
                转写；校对确认后的文字及你授权的资料会用于 AI
                分析。录音保存在私人空间，可删除录音、逐字稿与报告。
              </p>
              <p>
                取消后已发出的模型请求仍可能产生费用。删除会立即移除访问，后台还会清理在途上传产生的残留文件。
              </p>
            </div>
          </div>
          <label className="interview-checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            我确认录音来源合法、已获得必要授权，并同意上述处理方式。
          </label>
        </fieldset>
        <p className="muted">
          预算参考：转写约 US$0.006/分钟，另计报告费用。实际用量可在历史记录查看。
        </p>
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        {busy && (
          <div>
            <progress max={100} value={progress} />
            <p role="status">正在上传 {progress}%</p>
            <button
              type="button"
              className="text-button"
              onClick={() => uploadAbort.current?.abort()}
            >
              取消上传
            </button>
          </div>
        )}
        <div className="interview-actions">
          <button className="button primary" disabled={busy} type="submit">
            {busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}
            上传并开始转写
          </button>
          {createdId && (
            <Link href={`/workspace/interviews/${createdId}/progress`} className="text-button">
              查看已创建的记录
            </Link>
          )}
        </div>
      </form>
    </main>
  );
}

export function InterviewDetailPage({ id, view }: { id: string; view: string }) {
  const router = useRouter();
  const [data, setData] = useState<InterviewDetail | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]),
    [version, setVersion] = useState(0),
    [confirmed, setConfirmed] = useState(false),
    [report, setReport] = useState<InterviewReport | null>(null),
    [editing, setEditing] = useState(false),
    [audio, setAudio] = useState('');
  const dirty = useRef(false),
    reportDirty = useRef(false);
  const load = useCallback(async () => {
    try {
      const result: InterviewDetail = await request(`/api/interviews/${id}`);
      setData(result);
      if (!dirty.current) {
        setSegments(result.transcript?.segments || []);
        setVersion(result.transcript?.version || 0);
      }
      if (!reportDirty.current) setReport(result.reports[0]?.body || null);
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const active = Boolean(
    data && ['queued', 'transcribing', 'analyzing'].includes(data.interview.status)
  );
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void load(), 2500);
    return () => clearInterval(timer);
  }, [active, load]);
  async function operate(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveTranscript() {
    await request(`/api/interviews/${id}/transcript`, 'PUT', { version, segments });
    dirty.current = false;
    await load();
    setConfirmed(false);
    setNotice('校对稿已保存为新版本。');
  }
  function changeSegment(index: number, changes: Partial<Segment>) {
    dirty.current = true;
    setConfirmed(false);
    setSegments((old) => old.map((s, i) => (i === index ? { ...s, ...changes } : s)));
  }
  async function generate() {
    if (!confirmed) throw new Error('请先确认已经校对逐字稿。');
    let currentVersion = version;
    if (dirty.current) {
      await request(`/api/interviews/${id}/transcript`, 'PUT', { version, segments });
      currentVersion++;
      dirty.current = false;
    }
    await request(`/api/interviews/${id}/report`, 'POST', {
      version: currentVersion,
      confirmed: true,
    });
    setConfirmed(false);
    await load();
    router.push(`/workspace/interviews/${id}/progress`);
  }
  const latest = data?.reports[0];
  const base = `/workspace/interviews/${id}`;
  return (
    <main className="interview-page">
      <Link href="/workspace/interviews" className="text-button">
        ← 返回复盘记录
      </Link>
      <div className="interview-title">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h1>{data?.interview.title || '面试复盘'}</h1>
          {data && (
            <p className="muted">
              {data.interview.job_title} · {data.interview.round} ·{' '}
              {dateText(data.interview.created_at)}
            </p>
          )}
        </div>
        {data && <span className="interview-state">{interviewStatus[data.interview.status]}</span>}
      </div>
      <nav className="interview-tabs">
        {[
          ['progress', '转写与进度'],
          ['transcript', '逐字稿校对'],
          ['report', '复盘报告'],
        ].map(([key, label]) => (
          <Link key={key} className={view === key ? 'active' : ''} href={`${base}/${key}`}>
            {label}
          </Link>
        ))}
      </nav>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="alert success">
          {notice}
        </p>
      )}
      {!data ? (
        <p className="muted">正在读取面试记录…</p>
      ) : view === 'progress' ? (
        <section className="interview-card interview-progress">
          <Headphones size={40} />
          <h2>{interviewStatus[data.interview.status]}</h2>
          <progress max={100} value={data.task?.progress || 0} />
          <p>
            {data.task
              ? `已完成 ${data.task.progress}% · 第 ${data.task.attempts} 次处理`
              : '录音尚未提交转写'}
          </p>
          {active && (
            <p className="muted">
              任务在后台持续处理，你可以关闭页面后再回来。排队中若长时间没有变化，请联系管理员检查后台服务。
            </p>
          )}
          {data.interview.error_code && (
            <p className="alert error">
              {interviewErrors[data.interview.error_code] || '处理未完成，请检查后重试。'}
            </p>
          )}
          <div className="interview-actions">
            {active && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void operate(async () => {
                    await request(`${base.replace('/workspace', '/api')}/cancel`, 'POST', {});
                    await load();
                  })
                }
              >
                取消任务
              </button>
            )}
            {['failed', 'cancelled'].includes(data.interview.status) && (
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void operate(async () => {
                    await request(`/api/interviews/${id}/retry`, 'POST', {});
                    await load();
                  })
                }
              >
                <RefreshCw size={16} />
                重试处理
              </button>
            )}
            {data.interview.status === 'awaiting_upload' && (
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void operate(async () => {
                    await request(`/api/interviews/${id}/transcribe`, 'POST', {});
                    await load();
                  })
                }
              >
                检查录音并开始转写
              </button>
            )}
            {data.transcript && (
              <Link href={`${base}/transcript`} className="button primary">
                校对逐字稿
                <ArrowRight size={16} />
              </Link>
            )}
            {latest && (
              <Link href={`${base}/report`} className="button secondary">
                查看已保存报告
              </Link>
            )}
          </div>
        </section>
      ) : view === 'transcript' ? (
        <section className="interview-card">
          <div className="interview-title">
            <div>
              <h2>逐字稿 · 版本 {version || '—'}</h2>
              <p className="muted">请核对听不清、分段衔接和说话人。时间仅表示音频分段范围。</p>
            </div>
            <button
              className="button secondary"
              onClick={() =>
                void operate(async () => {
                  const result = await request(`/api/interviews/${id}/audio`);
                  setAudio(result.url);
                })
              }
              disabled={busy}
            >
              <Headphones size={16} />
              播放原录音
            </button>
          </div>
          {audio && (
            <audio
              controls
              src={audio}
              onError={() => setNotice('播放链接已过期时，请重新点击“播放原录音”。')}
            />
          )}
          {segments.length === 0 ? (
            <p className="muted">转写完成后会在这里显示逐字稿。</p>
          ) : (
            <>
              <div className="interview-segments">
                {segments.map((segment, index) => (
                  <div className="interview-segment" key={segment.id}>
                    <div className="interview-segment-header">
                      <label>
                        说话人
                        <input
                          aria-label={`第 ${index + 1} 段说话人`}
                          value={segment.speaker}
                          maxLength={40}
                          disabled={active}
                          onChange={(e) => changeSegment(index, { speaker: e.target.value })}
                        />
                      </label>
                      <span>
                        {timeText(segment.start)} — {timeText(segment.end)}
                      </span>
                      <button
                        className="text-button"
                        title="删除段落"
                        disabled={active || segments.length <= 1}
                        onClick={() => {
                          dirty.current = true;
                          setConfirmed(false);
                          setSegments((old) => old.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea
                      aria-label={`第 ${index + 1} 段逐字稿`}
                      value={segment.text}
                      rows={6}
                      maxLength={20000}
                      disabled={active}
                      onChange={(e) => changeSegment(index, { text: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <button
                className="text-button"
                disabled={active}
                onClick={() => {
                  dirty.current = true;
                  setConfirmed(false);
                  setSegments((old) => [
                    ...old,
                    {
                      id: crypto.randomUUID(),
                      speaker: '未标注',
                      text: '',
                      start: old.at(-1)?.end || 0,
                      end: old.at(-1)?.end || 0,
                    },
                  ]);
                }}
              >
                <Plus size={16} />
                添加说话人段落
              </button>
              <label className="interview-checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={active}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                我已校对当前逐字稿，并确认使用此版本和已授权资料生成复盘。
              </label>
              <div className="interview-actions">
                <button
                  className="button secondary"
                  disabled={busy || active}
                  onClick={() => void operate(saveTranscript)}
                >
                  保存校对稿
                </button>
                <button
                  className="button primary"
                  disabled={busy || active || !confirmed}
                  onClick={() => void operate(generate)}
                >
                  确认并生成报告
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="interview-card">
          {!report || !latest ? (
            <div className="interview-empty">
              <h2>让复盘建立在准确的对话上</h2>
              <p>先校对逐字稿并确认，再生成报告。</p>
              <Link href={`${base}/transcript`} className="button primary">
                前往校对
              </Link>
            </div>
          ) : (
            <>
              <div className="interview-title">
                <div>
                  <h2>AI 面试复盘报告</h2>
                  <p className="muted">
                    报告版本 {latest.revision} · 基于逐字稿 {latest.source_version} ·{' '}
                    {latest.author === 'manual' ? '人工编辑' : 'AI 生成'} ·{' '}
                    {dateText(latest.created_at)}
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={active || busy}
                  onClick={() => {
                    if (editing) setReport(data.reports[0]?.body || null);
                    setEditing(!editing);
                    reportDirty.current = !editing;
                  }}
                >
                  {' '}
                  {editing ? '取消编辑' : '编辑报告'}
                </button>
              </div>
              {latest.source_version !== version && (
                <p className="alert">
                  当前逐字稿已更新；这份报告保留原版本依据，重新生成后才会使用新稿。
                </p>
              )}
              <h3>复盘概述</h3>
              {editing ? (
                <textarea
                  aria-label="复盘概述"
                  value={report.summary}
                  maxLength={3000}
                  rows={4}
                  onChange={(e) => setReport({ ...report, summary: e.target.value })}
                />
              ) : (
                <p className="interview-prose">{report.summary}</p>
              )}
              <h3>有依据的观察</h3>
              {report.observations.map((observation, index) => (
                <article className="interview-observation" key={index}>
                  <span className="interview-badge">{observation.category}</span>
                  {editing ? (
                    <textarea
                      aria-label={`观察 ${index + 1}`}
                      value={observation.finding}
                      maxLength={2000}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          observations: report.observations.map((v, i) =>
                            i === index ? { ...v, finding: e.target.value } : v
                          ),
                        })
                      }
                    />
                  ) : (
                    <p>{observation.finding}</p>
                  )}
                  {observation.evidence.map((evidence, i) => (
                    <blockquote key={i}>
                      {evidence.quote}
                      <small>逐字稿证据 · {evidence.segment_id.slice(0, 8)}</small>
                    </blockquote>
                  ))}
                  <strong>下次可以这样做</strong>
                  {editing ? (
                    <textarea
                      aria-label={`建议 ${index + 1}`}
                      value={observation.suggestion}
                      maxLength={2000}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          observations: report.observations.map((v, i) =>
                            i === index ? { ...v, suggestion: e.target.value } : v
                          ),
                        })
                      }
                    />
                  ) : (
                    <p>{observation.suggestion}</p>
                  )}
                  {observation.uncertainty && (
                    <p className="muted">待确认：{observation.uncertainty}</p>
                  )}
                </article>
              ))}
              <h3>下一步练习</h3>
              {report.action_plan.map((action, index) => (
                <div key={index} className="interview-action-item">
                  <Check size={17} />
                  <div>
                    {editing ? (
                      <textarea
                        aria-label={`练习 ${index + 1}`}
                        value={action.action}
                        maxLength={1000}
                        onChange={(e) =>
                          setReport({
                            ...report,
                            action_plan: report.action_plan.map((v, i) =>
                              i === index ? { ...v, action: e.target.value } : v
                            ),
                          })
                        }
                      />
                    ) : (
                      <strong>{action.action}</strong>
                    )}
                    <p className="muted">{action.reason}</p>
                  </div>
                </div>
              ))}
              <h3>无法确定的部分</h3>
              {report.unknowns.length ? (
                report.unknowns.map((text, i) => (
                  <p className="muted" key={i}>
                    · {text}
                  </p>
                ))
              ) : (
                <p className="muted">模型未列出额外不确定项，仍请结合实际情况判断。</p>
              )}
              <p className="interview-disclaimer">
                AI 复盘供练习参考，不代表面试官评价或录用预测。请核对证据与原意。
              </p>
              <div className="interview-actions">
                {editing && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      void operate(async () => {
                        await request(`/api/interviews/${id}/report`, 'PUT', {
                          revision: latest.revision,
                          body: report,
                        });
                        reportDirty.current = false;
                        setEditing(false);
                        await load();
                        setNotice('人工编辑已保存为新报告版本。');
                      })
                    }
                  >
                    保存报告
                  </button>
                )}
                <Link className="button secondary" href={`${base}/transcript`}>
                  校对并重新生成
                </Link>
                <button
                  className="text-button danger"
                  disabled={active || busy}
                  onClick={() => {
                    if (window.confirm('删除此面试的全部报告版本？录音和逐字稿会保留。'))
                      void operate(async () => {
                        await request(`/api/interviews/${id}/report`, 'DELETE', {});
                        reportDirty.current = false;
                        await load();
                      });
                  }}
                >
                  删除全部报告
                </button>
              </div>
              {data.reports.length > 1 && (
                <details>
                  <summary>已保存的报告版本</summary>
                  {data.reports.slice(1).map((previous) => (
                    <div className="interview-previous" key={previous.id}>
                      <strong>
                        版本 {previous.revision} ·{' '}
                        {previous.author === 'ai' ? 'AI 生成' : '人工编辑'}
                      </strong>
                      <p>{previous.body.summary}</p>
                      <small>
                        来源逐字稿 {previous.source_version} · {dateText(previous.created_at)}
                      </small>
                    </div>
                  ))}
                </details>
              )}
            </>
          )}
        </section>
      )}
      {data && (
        <div className="interview-footer">
          <span>
            <ShieldCheck size={15} />
            仅保存在你的私人工作台
          </span>
          <button
            className="text-button danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm('删除此面试的录音、所有逐字稿和报告？此操作无法恢复。'))
                void operate(async () => {
                  await request(`/api/interviews/${id}`, 'DELETE', {});
                  router.push('/workspace/interviews');
                });
            }}
          >
            <Trash2 size={15} />
            删除录音与全部复盘数据
          </button>
        </div>
      )}
    </main>
  );
}
