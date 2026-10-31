'use client';
import { useEffect, useState } from 'react';
import { adminCall } from '@/lib/admin/client';
import { adminRoles, beijingTime, type AdminRole, type Member } from '@/lib/admin/model';
function MemberRow({ member, onSaved }: { member: Member; onSaved: () => Promise<void> }) {
  const [role, setRole] = useState(member.role),
    [active, setActive] = useState(member.active),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <tr>
      <td>
        {member.email}
        <small>{member.user_id}</small>
      </td>
      <td>
        <select
          aria-label={`${member.email} 角色`}
          value={role}
          onChange={(e) => setRole(e.target.value as AdminRole)}
        >
          {Object.entries(adminRoles).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="site-checkbox">
          <input
            aria-label={`${member.email} 启用`}
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {active ? '启用' : '停用'}
        </label>
      </td>
      <td>
        <input
          aria-label={`${member.email} 变更说明`}
          value={reason}
          minLength={5}
          maxLength={2000}
          placeholder="至少 5 字，留存操作依据"
          onChange={(e) => setReason(e.target.value)}
        />
        {error && (
          <p role="alert" className="site-error">
            {error}
          </p>
        )}
      </td>
      <td>
        <button
          className="button secondary"
          disabled={busy || reason.trim().length < 5}
          onClick={() => {
            if (!window.confirm(`确认变更 ${member.email} 的管理员权限？`)) return;
            setBusy(true);
            setError('');
            void adminCall('/api/admin/team', 'POST', {
              action: 'change',
              userId: member.user_id,
              role,
              active,
              reason,
            })
              .then(onSaved)
              .then(() => setReason(''))
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          保存权限
        </button>
      </td>
    </tr>
  );
}
export function AdminTeam() {
  const [members, setMembers] = useState<Member[]>([]),
    [invitations, setInvitations] = useState<any[]>([]),
    [email, setEmail] = useState(''),
    [role, setRole] = useState<AdminRole>('editor'),
    [link, setLink] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function load() {
    const data = await adminCall('/api/admin/team');
    setMembers(data.members);
    setInvitations(data.invitations);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <section className="site-card admin-team">
        <h2>邀请管理员</h2>
        <p>
          邀请绑定指定邮箱，有效期 48 小时、仅可领取一次。请在最近一次邮箱验证后 15 分钟内操作。
        </p>
        <form
          className="admin-invite-form"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            setLink('');
            void adminCall('/api/admin/team', 'POST', { action: 'invite', email, role })
              .then(async (data) => {
                setLink(data.url);
                setNotice('邀请已创建，请将一次性链接交给指定邮箱使用者。');
                await load();
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            被邀请邮箱
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            邀请角色
            <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              {Object.entries(adminRoles).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary" disabled={busy} type="submit">
            创建邀请
          </button>
        </form>
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
        {link && (
          <label>
            一次性邀请链接（仅本次显示）
            <textarea aria-label="一次性邀请链接" value={link} readOnly rows={3} />
          </label>
        )}
      </section>
      <section className="site-card admin-team">
        <h2>管理员账号</h2>
        <p>普通注册不授予角色。权限变更会即时影响后续请求，最后一位启用的超级管理员受保护。</p>
        <div className="admin-table-scroll">
          <table className="admin-team-table">
            <thead>
              <tr>
                <th>账号</th>
                <th>角色</th>
                <th>状态</th>
                <th>变更说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <MemberRow
                  key={member.user_id + member.updated_at}
                  member={member}
                  onSaved={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="site-card">
        <h2>邀请记录</h2>
        {!invitations.length && <p>尚未创建邀请。</p>}
        {invitations.map((invite) => (
          <div className="admin-event" key={invite.id}>
            <strong>
              {invite.email} · {adminRoles[invite.role as AdminRole]}
            </strong>
            <small>到期（北京时间）：{beijingTime(invite.expires_at)}</small>
            <span>
              {
                { pending: '待领取', accepted: '已领取', revoked: '已撤销' }[
                  invite.state as 'pending'
                ]
              }
              {invite.state === 'pending' && new Date(invite.expires_at).getTime() <= Date.now()
                ? ' · 已过期'
                : ''}
            </span>
            {invite.state === 'pending' && (
              <button
                className="site-text-link"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void adminCall('/api/admin/team', 'POST', { action: 'revoke', id: invite.id })
                    .then(load)
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                撤销邀请
              </button>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
