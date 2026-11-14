import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { ExperienceActions } from '@/components/experience-actions';
import {
  getExperience,
  getSourceRecord,
  listAuthorReviews,
  listQuestionsForExperience,
  listRoundsForExperience,
} from '@/lib/interview-radar/server';
import {
  confidenceLevels,
  interviewRounds,
  questionCategories,
  recruitmentTypes,
} from '@/lib/interview-radar/types';

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;
  const experience = await getExperience(experienceId);
  if (!experience || experience.verification_status !== 'verified') notFound();

  const [questions, rounds, authorReviews, sourceRecord] = await Promise.all([
    listQuestionsForExperience(experienceId),
    listRoundsForExperience(experienceId),
    listAuthorReviews(experienceId),
    experience.source_record_id
      ? getSourceRecord(experience.source_record_id)
      : Promise.resolve(null),
  ]);

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">INTERVIEW EXPERIENCE</p>
        <h1>{experience.title}</h1>
        <p>
          {recruitmentTypes[experience.recruitment_type] ?? '未确定'}
          {experience.cohort ? ` · ${experience.cohort}` : ''}
          {experience.origin === 'user_submission' ? ' · 用户投稿' : ' · 外部来源'}
        </p>
      </div>

      <section className="site-card">
        <h2>面试轮次</h2>
        <div className="radar-tags">
          {rounds.length ? (
            rounds.map((r) => (
              <span className="job-badge" key={r}>
                {interviewRounds[r as keyof typeof interviewRounds] ?? r}
              </span>
            ))
          ) : (
            <span className="job-badge">未标注轮次</span>
          )}
        </div>
      </section>

      {experience.summary && (
        <section className="site-card">
          <h2>面经摘要</h2>
          <p>{experience.summary}</p>
        </section>
      )}

      {questions.length > 0 && (
        <section className="site-card">
          <h2>已核验问题要点</h2>
          <div className="radar-questions">
            {questions.map((question) => (
              <div className="radar-question" key={question.id}>
                <div className="radar-card-head">
                  <span className="job-badge">
                    {questionCategories[question.question_category] ?? '其他'}
                  </span>
                  <span className="job-badge">
                    {interviewRounds[question.round as keyof typeof interviewRounds] ?? question.round}
                  </span>
                  <span className="job-badge">
                    {confidenceLevels[question.confidence_level] ?? '待核实'}
                  </span>
                </div>
                <p>{question.question_text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {authorReviews.length > 0 && (
        <section className="site-card">
          <h2>原作者评价</h2>
          <p className="site-hint">以下为原作者公开分享的主观感受，不代表本站立场。</p>
          {authorReviews.map((review) => (
            <div className="radar-review" key={review.id}>
              {review.difficulty && <span className="job-badge">难度：{review.difficulty}</span>}
              {review.result && <span className="job-badge">结果：{review.result}</span>}
              {review.review_text && <p>{review.review_text}</p>}
            </div>
          ))}
        </section>
      )}

      {sourceRecord?.normalized_url && (
        <section className="site-card">
          <h2>原始来源</h2>
          <a className="site-text-link" href={sourceRecord.normalized_url} target="_blank" rel="noopener noreferrer">
            查看原帖 <ExternalLink size={14} />
          </a>
          {sourceRecord.author && <p className="site-hint">原作者：{sourceRecord.author}</p>}
        </section>
      )}

      <ExperienceActions experienceId={experienceId} />

      <div className="site-actions">
        <Link className="button secondary" href="/resources/radar">
          ← 返回面经雷达
        </Link>
      </div>
    </main>
  );
}
