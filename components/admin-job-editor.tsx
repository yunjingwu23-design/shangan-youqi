'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDraftStorage } from '@/components/drafts';
import { adminCall } from '@/lib/admin/client';
import {
  adminDraftSchema,
  emptyAdminDraft,
  editableJob,
  jobActions,
  jobStates,
  adminRoles,
  adminActionLabels,
  beijingTime,
  dateInput,
  dateFromInput,
  type AdminDraft,
  type AdminJob,
  type AdminRole,
  type JobAction,
  type JobSource,
  type AdminEvent,
} from '@/lib/admin/model';
import { jobTypes } from '@/lib/catalog';
const actionLabels = adminActionLabels;
function formFrom(value: any): AdminDraft {
  const picked: any = { ...emptyAdminDraft };
  for (const key of Object.keys(emptyAdminDraft)) {
    const sample = emptyAdminDraft[key as keyof AdminDraft],
      item = value?.[key];
    if (typeof sample === 'string' && typeof item === 'string') picked[key] = item;
    else if (sample === null && (item === null || typeof item === 'string')) picked[key] = item;
  }
  if (Array.isArray(value?.contacts))
    picked.contacts = value.contacts
      .filter((item: any) => typeof item?.email === 'string')
      .map((item: any) => ({
        email: item.email,
        label: typeof item.label === 'string' ? item.label : '投递邮箱',
      }));
  if (Array.isArray(value?.aliases))
    picked.aliases = value.aliases.filter((item: any) => typeof item === 'string');
  return picked;
}
export function AdminJobEditor({
  id,
  role,
  userId,
}: {
  id?: string;
  role: AdminRole;
  userId: string;
}) {
  const [job, setJob] = useState<AdminJob | null>(null),
    [form, setForm] = useState<AdminDraft>(emptyAdminDraft),
    [version, setVersion] = useState<number | undefined>(),
    [sources, setSources] = useState<JobSource[]>([]),
    [reviews, setReviews] = useState<AdminEvent[]>([]),
    [duplicates, setDuplicates] = useState<{ id: string; company: string; title: string }[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [reason, setReason] = useState(''),
    [checked, setChecked] = useState(false),
    [fileName, setFileName] = useState('');
  const local = useDraftStorage<{ form: AdminDraft; version?: number }>(
      `admin:editor:${job?.id || id || 'new'}`
    ),
    legacy = useDraftStorage<any>('admin:job'),
    mounted = useRef(true);
  const canEdit = job ? editableJob(job, role, userId) : role !== 'reviewer',
    actions = job ? jobActions(job, role, userId) : [];
  function apply(data: any) {
    setJob(data.job);
    setVersion(data.job.version);
    setForm(formFrom(data.job));
    setSources(data.sources || []);
    setReviews(data.reviews || []);
    setDirty(false);
    setChecked(false);
    setReason('');
  }
  useEffect(() => {
    mounted.current = true;
    const pending = local.read(),
      old = !id && !pending ? legacy.read() : null;
    async function load() {
      try {
        if (id) {
          const data = await adminCall('/api/admin/jobs?id=' + id);
          if (!mounted.current) return;
          apply(data);
        }
        if (pending) {
          setForm(formFrom(pending.form));
          setVersion(pending.version);
          setDirty(true);
          setNotice('已恢复当前标签页中未保存的修改；保存时仍会核对岗位版本。');
        } else if (old) {
          const draft = formFrom({ ...old, raw_jd: old.raw_jd || old.responsibilities || '' });
          setForm(draft);
          setDirty(true);
          setNotice('已保留旧版后台的未保存草稿，请补充原始 JD 与来源后保存。');
        }
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : '载入失败。');
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted.current = false;
    };
  }, [id]);
  useEffect(() => {
    if (!loading && dirty) local.write({ form, version });
  }, [form, version, dirty, loading]);
  function change<K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) {
    setForm((old) => ({ ...old, [key]: value }));
    setDirty(true);
    setNotice('');
    setChecked(false);
  }
  async function save() {
    setBusy(true);
    setError('');
    try {
      const draft = adminDraftSchema.parse({
          ...form,
          contacts: form.contacts
            .filter((contact) => contact.email.trim())
            .map((contact) => ({ ...contact, email: contact.email.trim() })),
          aliases: form.aliases.map((alias) => alias.trim()).filter(Boolean),
        }),
        data = await adminCall('/api/admin/jobs', 'POST', {
          ...(job ? { id: job.id, expectedVersion: version } : {}),
          job: draft,
        });
      local.clear();
      legacy.clear();
      if (!mounted.current) return;
      apply(data);
      setDuplicates(data.duplicates || []);
      setNotice('岗位草稿已真实保存，尚未公开。');
      window.history.replaceState(null, '', '/admin/jobs/' + data.job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  async function transition(action: JobAction) {
    if (!job) return;
    if (
      action === 'revise' &&
      !window.confirm('开始修订会将岗位撤回为草稿；重新审核发布后才会在前台显示。继续？')
    )
      return;
    setBusy(true);
    setError('');
    try {
      const data = await adminCall(`/api/admin/jobs/${job.id}/transition`, 'POST', {
        expectedVersion: version,
        action,
        reason,
        sourceChecked: checked,
      });
      local.clear();
      apply(data);
      setNotice(
        `操作成功：${actionLabels[action]}。当前状态：${jobStates[data.job.state as keyof typeof jobStates]}。`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败。');
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!/\.(txt|docx|pdf)$/i.test(file.name) || file.size > 3 * 1024 * 1024) {
      setError('支持 3 MiB 内的 TXT、DOCX 和文字型 PDF。CSV/Excel 批量导入尚未开放。');
      return;
    }
    if (form.raw_jd && !window.confirm('用此文件的文字替换当前原文？已保存的历史来源快照会保留。'))
      return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/jd-import?name=' + encodeURIComponent(file.name), {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file,
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error || '导入失败。');
      setForm((old) => ({ ...old, raw_jd: data.file.text, source_file_id: data.file.id }));
      setFileName(data.file.fileName);
      setDirty(true);
      setNotice('原件已私有保存，文字已导入。请人工填写或校订岗位字段，再保存草稿。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败。');
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="site-main admin-main">
        <h1>正在载入 JD…</h1>
      </main>
    );
  if (id && !job)
    return (
      <main className="site-main admin-main">
        <h1>无法载入岗位</h1>
        <p role="alert" className="site-error">
          {error || '未找到可读取的岗位。'}
        </p>
        <Link href="/admin/jobs">返回 JD 管理</Link>
      </main>
    );
  return (
    <main className="site-main admin-main">
      <div className="site-page-title admin-title-row">
        <div>
          <p className="site-eyebrow">SOURCE → REVIEW → PUBLISH</p>
          <h1>{job ? 'JD 编辑与审核' : '导入 / 新建 JD'}</h1>
          <p>当前角色：{adminRoles[role]}。投递邮箱、说明和 JD 始终属于同一条岗位记录。</p>
        </div>
        <div className="site-actions">
          <Link href="/admin/jobs" className="button secondary">
            返回 JD 表格
          </Link>
          {job?.state === 'published' && (
            <Link href={'/jobs/' + job.id} className="button secondary">
              查看前台岗位 ↗
            </Link>
          )}
        </div>
      </div>
      {job && (
        <div className="admin-record-bar">
          <span className={'admin-state ' + job.state}>{jobStates[job.state]}</span>
          <span>
            内容修订 r{job.revision} · 记录版本 {job.version}
          </span>
          <span>最后核验：{beijingTime(job.verified_at)}</span>
        </div>
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
      {job && dirty && (
        <button
          className="site-text-link"
          disabled={busy}
          onClick={() => {
            if (
              !window.confirm(
                '放弃本页尚未保存的修改，重新读取云端岗位？已保存的记录和来源不会被删除。'
              )
            )
              return;
            local.clear();
            window.location.reload();
          }}
        >
          放弃本页暂存，重新读取云端版本
        </button>
      )}
      {!!duplicates.length && (
        <aside className="site-notice">
          <strong>发现可能重复的岗位，请核对后再提交：</strong>
          {duplicates.map((item) => (
            <p key={item.id}>
              <Link href={'/admin/jobs/' + item.id} target="_blank">
                {item.company} · {item.title} ↗
              </Link>
            </p>
          ))}
          <p>系统保留当前草稿，不自动覆盖或合并其他岗位。</p>
        </aside>
      )}
      <div className="admin-editor-grid">
        <form
          className="site-card admin-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={!canEdit || busy}>
            <legend>岗位与原始 JD</legend>
            <label>
              手动上传 JD（TXT / DOCX / PDF）
              <input
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
            <p className="admin-help">
              支持文字提取，不自动编造公司、邮箱、截止时间或留用承诺。扫描 PDF 暂无 OCR。AI 解析和
              Excel/CSV 批量导入为后续阶段。
            </p>
            {form.source_file_id && (
              <p>
                {fileName || '已关联 JD 私有原件'} ·{' '}
                <a href={'/api/admin/jd-files/' + form.source_file_id}>下载原件</a>
              </p>
            )}
            <label>
              原始 JD / 校订文本
              <textarea
                aria-label="原始 JD / 校订文本"
                value={form.raw_jd}
                maxLength={50000}
                rows={10}
                onChange={(e) => change('raw_jd', e.target.value)}
                placeholder="粘贴完整 JD，保留投递邮箱、投递说明、来源和留用原文。"
              />
            </label>
            <div className="form-two-col">
              {(
                [
                  { key: 'company', label: '公司', max: 100 },
                  { key: 'title', label: '岗位名称', max: 120 },
                  { key: 'city', label: '城市', max: 60 },
                  { key: 'industry', label: '行业', max: 60 },
                  { key: 'cohort', label: '届别', max: 60 },
                ] as const
              ).map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    required={field.key === 'company' || field.key === 'title'}
                    maxLength={field.max}
                    value={form[field.key]}
                    onChange={(e) => change(field.key, e.target.value)}
                  />
                </label>
              ))}
              <label>
                招聘类型
                <select
                  value={form.type}
                  onChange={(e) => change('type', e.target.value as AdminDraft['type'])}
                >
                  {Object.entries(jobTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              岗位职责
              <textarea
                value={form.responsibilities}
                rows={5}
                maxLength={12000}
                onChange={(e) => change('responsibilities', e.target.value)}
              />
            </label>
            <label>
              任职要求
              <textarea
                value={form.requirements}
                rows={4}
                maxLength={6000}
                onChange={(e) => change('requirements', e.target.value)}
              />
            </label>
            {form.type === 'conversion_internship' && (
              <label>
                JD 中明确留用可能的原文
                <textarea
                  value={form.retention_evidence}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => change('retention_evidence', e.target.value)}
                />
              </label>
            )}
            <label>
              招聘来源 HTTPS 链接
              <input
                type="url"
                value={form.source_url}
                maxLength={2000}
                onChange={(e) => change('source_url', e.target.value)}
              />
            </label>
            <label>
              招聘方投递 HTTPS 链接
              <input
                type="url"
                value={form.apply_url}
                maxLength={2000}
                onChange={(e) => change('apply_url', e.target.value)}
              />
            </label>
            <label>
              本岗位投递邮箱（每行一个）
              <textarea
                value={form.contacts.map((contact) => contact.email).join('\n')}
                maxLength={1500}
                rows={3}
                onChange={(e) =>
                  change(
                    'contacts',
                    e.target.value.split(/[\n,，]/).map((email) => ({ email, label: '投递邮箱' }))
                  )
                }
              />
            </label>
            <label>
              邮件标题要求
              <input
                value={form.mail_subject}
                maxLength={200}
                onChange={(e) => change('mail_subject', e.target.value)}
              />
            </label>
            <label>
              本岗位投递说明
              <textarea
                value={form.application_instructions}
                maxLength={6000}
                rows={3}
                onChange={(e) => change('application_instructions', e.target.value)}
              />
            </label>
            <label>
              已核对的别名 / 搜索关键词
              <input
                value={form.aliases.join('、')}
                maxLength={1800}
                onChange={(e) => change('aliases', e.target.value.split(/[、,，\n]/))}
              />
            </label>
            <div className="form-two-col">
              <label>
                来源发布时间（北京时间，选填）
                <input
                  type="datetime-local"
                  value={dateInput(form.source_published_at)}
                  onChange={(e) => change('source_published_at', dateFromInput(e.target.value))}
                />
              </label>
              <label>
                招聘截止时间（北京时间，选填）
                <input
                  type="datetime-local"
                  value={dateInput(form.deadline_at)}
                  onChange={(e) => change('deadline_at', dateFromInput(e.target.value))}
                />
              </label>
            </div>
          </fieldset>
          {canEdit ? (
            <button className="button primary" type="submit" disabled={busy}>
              保存草稿
            </button>
          ) : (
            <p className="admin-help">
              当前角色或状态为只读。已发布岗位需先开始修订，审核员不修改正文。
            </p>
          )}
        </form>
        <aside className="admin-editor-aside">
          <section className="site-card">
            <h2>审核与发布</h2>
            {!job ? (
              <p>先保存真实草稿，再提交审核。</p>
            ) : (
              <>
                <p>
                  创建人员：{job.created_by || '迁移前未记录'}
                  <br />
                  最后操作人员：{job.updated_by || '迁移前未记录'}
                </p>
                {dirty && <p className="site-notice">有未保存的修改，请先保存后再进行状态操作。</p>}
                {(actions.includes('approve') || actions.includes('reject')) && (
                  <>
                    <label>
                      审核说明（至少 10 字）
                      <textarea
                        value={reason}
                        maxLength={2000}
                        rows={5}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                    {job.created_by === userId && (
                      <p className="site-notice">
                        这是本人创建的岗位。超级管理员自审会明确记录，请写明实际核验依据。
                      </p>
                    )}
                    <label className="site-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setChecked(e.target.checked)}
                      />
                      我已核对原文、招聘来源、投递方式和留用依据。
                    </label>
                  </>
                )}
                <div className="admin-action-stack">
                  {actions.map((action) => (
                    <button
                      type="button"
                      key={action}
                      disabled={busy || dirty}
                      className={
                        'button ' +
                        (action === 'approve' || action === 'publish' ? 'primary' : 'secondary')
                      }
                      onClick={() => void transition(action)}
                    >
                      {actionLabels[action]}
                    </button>
                  ))}
                </div>
                {!actions.length && <p>当前账号没有可执行的状态操作。</p>}
              </>
            )}
          </section>
          <section className="site-card">
            <h2>来源与原件</h2>
            {sources.length ? (
              sources.map((source) => (
                <details key={source.id} className="admin-source">
                  <summary>
                    修订 r{source.revision} ·{' '}
                    {source.kind === 'legacy'
                      ? '历史结构化快照'
                      : source.kind === 'file'
                        ? '私有原件'
                        : '粘贴原文'}
                  </summary>
                  <p>采集时间：{beijingTime(source.captured_at)}</p>
                  {source.source_url && (
                    <a href={source.source_url} target="_blank" rel="noopener noreferrer">
                      核对招聘来源 ↗
                    </a>
                  )}
                  {source.file_id && (
                    <p>
                      <a href={'/api/admin/jd-files/' + source.file_id}>下载该版本原件</a>
                    </p>
                  )}
                  <h3>原始文本</h3>
                  <pre>{source.original_jd}</pre>
                  {source.corrected_jd !== source.original_jd && (
                    <>
                      <h3>本次校订文本</h3>
                      <pre>{source.corrected_jd}</pre>
                    </>
                  )}
                </details>
              ))
            ) : (
              <p>保存后生成不可由浏览器改写的来源快照。</p>
            )}
          </section>
          <section className="site-card">
            <h2>审核记录</h2>
            {!reviews.length && <p>尚无审核记录。</p>}
            {reviews.map((review) => (
              <article key={review.id} className="admin-event">
                <strong>
                  {actionLabels[review.action as JobAction] || review.action}
                  {review.self_review ? ' · 本人自审' : ''}
                </strong>
                <small>
                  {review.actor_email} · {beijingTime(review.created_at)}
                </small>
                <p>{review.note}</p>
                <span>
                  r{(review as any).revision} ·{' '}
                  {review.from_state ? jobStates[review.from_state as keyof typeof jobStates] : ''}{' '}
                  → {jobStates[review.to_state as keyof typeof jobStates]}
                </span>
              </article>
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
