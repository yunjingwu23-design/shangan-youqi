'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminCall } from '@/lib/admin/client';
import { jobStates, adminRoles, type AdminRole } from '@/lib/admin/model';
export function AdminDashboard({ role }: { role: AdminRole }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null),
    [overdue, setOverdue] = useState(0),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    const data = await adminCall('/api/admin/overview');
    setCounts(data.counts);
    setOverdue(data.overdue);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  return (
    <main className="site-main admin-main">
      <div className="site-page-title">
        <p className="site-eyebrow">OPERATIONS WORKSPACE</p>
        <h1>运营概览</h1>
        <p>用可追溯的来源，把每一个岗位准确送到求职者面前。当前角色：{adminRoles[role]}。</p>
      </div>
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
      <div className="admin-metrics">
        {(['published', 'pending_review', 'draft', 'rejected'] as const).map((state) => (
          <Link className="site-card" href={'/admin/jobs?state=' + state} key={state}>
            <span>{jobStates[state]}</span>
            <strong>{counts ? counts[state] : '…'}</strong>
            <small>查看岗位 →</small>
          </Link>
        ))}
      </div>
      <div className="admin-quick-actions">
        <Link className="button primary" href="/admin/jobs/new">
          手动导入 JD →
        </Link>
        <Link className="button secondary" href="/admin/jobs">
          打开岗位管理 →
        </Link>
        <Link className="button secondary" href="/admin/review">
          打开审核工作台 →
        </Link>
      </div>
      <div className="admin-two-panels">
        <section className="site-card">
          <h2>发布流程</h2>
          <ol className="admin-flow">
            <li>编辑保存 JD、投递方式和来源</li>
            <li>提交审核，核对留用原文与截止时间</li>
            <li>审核通过，再发布到前台岗位广场</li>
          </ol>
          <p className="muted">正文有改动时重新审核；导入文件和 AI 提取均不能直接发布。</p>
        </section>
        <section className="site-card">
          <h2>过期与下架</h2>
          <p>
            已下架 {counts?.closed ?? '…'} · 已归档过期 {counts?.expired ?? '…'} · 待处理过期{' '}
            {overdue}
          </p>
          <p>到截止时间即从前台隐藏，既有个人投递记录保留。</p>
          {role !== 'editor' && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError('');
                void adminCall('/api/admin/overview', 'POST', {})
                  .then(async (data) => {
                    setNotice(`已处理 ${data.expired} 条到期岗位。`);
                    await load();
                  })
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              处理到期岗位
            </button>
          )}
        </section>
      </div>
      <section className="site-card admin-phase-note">
        <span className="ia-status pending">后续阶段</span>
        <h2>AI 解析与批量导入</h2>
        <p>
          当前支持人工录入及 TXT / DOCX / 文字型 PDF。AI 字段提取、Excel / CSV
          批量导入将在手工审核闭环稳定后开放，所有提取结果仍需人工核验。
        </p>
      </section>
    </main>
  );
}
