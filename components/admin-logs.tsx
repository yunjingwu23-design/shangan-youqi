'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminCall } from '@/lib/admin/client';
import {
  adminRoles,
  adminActionLabels,
  adminStateLabel,
  beijingTime,
  type AdminEvent,
  type AdminRole,
} from '@/lib/admin/model';
export function AdminLogs() {
  const [logs, setLogs] = useState<AdminEvent[]>([]),
    [offset, setOffset] = useState(0),
    [next, setNext] = useState<number | null>(null),
    [total, setTotal] = useState(0),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void adminCall('/api/admin/logs?offset=' + offset)
      .then((data) => {
        if (alive) {
          setLogs(data.logs);
          setTotal(data.total);
          setNext(data.nextOffset);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [offset]);
  return (
    <main className="site-main admin-main">
      <div className="site-page-title">
        <p className="site-eyebrow">AUDIT TRAIL</p>
        <h1>操作日志</h1>
        <p>数据库随业务事务自动追加，浏览器无权修改或删除。当前可读取 {total} 条。</p>
      </div>
      {error && (
        <p role="alert" className="site-error">
          {error}
        </p>
      )}
      <div className="admin-table-scroll">
        <table className="admin-jd-table">
          <thead>
            <tr>
              <th>时间（北京）</th>
              <th>操作人员</th>
              <th>角色</th>
              <th>操作</th>
              <th>岗位 / 目标</th>
              <th>状态变更</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{beijingTime(log.created_at)}</td>
                <td>{log.actor_email || log.actor_id || '系统'}</td>
                <td>{adminRoles[log.actor_role as AdminRole] || log.actor_role}</td>
                <td title={log.action}>{adminActionLabels[log.action] || log.action}</td>
                <td>
                  {log.job_id ? (
                    <Link href={'/admin/jobs/' + log.job_id}>查看岗位</Link>
                  ) : log.action === 'admin_login' ? (
                    '后台登录'
                  ) : log.action === 'jd_file_registered' ? (
                    'JD 原件'
                  ) : (
                    '权限管理'
                  )}
                </td>
                <td>
                  {adminStateLabel(log.from_state)} → {adminStateLabel(log.to_state)}
                </td>
                <td>{log.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination">
        <button
          className="button secondary"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          上一页
        </button>
        <button
          className="button secondary"
          disabled={next === null}
          onClick={() => setOffset(next!)}
        >
          下一页
        </button>
      </div>
    </main>
  );
}
