import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { catalogJob } from '@/lib/catalog-server';
import { exampleJobs, jobTypes } from '@/lib/catalog';
import { siteSession } from '@/lib/site-session';
import { JobActions, CopyEmail } from '@/components/jobs';
export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job =
    exampleJobs.find((j) => j.id === id) ||
    (z.uuid().safeParse(id).success ? await catalogJob(id) : null);
  if (!job) notFound();
  const user = await siteSession();
  return (
    <main className="site-main site-detail">
      <Link className="site-back" href="/jobs">
        ← 返回找岗位
      </Link>
      {job.preview && (
        <div className="site-notice">交互样品预览 · 非实时招聘，不可用于实际投递。</div>
      )}
      <div className="job-detail-grid">
        <article className="site-card job-detail">
          <div className="job-tags">
            <span>{jobTypes[job.type]}</span>
            <span>{job.city}</span>
          </div>
          <p className="site-eyebrow">{job.company}</p>
          <h1>{job.title}</h1>
          <p className="muted">
            {job.industry} · {job.cohort || '届别请查看岗位要求'} ·{' '}
            {job.preview
              ? '招聘状态未核验'
              : `最近核验：${new Date(job.verified_at!).toLocaleDateString('zh-CN')}`}
          </p>
          <h2>岗位职责</h2>
          <p className="site-prose">{job.responsibilities}</p>
          <h2>任职要求</h2>
          <p className="site-prose">{job.requirements}</p>
          {job.type === 'conversion_internship' && (
            <section className="site-notice">
              {job.preview ? (
                '样品的“转正实习”标签不代表真实留用机会，发布前需要核验招聘方原文。'
              ) : (
                <>
                  <strong>留用情况：有留用可能（以招聘方实际考核及安排为准）</strong>
                  <p>原文依据：{job.retention_evidence}</p>
                </>
              )}
            </section>
          )}
          <h2>投递方式与招聘来源</h2>
          {job.preview ? (
            <p className="muted">样品没有已核验的投递联系方式，暂不开放投递跳转或邮箱复制。</p>
          ) : (
            <>
              <p>
                以下信息属于本岗位。跳转招聘方页面不代表已经完成投递，请自行核对并在工作台更新状态。
              </p>
              {job.contacts.map((contact) => (
                <div className="job-contact" key={contact.email}>
                  <div>
                    <small>{contact.label || '投递邮箱'}</small>
                    <p>{contact.email}</p>
                  </div>
                  <CopyEmail email={contact.email} />
                </div>
              ))}
              {job.mail_subject && <p>邮件标题要求：{job.mail_subject}</p>}
              {job.application_instructions && (
                <>
                  <h3>本岗位投递说明</h3>
                  <p className="site-prose">{job.application_instructions}</p>
                </>
              )}
              {job.deadline_at && (
                <p>
                  截止时间（北京时间）：
                  {new Date(job.deadline_at).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    hour12: false,
                  })}
                </p>
              )}
              <div className="site-actions">
                {job.apply_url && (
                  <a
                    className="button primary"
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-analytics-event="application_link_click"
                    data-analytics-job={job.id}
                  >
                    前往招聘方投递 ↗
                  </a>
                )}
                <a
                  className="button secondary"
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看原始招聘来源 ↗
                </a>
              </div>
            </>
          )}
        </article>
        <aside>
          <section className="site-card">
            <h2>把这个机会留在自己的空间</h2>
            <p>保存后可继续记录投递状态、简历版本与面试准备。</p>
            <JobActions job={job} signedIn={Boolean(user)} />
          </section>
          <section className="site-card">
            <h3>为这次机会做准备</h3>
            <Link className="site-text-link" href="/workspace">
              进入我的求职工作台 →
            </Link>
            <Link className="site-text-link" href="/resume">
              编辑岗位简历 →
            </Link>
            <Link className="site-text-link" href="/resources">
              阅读面试准备指南 →
            </Link>
            <Link className="site-text-link" href="/interview-center/practice">
              开始文字面试练习 →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
