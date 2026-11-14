import 'server-only';
import { createHash } from 'node:crypto';
import { actor, ApiError } from '@/lib/api';
import { adminSupabase } from '@/lib/supabase/admin';
import type { CsvImportRow, UrlImportInput, UserSubmissionInput } from './types';
import { collectNowcoder } from './collector';
import { classifyText } from './ai';
import { normalizeClassification } from './ai-normalize';

function normalizeUrl(value: string): string {
  try {
    const u = new URL(value);
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    return '';
  }
}

function fingerprint(...parts: (string | undefined)[]) {
  const joined = parts.filter(Boolean).join('|').toLocaleLowerCase().normalize('NFKC');
  return joined ? createHash('sha256').update(joined).digest('hex').slice(0, 64) : '';
}

// ---- Manual URL import (admin) ----
export async function importUrl(input: UrlImportInput) {
  const identity = await actor();
  const normalized = normalizeUrl(input.url);
  if (!normalized) throw new ApiError(400, '链接格式无效。');
  const postId = input.platform_post_id || normalized;
  const { data, error } = await identity.db
    .from('interview_source_records')
    .insert({
      source_id: input.source_id,
      platform_post_id: postId,
      normalized_url: normalized,
      title: input.title.trim(),
      author: input.author.trim(),
      published_at: input.published_at ? new Date(input.published_at).toISOString() : null,
      content_fingerprint: fingerprint(input.title, input.author),
      status: 'pending_verification',
      imported_by: identity.userId,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') throw new ApiError(409, '该链接已导入，请勿重复提交。');
    throw new ApiError(503, '导入失败，请稍后重试。');
  }
  return data.id as string;
}

// ---- CSV import (admin): returns rows that were skipped as duplicates ----
export async function importCsv(rows: CsvImportRow[]) {
  const identity = await actor();
  const results: { imported: number; skipped: number } = { imported: 0, skipped: 0 };

  // Ensure a default source exists for CSV imports.
  const { data: sources } = await identity.db
    .from('interview_sources')
    .select('id,name')
    .limit(100);

  for (const row of rows) {
    // Resolve or create company.
    const companyId = await resolveCompany(identity.db, row.company.trim());
    const roleId = await resolveRole(identity.db, companyId, row.role.trim());
    const fp = fingerprint(row.title, row.question, row.company, row.role);

    // Duplicate check by fingerprint against existing records.
    const { data: dup } = await identity.db
      .from('interview_source_records')
      .select('id')
      .eq('content_fingerprint', fp)
      .limit(1);
    if (dup && dup.length > 0) {
      results.skipped += 1;
      continue;
    }

    const sourceName = row.source_name.trim();
    let sourceId: string | null = null;
    if (sourceName) {
      const existing = sources?.find((s) => s.name === sourceName);
      if (existing) {
        sourceId = existing.id;
      } else {
        const { data: created } = await identity.db
          .from('interview_sources')
          .insert({
            name: sourceName,
            source_type: 'other',
            supported_methods: ['csv_import'],
            authorization_status: 'manual_only',
          })
          .select('id')
          .single();
        sourceId = created?.id ?? null;
      }
    }

    // Create source record.
    const { data: record, error: recErr } = await identity.db
      .from('interview_source_records')
      .insert({
        source_id: sourceId,
        platform_post_id: fp,
        normalized_url: row.source_url.trim(),
        title: row.title.trim(),
        published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
        content_fingerprint: fp,
        status: 'pending_verification',
        imported_by: identity.userId,
      })
      .select('id')
      .single();

    if (recErr || !record) {
      results.skipped += 1;
      continue;
    }

    // Create an unverified experience draft (pending review).
    const { data: experience } = await identity.db
      .from('interview_experiences')
      .insert({
        company_id: companyId,
        job_role_id: roleId,
        recruitment_type: row.recruitment_type,
        cohort: row.cohort.trim(),
        title: row.title.trim(),
        source_record_id: record.id,
        origin: 'external',
        verification_status: 'pending',
      })
      .select('id')
      .single();

    if (row.question.trim() && experience) {
      await identity.db.from('interview_questions').insert({
        experience_id: experience.id,
        company_id: companyId,
        job_role_id: roleId,
        recruitment_type: row.recruitment_type,
        round: row.round.trim() || 'other',
        question_text: row.question.trim(),
        confidence_level: 'pending',
      });
    }
    results.imported += 1;
  }
  return results;
}

async function resolveCompany(db: Awaited<ReturnType<typeof actor>>['db'], name: string) {
  const { data } = await db.from('companies').select('id').eq('name', name).maybeSingle();
  if (data) return data.id as string;
  const { data: created, error } = await db
    .from('companies')
    .insert({ name, verified_status: 'unverified' })
    .select('id')
    .single();
  if (error || !created) throw new ApiError(503, '创建公司失败。');
  return created.id as string;
}

async function resolveRole(
  db: Awaited<ReturnType<typeof actor>>['db'],
  companyId: string,
  name: string
) {
  const { data } = await db
    .from('job_roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', name)
    .maybeSingle();
  if (data) return data.id as string;
  const { data: created, error } = await db
    .from('job_roles')
    .insert({ company_id: companyId, name, category: 'other', custom: true })
    .select('id')
    .single();
  if (error || !created) throw new ApiError(503, '创建岗位失败。');
  return created.id as string;
}

// ---- User submission ----
export async function submitInterview(input: UserSubmissionInput) {
  const identity = await actor();
  const { data, error } = await identity.db
    .from('user_interview_submissions')
    .insert({
      user_id: identity.userId,
      company_name: input.company_name.trim(),
      job_role_name: input.job_role_name.trim(),
      recruitment_type: input.recruitment_type,
      cohort: input.cohort.trim(),
      rounds: input.rounds,
      questions: input.questions,
      review_text: input.review_text.trim(),
      source_url: input.source_url.trim(),
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') throw new ApiError(409, '请勿重复提交。');
    throw new ApiError(503, '提交失败，请稍后重试。');
  }
  return data.id as string;
}

// ---- User review ----
export async function submitReview(input: {
  experienceId: string;
  difficulty: string;
  rating: number | null;
  text: string;
}) {
  const identity = await actor();
  const { error } = await identity.db.from('interview_reviews').insert({
    experience_id: input.experienceId,
    reviewer_kind: 'user',
    user_id: identity.userId,
    difficulty: input.difficulty.trim(),
    experience_rating: input.rating,
    review_text: input.text.trim(),
  });
  if (error) throw new ApiError(503, '提交失败，请稍后重试。');
}

// ---- Save / unsave ----
export async function toggleSave(experienceId: string, saved: boolean) {
  const identity = await actor();
  if (saved) {
    const { error } = await identity.db
      .from('user_saved_interviews')
      .insert({ user_id: identity.userId, experience_id: experienceId });
    if (error && error.code !== '23505') throw new ApiError(503, '收藏失败。');
  } else {
    const { error } = await identity.db
      .from('user_saved_interviews')
      .delete()
      .eq('user_id', identity.userId)
      .eq('experience_id', experienceId);
    if (error) throw new ApiError(503, '取消收藏失败。');
  }
}

// ---- Subscription ----
export async function toggleSubscription(
  companyId: string | null,
  roleId: string | null,
  subscribed: boolean
) {
  const identity = await actor();
  if (subscribed) {
    const { error } = await identity.db.from('user_source_subscriptions').insert({
      user_id: identity.userId,
      company_id: companyId,
      job_role_id: roleId,
    });
    if (error && error.code !== '23505') throw new ApiError(503, '关注失败。');
  } else {
    let q = identity.db
      .from('user_source_subscriptions')
      .delete()
      .eq('user_id', identity.userId);
    if (companyId) q = q.eq('company_id', companyId);
    if (roleId) q = q.eq('job_role_id', roleId);
    const { error } = await q;
    if (error) throw new ApiError(503, '取消关注失败。');
  }
}

// ---- Automated collection + AI classification (admin) ----
// Collects public Nowcoder discuss posts, classifies each via the configured
// AI provider (DeepSeek/Hunyuan/OpenAI), and writes pending-verification
// source records + unverified experience drafts. Uses service_role because
// bulk writes for operations bypass the per-row admin RPC.
export async function collectAndClassify(options: {
  listUrl?: string;
  maxPosts?: number;
}): Promise<{ collected: number; classified: number; imported: number; skipped: number; aiError?: string }> {
  // Admin-only guard: require an authenticated actor before doing anything.
  await actor();

  const db = adminSupabase();

  // Resolve (or create) the Nowcoder source row.
  const { data: sources } = await db
    .from('interview_sources')
    .select('id,name')
    .eq('name', '牛客网')
    .limit(1);
  let sourceId: string;
  if (sources && sources.length > 0) {
    sourceId = sources[0].id as string;
  } else {
    const { data: created, error: srcErr } = await db
      .from('interview_sources')
      .insert({
        name: '牛客网',
        source_type: 'community',
        supported_methods: ['public_collect'],
        authorization_status: 'manual_only',
        active: true,
      })
      .select('id')
      .single();
    if (srcErr || !created) throw new ApiError(503, '初始化来源目录失败。');
    sourceId = created.id as string;
  }

  const listUrl = options.listUrl || 'https://www.nowcoder.com/discuss';
  const maxPosts = Math.min(options.maxPosts ?? 10, 20);

  let posts;
  try {
    posts = await collectNowcoder(listUrl, maxPosts);
  } catch (e) {
    throw new ApiError(502, '采集失败：无法访问公开页面。');
  }

  let classified = 0;
  let imported = 0;
  let skipped = 0;
  let aiError: string | undefined;

  for (const post of posts) {
    // Duplicate check by fingerprint.
    const { data: dup } = await db
      .from('interview_source_records')
      .select('id')
      .eq('content_fingerprint', post.content_fingerprint)
      .limit(1);
    if (dup && dup.length > 0) {
      skipped += 1;
      continue;
    }

    // AI classification (best-effort; a failed classification still imports
    // the raw record so nothing is silently lost).
    let classification: Awaited<ReturnType<typeof classifyText>> | null = null;
    try {
      classification = await classifyText(post.body_text);
      classified += 1;
    } catch (e) {
      aiError = e instanceof Error ? e.message : 'AI 归纳失败。';
    }

    const normalized = normalizeClassification(classification ?? ({} as never));
    const companyName = classification?.company?.trim();
    const roleName = classification?.job_role?.trim();

    // Resolve or create company.
    let companyId: string | null = null;
    if (companyName) {
      const { data: existing } = await db
        .from('companies')
        .select('id')
        .eq('name', companyName)
        .maybeSingle();
      companyId = existing?.id ?? null;
      if (!companyId) {
        const { data: created } = await db
          .from('companies')
          .insert({ name: companyName, verified_status: 'unverified' })
          .select('id')
          .single();
        companyId = created?.id ?? null;
      }
    }

    // Resolve or create role.
    let roleId: string | null = null;
    if (companyId && roleName) {
      const { data: existing } = await db
        .from('job_roles')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', roleName)
        .maybeSingle();
      roleId = existing?.id ?? null;
      if (!roleId) {
        const { data: created } = await db
          .from('job_roles')
          .insert({
            company_id: companyId,
            name: roleName,
            category: normalized.roleCategory,
            custom: true,
          })
          .select('id')
          .single();
        roleId = created?.id ?? null;
      }
    }

    // Insert source record (pending verification).
    const { data: record, error: recErr } = await db
      .from('interview_source_records')
      .insert({
        source_id: sourceId,
        platform_post_id: post.platform_post_id,
        normalized_url: post.normalized_url,
        title: post.title,
        author: post.author,
        published_at: post.published_at,
        content_fingerprint: post.content_fingerprint,
        raw_excerpt: post.raw_excerpt,
        status: 'pending_verification',
      })
      .select('id')
      .single();
    if (recErr || !record) {
      skipped += 1;
      continue;
    }

    // Insert an unverified experience draft if a company was identified.
    if (companyId && roleId) {
      const summary = classification
        ? [
            classification.author_difficulty ? `难度：${classification.author_difficulty}` : '',
            classification.questions.slice(0, 3).map((q) => q.text).join('；'),
          ]
            .filter(Boolean)
            .join('。')
            .slice(0, 500)
        : post.raw_excerpt.slice(0, 200);
      const { error: expErr } = await db.from('interview_experiences').insert({
        company_id: companyId,
        job_role_id: roleId,
        recruitment_type: normalized.recruitmentType,
        cohort: classification?.cohort?.trim() || '',
        title: post.title,
        summary,
        source_record_id: record.id,
        origin: 'external',
        verification_status: 'pending',
      });
      if (expErr) {
        // Roll back the orphan source record.
        await db.from('interview_source_records').delete().eq('id', record.id);
        skipped += 1;
        continue;
      }
    }

    imported += 1;
  }

  return { collected: posts.length, classified, imported, skipped, aiError };
}
