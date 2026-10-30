'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/brand';
import { type Entry, type Profile, kindLabels, statusLabels } from '@/lib/validation';
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';
type Kind = Entry['kind'];
const kinds: Kind[] = ['application', 'resume', 'favorite', 'interview_review'];
const icons = {
  application: BriefcaseBusiness,
  resume: FileText,
  favorite: Bookmark,
  interview_review: MessageSquareText,
};
const emptyDraft = {
  title: '',
  company: '',
  status: 'planned' as Entry['status'],
  content: '',
  url: '',
};
export function Workspace({ email, userId }: { email: string; userId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('application');
  const [settings, setSettings] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Entry | 'new' | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [destruction, setDestruction] = useState<'data' | 'account' | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
  const loadSequence = useRef(0);
  async function request(path: string, method = 'GET', data?: unknown) {
    const response = await fetch(path, {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(data !== undefined && { body: JSON.stringify(data) }),
    });
    const result = await response.json();
    if (response.status === 401) {
      router.replace('/login?reason=expired');
      throw new Error('登录已过期，请重新登录。');
    }
    if (!response.ok) throw new Error(result.error || '操作失败，请重试。');
    return result;
  }
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError('');
    try {
      const [p, records] = await Promise.all([
        request('/api/profile'),
        request(`/api/entries?kind=${kind}`),
      ]);
      if (sequence !== loadSequence.current) return;
      setProfile(p.profile);
      setEntries(records.entries);
      setTotal(records.total);
      setNextOffset(records.nextOffset);
    } catch (e) {
      if (sequence === loadSequence.current)
        setError(e instanceof Error ? e.message : '加载失败，请重试。');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
    // request uses stable router and no UI state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, router]);
  useEffect(() => {
    void load();
  }, [load]);
  // Refresh on device/tab return; explicit refresh also available. Never overwrite a form in progress.
  useEffect(() => {
    function refresh() {
      if (
        !editing &&
        !settings &&
        !destruction &&
        !deleteEntry &&
        document.visibilityState === 'visible'
      )
        void load();
    }
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load, editing, settings, destruction, deleteEntry]);
  async function operate(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络连接失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  function openEditor(entry?: Entry) {
    setDraft(
      entry
        ? {
            title: entry.title,
            company: entry.company,
            status: entry.status,
            content: entry.content,
            url: entry.url,
          }
        : emptyDraft
    );
    setEditing(entry || 'new');
  }
  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    await operate(async () => {
      await request(
        '/api/entries',
        editing === 'new' ? 'POST' : 'PATCH',
        editing === 'new' ? { ...draft, kind } : { ...draft, id: (editing as Entry).id }
      );
      setEditing(null);
      await load();
      setNotice('记录已保存到云端。');
    });
  }
  function selectKind(value: Kind) {
    setKind(value);
    setSettings(false);
    setSearch('');
    setNotice('');
    setError('');
  }
  const visible = entries.filter((entry) =>
    `${entry.title} ${entry.company} ${entry.content}`.toLowerCase().includes(search.toLowerCase())
  );
  const name = profile?.full_name || '求职者';
  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-heading">我的空间</div>
        <button
          className={`nav-item ${!settings && kind === 'application' ? 'active' : ''}`}
          onClick={() => selectKind('application')}
        >
          <LayoutDashboard size={18} />
          求职工作台
          <ChevronRight size={14} />
        </button>
        {kinds.slice(1).map((value) => {
          const Icon = icons[value];
          return (
            <button
              key={value}
              className={`nav-item ${!settings && kind === value ? 'active' : ''}`}
              onClick={() => selectKind(value)}
            >
              <Icon size={18} />
              {kindLabels[value]}
              {['resume', 'interview_review'].includes(value) && (
                <span className="nav-label">基础版</span>
              )}
            </button>
          );
        })}
        <div className="sidebar-bottom">
          <div className="private-space">
            <ShieldCheck size={18} />
            <div>
              你的私人空间<small>个人数据默认仅自己可见</small>
            </div>
          </div>
          <button
            className={`nav-item ${settings ? 'active' : ''}`}
            onClick={() => {
              setSettings(true);
              setNotice('');
            }}
          >
            <Settings2 size={18} />
            账号与资料
          </button>
          <button
            className="nav-item"
            disabled={busy}
            onClick={() =>
              operate(async () => {
                await request('/api/auth/logout', 'POST', {});
                router.replace('/login');
                router.refresh();
              })
            }
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <span>
            我的空间 <ChevronRight size={14} /> {settings ? '账号与资料' : kindLabels[kind]}
          </span>
          <div className="user-chip">
            <span className="avatar">{name.charAt(0)}</span>
            <span>{name}</span>
          </div>
        </header>
        <main className="workspace-content">
          <div className="workspace-title">
            <div>
              <p className="eyebrow">MAKE EVERY STEP COUNT</p>
              <h1>
                {settings
                  ? '账号与个人资料'
                  : kind === 'application'
                    ? `${name}，今天也向前一步。`
                    : kindLabels[kind]}
              </h1>
              <p>
                {settings
                  ? '让我们更了解你，也让你的数据始终由你掌握。'
                  : kind === 'application'
                    ? '把每一个机会，变成有迹可循的进步。'
                    : kind === 'resume'
                      ? '先记录真实经历。智能解析与 AI 优化将在后续开放。'
                      : kind === 'interview_review'
                        ? '记录问题、回答与收获。AI 分析将在后续开放。'
                        : '把值得关注的机会与资料，留在自己的空间。'}
              </p>
            </div>
            <span className="workspace-tag">
              <span /> PERSONAL WORKSPACE
            </span>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button className="text-button" onClick={() => void load()}>
                重试
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          {settings ? (
            <div className="settings-grid">
              <section className="settings-card">
                <h2>个人资料</h2>
                <p className="muted">资料会在下次登录或刷新其他设备时同步。</p>
                {profile ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void operate(async () => {
                        const result = await request('/api/profile', 'PATCH', {
                          full_name: profile.full_name,
                          desired_role: profile.desired_role,
                          city: profile.city,
                          bio: profile.bio,
                        });
                        setProfile(result.profile);
                        setNotice('个人资料已保存。');
                      });
                    }}
                    className="profile-form"
                  >
                    <label>
                      邮箱
                      <input value={email} disabled type="email" />
                    </label>
                    <label>
                      昵称
                      <input
                        value={profile.full_name}
                        maxLength={60}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        placeholder="怎么称呼你"
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        目标岗位
                        <input
                          value={profile.desired_role}
                          maxLength={100}
                          onChange={(e) => setProfile({ ...profile, desired_role: e.target.value })}
                          placeholder="例如：产品经理"
                        />
                      </label>
                      <label>
                        意向城市
                        <input
                          value={profile.city}
                          maxLength={60}
                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          placeholder="例如：上海"
                        />
                      </label>
                    </div>
                    <label>
                      个人简介
                      <textarea
                        value={profile.bio}
                        maxLength={1000}
                        rows={4}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="关于你的一点介绍（选填）"
                      />
                    </label>
                    <button disabled={busy} className="button primary">
                      {busy ? '保存中…' : '保存个人资料'}
                    </button>
                  </form>
                ) : (
                  <p>正在读取资料…</p>
                )}
              </section>
              <div>
                <section className="settings-card">
                  <ShieldCheck size={23} />
                  <h2>账号安全</h2>
                  <p className="muted">使用邮箱一次性验证码登录，无需设置密码。</p>
                  <div className="identity-id">
                    <span>内部用户 ID</span>
                    <code>{userId}</code>
                  </div>
                  <div className="wechat-setting">
                    微信账号 <span>即将开放</span>
                  </div>
                  <p className="small muted">未来绑定微信后仍保留此用户 ID 与全部记录。</p>
                </section>
                <section className="settings-card danger-zone">
                  <h2>数据与账号</h2>
                  <p>删除操作不可恢复，请仔细确认。</p>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setDestruction('data');
                      setConfirmation('');
                    }}
                  >
                    删除个人数据
                  </button>
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() => {
                      setDestruction('account');
                      setConfirmation('');
                    }}
                  >
                    注销账号
                  </button>
                </section>
              </div>
            </div>
          ) : (
            <>
              <section className="workspace-banner">
                <div>
                  <span className="banner-label">YOUR JOURNEY, AT YOUR PACE</span>
                  <h2>每一份认真，都在靠近答案。</h2>
                  <p>记录、准备、再向前。属于你的好消息，正在路上。</p>
                </div>
                <ArrowUpRight size={60} strokeWidth={1} />
              </section>
              <div className="entry-toolbar">
                <div className="table-tab">
                  <span>{kindLabels[kind]}</span>
                  <b>{total}</b>
                </div>
                <div className="toolbar-actions">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      aria-label="搜索当前已加载记录"
                      placeholder="搜索已加载记录…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <button
                    className="icon-button"
                    aria-label="同步云端记录"
                    onClick={() => void load()}
                    disabled={loading}
                  >
                    <RefreshCw size={17} className={loading ? 'spin' : ''} />
                  </button>
                  <button className="button primary" onClick={() => openEditor()}>
                    <Plus size={17} />
                    {kind === 'application' ? '新增投递' : '新增记录'}
                  </button>
                </div>
              </div>
              <section className="table-container" aria-label={kindLabels[kind]}>
                {loading ? (
                  <div className="table-loading" aria-busy="true">
                    <LoaderCircle className="spin" size={22} /> 正在同步你的记录…
                  </div>
                ) : (
                  <>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th className="frozen-col">
                              {kind === 'application' ? '公司 / 岗位' : '标题 / 关联公司'}
                            </th>
                            <th>当前状态</th>
                            <th>记录内容</th>
                            <th>参考链接</th>
                            <th>最近更新</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((entry) => (
                            <tr key={entry.id}>
                              <td className="frozen-col">
                                <button className="entry-title" onClick={() => openEditor(entry)}>
                                  {entry.title}
                                </button>
                                <small>{entry.company || '—'}</small>
                              </td>
                              <td>
                                <span className={`status-badge ${entry.status}`}>
                                  {statusLabels[entry.status]}
                                </span>
                              </td>
                              <td>
                                <span className="entry-content">
                                  {entry.content || '还没有备注'}
                                </span>
                              </td>
                              <td>
                                {entry.url ? (
                                  <a
                                    className="external-link"
                                    href={entry.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    查看链接 <ArrowUpRight size={13} />
                                  </a>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                              <td>
                                <time dateTime={entry.updated_at}>
                                  {new Date(entry.updated_at).toLocaleDateString('zh-CN')}
                                </time>
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="icon-button"
                                    aria-label={`编辑 ${entry.title}`}
                                    onClick={() => openEditor(entry)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    className="icon-button danger"
                                    aria-label={`删除 ${entry.title}`}
                                    onClick={() => setDeleteEntry(entry)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {visible.length === 0 && (
                      <div className="empty-state">
                        <div className="empty-icon">
                          {search ? (
                            <Search size={26} />
                          ) : (
                            <BriefcaseBusiness size={26} strokeWidth={1.3} />
                          )}
                        </div>
                        <h3>{search ? '没有找到匹配的记录' : '第一步，从一条记录开始'}</h3>
                        <p>
                          {search
                            ? '试试其他关键词，或清空搜索。'
                            : '这里是你的私人工作空间，添加的内容会安全保存在云端。'}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => (search ? setSearch('') : openEditor())}
                        >
                          {search ? '清空搜索' : '添加我的第一条记录'}
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                    )}
                    {nextOffset !== null && (
                      <button
                        className="button secondary load-more"
                        disabled={busy}
                        onClick={() =>
                          operate(async () => {
                            const result = await request(
                              `/api/entries?kind=${kind}&offset=${nextOffset}`
                            );
                            setEntries((previous) => [...previous, ...result.entries]);
                            setNextOffset(result.nextOffset);
                            setTotal(result.total);
                          })
                        }
                      >
                        加载更多
                      </button>
                    )}
                  </>
                )}
              </section>
              <div className="table-footer">
                <span>
                  <ShieldCheck size={14} /> 云端私有存储 · 仅本人可见
                </span>
                <span>
                  共 {total} 条 · 已加载 {entries.length} 条
                </span>
              </div>
            </>
          )}
        </main>
        <footer className="workspace-footer">上岸有期 · YOUR CAREER, YOUR WAY</footer>
      </div>
      {editing && (
        <Modal
          title={editing === 'new' ? `新增${kindLabels[kind]}` : '编辑记录'}
          onClose={() => setEditing(null)}
          busy={busy}
        >
          <form onSubmit={saveEntry} className="profile-form">
            <label>
              标题
              <input
                autoFocus
                required
                maxLength={120}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={
                  kind === 'application' ? '例如：产品经理实习生' : '为这份记录起一个名字'
                }
              />
            </label>
            <div className="form-grid">
              <label>
                公司（选填）
                <input
                  maxLength={100}
                  value={draft.company}
                  onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                />
              </label>
              <label>
                状态
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as Entry['status'] })
                  }
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {kind === 'resume'
                ? '经历与简历内容'
                : kind === 'interview_review'
                  ? '问题、回答与复盘笔记'
                  : '备注'}
              <textarea
                rows={7}
                maxLength={20000}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="只记录真实内容，随时可以回来编辑。"
              />
            </label>
            <label>
              参考链接（选填）
              <input
                type="url"
                maxLength={2000}
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="https://"
              />
            </label>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                disabled={busy}
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                取消
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? '保存中…' : '保存记录'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleteEntry && (
        <Modal title="删除这条记录？" busy={busy} onClose={() => setDeleteEntry(null)}>
          <p>「{deleteEntry.title}」将永久删除，此操作不可撤销。</p>
          {error && (
            <p role="alert" className="alert error">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDeleteEntry(null)}
            >
              取消
            </button>
            <button
              className="button destructive"
              disabled={busy}
              onClick={() =>
                operate(async () => {
                  await request('/api/entries', 'DELETE', { id: deleteEntry.id });
                  setDeleteEntry(null);
                  await load();
                  setNotice('记录已删除。');
                })
              }
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
      {destruction && (
        <Modal
          title={destruction === 'data' ? '删除个人数据' : '注销账号'}
          busy={busy}
          onClose={() => setDestruction(null)}
        >
          <p>
            {destruction === 'data'
              ? '将永久删除全部投递、简历草稿、收藏、面试复盘，并清空个人资料。邮箱登录账号保留。'
              : '将永久删除邮箱账号、关联身份及全部个人资料和求职记录。所有设备将无法再访问此账号。注销需在邮箱验证后 10 分钟内进行。'}
          </p>
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              void operate(async () => {
                await request(
                  destruction === 'data' ? '/api/account/data' : '/api/account',
                  'DELETE',
                  { confirmation }
                );
                if (destruction === 'account') {
                  router.replace('/login');
                  router.refresh();
                } else {
                  setDestruction(null);
                  await load();
                  setNotice('个人数据已删除，账号已保留。');
                }
              });
            }}
          >
            <label>
              请输入「{destruction === 'data' ? '删除个人数据' : '注销账号'}」确认
              <input
                autoFocus
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
              />
            </label>
            {error && (
              <p role="alert" className="alert error">
                {error}
              </p>
            )}
            <button
              className="button destructive"
              disabled={
                busy || confirmation !== (destruction === 'data' ? '删除个人数据' : '注销账号')
              }
            >
              {busy ? '正在处理…' : '永久删除'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
  busy,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const d = dialogRef.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) closeRef.current();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="关闭弹窗" disabled={busy} onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
