import Link from 'next/link';
import { Headphones, UsersRound, History, ListChecks, ArrowRight } from 'lucide-react';
export default function InterviewCenter() {
  const enabled = process.env.INTERVIEWS_ENABLED === 'true';
  const items = [
    {
      href: '/workspace/interviews',
      title: 'AI 面试复盘',
      icon: Headphones,
      status: enabled ? '内部测试' : '内测尚未开放',
      text: '上传已获授权的面试录音，转写、校对，再生成有原文依据的复盘。',
      action: enabled ? '上传录音做复盘' : '查看功能状态',
    },
    {
      href: '/interview-center/mock',
      title: '真人 Mock Interview',
      icon: UsersRound,
      status: '预约筹备中',
      text: '了解一对一练习服务，保存希望练习的方向与时间意向。',
      action: '了解真人 Mock',
    },
    {
      href: '/interview-center/history',
      title: '我的面试历史',
      icon: History,
      status: '已开放',
      text: '找回自己的录音复盘、文字练习、手动笔记与服务意向。',
      action: '查看我的记录',
    },
    {
      href: '/interview-center/plan',
      title: '面试准备计划',
      icon: ListChecks,
      status: '部分开放',
      text: '从准备指南到自主文字练习，为每次面试留出准备时间。',
      action: '开始准备',
    },
  ];
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">PREPARE. PRACTICE. REFLECT.</p>
        <h1>面试中心</h1>
        <p>下一次对话，从今天的准备开始。</p>
      </div>
      <div className="ia-hub-grid">
        {items.map(({ href, title, icon: Icon, status, text, action }) => (
          <Link className="site-card ia-hub-card" key={href} href={href}>
            <Icon size={26} strokeWidth={1.6} />
            <h2>{title}</h2>
            <span
              className={`ia-status ${status.includes('筹备') || status.includes('未开放') ? 'pending' : ''}`}
            >
              {status}
            </span>
            <p>{text}</p>
            <span className="site-text-link">
              {action}
              <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
