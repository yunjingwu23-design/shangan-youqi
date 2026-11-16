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
  listTagsForExperience,
} from '@/lib/interview-radar/server';
import {
  confidenceLevels,
  interviewRounds,
  questionCategories,
  recruitmentTypes,
} from '@/lib/interview-radar/types';

const ROUND_ORDER = [
  'written_test',
  'ai_interview',
  'online_assessment',
  'group_interview',
  'first_round',
  'second_round',
  'third_round',
  'professional_round',
  'hr_round',
  'final_round',
  'other',
];

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;
  const experience = await getExperience(experienceId);
  if (!experience || experience.verification_status !== 'verified') notFound();

  const [questions, rounds, authorReviews, tags, sourceRecord] = await Promise.all([
    listQuestionsForExperience(experienceId),
    listRoundsForExperience(experienceId),
    listAuthorReviews(experienceId),
    listTagsForExperience(experienceId),
    experience.source_record_id
      ? getSourceRecord(experience.source_record_id)
      : Promise.resolve(null),
  ]);

  const authorReview = authorReviews[0];
  const difficulty = authorReview?.difficulty?.trim() || null;
  const result = authorReview?.result?.trim() || null;

  // 问题按轮次分组，按固定轮次顺序展示
  const questionsByRound = new Map<string, typeof questions>();
  for (const q of questions) {
    const key = q.round || 'other';
    if (!questionsByRound.has(key)) questionsByRound.set(key, []);
    questionsByRound.get(key)!.push(q);
  }
  const orderedRounds = ROUND_ORDER.filter((r) => questionsByRound.has(r));

  // 来源域名：牛客等平台帖子需登录才能看
  let sourceHost = '';
  try {
    sourceHost = sourceRecord?.normalized_url
      ? new URL(sourceRecord.normalized_url).hostname.replace(/^www\./, '')
      : '';
  } catch {
    sourceHost = '';
  }
  const likelyLoginWall = /nowcoder|xiaohongshu|maimai|zhihu|bilibili/.test(sourceHost);
  const sourceName = sourceHost || '原平台';

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">INTERVIEW EXPERIENCE</p>
        <h1>{experience.title}</h1>
        <p>
          {recruitmentTypes[experience.recruitment_type as keyof typeof recruitmentTypes] ??
            '未确定'}
          {experience.cohort ? ` · ${experience.cohort}` : ''}
          {experience.origin === 'user_submission' ? ' · 用户投稿' : ' · 外部来源'}
        </p>
      </div>

      {/* 基本信息卡 */}
      <section className="site-card radar-overview">
        <h2>面试概览</h2>
        <div className="radar-overview-grid">
          <div className="radar-overview-item">
            <span className="radar-overview-label">公司</span>
            <span className="radar-overview-value">
              {experience.company_name || '未标注'}
              {experience.company_industry ? `（${experience.company_industry}）` : ''}
            </span>
          </div>
          <div className="radar-overview-item">
            <span className="radar-overview-label">岗位</span>
            <span className="radar-overview-value">
              {experience.job_role_name || '未标注'}
            </span>
          </div>
          <div className="radar-overview-item">
            <span className="radar-overview-label">面试轮次</span>
            <span className="radar-overview-value">
              {rounds.length ? (
                <span className="radar-tags">
                  {rounds.map((r) => (
                    <span className="job-badge" key={r}>
                      {interviewRounds[r as keyof typeof interviewRounds] ?? r}
                    </span>
                  ))}
                </span>
              ) : (
                '未标注'
              )}
            </span>
          </div>
          {difficulty && (
            <div className="radar-overview-item">
              <span className="radar-overview-label">难度</span>
              <span className="radar-overview-value">{difficulty}</span>
            </div>
          )}
          {result && (
            <div className="radar-overview-item">
              <span className="radar-overview-label">结果</span>
              <span className="radar-overview-value">{result}</span>
            </div>
          )}
        </div>
      </section>

      {/* 面经摘要 */}
      {experience.summary && (
        <section className="site-card">
          <h2>面经摘要</h2>
          <p className="radar-summary">{experience.summary}</p>
        </section>
      )}

      {/* 面试问题（按轮次分组） */}
      {questions.length > 0 && (
        <section className="site-card">
          <h2>面试问题</h2>
          {orderedRounds.map((round) => {
            const list = questionsByRound.get(round)!;
            return (
              <div className="radar-round-group" key={round}>
                <h3 className="radar-round-title">
                  {interviewRounds[round as keyof typeof interviewRounds] ?? round}
                  <span className="radar-round-count">{list.length} 题</span>
                </h3>
                <div className="radar-questions">
                  {list.map((question) => (
                    <div className="radar-question" key={question.id}>
                      <div className="radar-card-head">
                        <span className="job-badge">
                          {questionCategories[question.question_category] ?? '其他'}
                        </span>
                        <span className="job-badge">
                          {confidenceLevels[question.confidence_level] ?? '待核实'}
                        </span>
                      </div>
                      <p>{question.question_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 原作者评价 */}
      {(authorReview?.review_text || difficulty || result) && (
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

      {/* 标签 */}
      {tags.length > 0 && (
        <section className="site-card">
          <h2>标签</h2>
          <div className="radar-tags">
            {tags.map((tag) => (
              <span className="job-badge" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 原始来源 */}
      {sourceRecord?.normalized_url && (
        <section className="site-card">
          <h2>原始来源</h2>
          <a
            className="site-text-link"
            href={sourceRecord.normalized_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看原帖 <ExternalLink size={14} />
          </a>
          {sourceRecord.author && <p className="site-hint">原作者：{sourceRecord.author}</p>}
          <p className="site-hint radar-source-tip">
            {likelyLoginWall
              ? `原帖来自「${sourceName}」，该平台可能需要登录后才能查看；本站已归纳要点，不影响阅读。`
              : '原帖链接可能因失效、下架或需登录而无法打开；本站已归纳要点，可先阅读上方摘要与问题。'}
          </p>
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
