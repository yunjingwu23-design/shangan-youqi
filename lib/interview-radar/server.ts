import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { ApiError, actor, databaseError } from '@/lib/api';
import type {
  Company,
  InterviewExperience,
  InterviewQuestion,
  InterviewReview,
  InterviewSource,
  JobRole,
  SourceRecord,
  UserSubmission,
} from './types';

function readClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ApiError(503, '数据服务尚未配置。');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function radarError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '23505') throw new ApiError(409, '记录已存在，请勿重复提交。');
  if (error.code === '42501') throw new ApiError(403, '没有执行该操作的权限。');
  if (error.code === '22023') throw new ApiError(400, '字段无效或不符合要求。');
  if (error.code === '22P02') throw new ApiError(400, '数据格式无效。');
  databaseError(error);
}

// ---- Read: reference catalog (public) ----
export async function listCompanies(): Promise<Company[]> {
  const db = readClient();
  const { data, error } = await db
    .from('companies')
    .select('id,name,english_name,industry,company_group,verified_status')
    .order('name')
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []) as Company[];
}

export async function searchCompanies(query: string): Promise<Company[]> {
  const q = query.trim().toLocaleLowerCase().normalize('NFKC');
  if (!q) return [];
  const db = readClient();
  // Match name directly or through aliases.
  const { data: direct, error: dErr } = await db
    .from('companies')
    .select('id,name,english_name,industry,company_group,verified_status')
    .ilike('name', `%${q}%`)
    .limit(10)
    .abortSignal(AbortSignal.timeout(8000));
  radarError(dErr);
  const { data: viaAlias, error: aErr } = await db
    .from('company_aliases')
    .select('company_id, companies(id,name,english_name,industry,company_group,verified_status)')
    .ilike('alias', `%${q}%`)
    .limit(10)
    .abortSignal(AbortSignal.timeout(8000));
  radarError(aErr);
  const aliasCompanies = ((viaAlias ?? []) as { companies: Company | Company[] | null }[])
    .map((r) => (Array.isArray(r.companies) ? r.companies[0] : r.companies))
    .filter((c): c is Company => Boolean(c));
  const seen = new Set<string>();
  const merged: Company[] = [];
  for (const c of [...(direct ?? []), ...aliasCompanies] as Company[]) {
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    merged.push(c);
  }
  return merged.slice(0, 10);
}

export async function listRoles(companyId: string): Promise<JobRole[]> {
  const db = readClient();
  const { data, error } = await db
    .from('job_roles')
    .select('id,company_id,name,category,custom')
    .eq('company_id', companyId)
    .order('name')
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []) as JobRole[];
}

export async function listSources(): Promise<InterviewSource[]> {
  const db = readClient();
  const { data, error } = await db
    .from('interview_sources')
    .select('*')
    .eq('active', true)
    .order('name')
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []) as InterviewSource[];
}

// ---- Read: experiences (public, verified only) ----
export async function listExperiences(filters: {
  companyId?: string;
  roleId?: string;
  recruitmentType?: string;
  round?: string;
  sourceId?: string;
  q?: string;
  limit?: number;
}): Promise<InterviewExperience[]> {
  const db = readClient();
  let query = db
    .from('interview_experiences')
    .select(
      'id,company_id,job_role_id,recruitment_type,cohort,title,summary,source_record_id,origin,verification_status,published_at,created_at,updated_at'
    )
    .eq('verification_status', 'verified')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(filters.limit ?? 100)
    .abortSignal(AbortSignal.timeout(8000));
  if (filters.companyId) query = query.eq('company_id', filters.companyId);
  if (filters.roleId) query = query.eq('job_role_id', filters.roleId);
  if (filters.recruitmentType && filters.recruitmentType !== 'undetermined')
    query = query.eq('recruitment_type', filters.recruitmentType);
  if (filters.q) query = query.ilike('title', `%${filters.q.trim()}%`);
  const { data, error } = await query;
  radarError(error);
  return (data ?? []) as InterviewExperience[];
}

export type ExperienceDetail = {
  id: string;
  company_id: string;
  job_role_id: string;
  recruitment_type: string;
  cohort: string;
  title: string;
  summary: string;
  source_record_id: string | null;
  origin: string;
  verification_status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  company_name: string;
  company_industry: string;
  job_role_name: string;
};

export async function getExperience(id: string): Promise<ExperienceDetail | null> {
  const db = readClient();
  const { data, error } = await db
    .from('interview_experiences')
    .select(
      'id,company_id,job_role_id,recruitment_type,cohort,title,summary,source_record_id,origin,verification_status,published_at,created_at,updated_at,companies(name,industry),job_roles(name,category)'
    )
    .eq('id', id)
    .abortSignal(AbortSignal.timeout(8000))
    .maybeSingle();
  radarError(error);
  if (!data) return null;
  const row = data as Record<string, unknown> & {
    companies?: { name?: string; industry?: string } | null;
    job_roles?: { name?: string; category?: string } | null;
  };
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    job_role_id: String(row.job_role_id),
    recruitment_type: String(row.recruitment_type),
    cohort: String(row.cohort ?? ''),
    title: String(row.title ?? ''),
    summary: String(row.summary ?? ''),
    source_record_id: row.source_record_id ? String(row.source_record_id) : null,
    origin: String(row.origin ?? 'external'),
    verification_status: String(row.verification_status ?? ''),
    published_at: row.published_at ? String(row.published_at) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    company_name: row.companies?.name ?? '',
    company_industry: row.companies?.industry ?? '',
    job_role_name: row.job_roles?.name ?? '',
  };
}

export async function listQuestions(filters: {
  companyId?: string;
  roleId?: string;
  round?: string;
  q?: string;
  limit?: number;
}): Promise<InterviewQuestion[]> {
  const db = readClient();
  let query = db
    .from('interview_questions')
    .select('*')
    .eq('confidence_level', 'verified')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200)
    .abortSignal(AbortSignal.timeout(8000));
  if (filters.companyId) query = query.eq('company_id', filters.companyId);
  if (filters.roleId) query = query.eq('job_role_id', filters.roleId);
  if (filters.round && filters.round !== 'other') query = query.eq('round', filters.round);
  if (filters.q) query = query.ilike('question_text', `%${filters.q.trim()}%`);
  const { data, error } = await query;
  radarError(error);
  return (data ?? []) as InterviewQuestion[];
}

export async function listRoundsForExperience(experienceId: string): Promise<string[]> {
  const db = readClient();
  const { data, error } = await db
    .from('interview_rounds')
    .select('round')
    .eq('experience_id', experienceId)
    .order('sort_order')
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []).map((r: { round: string }) => r.round);
}

export async function listQuestionsForExperience(
  experienceId: string
): Promise<InterviewQuestion[]> {
  const db = readClient();
  const { data, error } = await db
    .from('interview_questions')
    .select('*')
    .eq('experience_id', experienceId)
    .order('created_at')
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []) as InterviewQuestion[];
}

export async function listTagsForExperience(experienceId: string): Promise<string[]> {
  const db = readClient();
  const { data, error } = await db
    .from('interview_tags')
    .select('tag')
    .eq('experience_id', experienceId)
    .order('tag')
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []).map((r: { tag: string }) => r.tag);
}

export async function listAuthorReviews(experienceId: string): Promise<InterviewReview[]> {
  const db = readClient();
  const { data, error } = await db
    .from('interview_reviews')
    .select('*')
    .eq('experience_id', experienceId)
    .eq('reviewer_kind', 'original_author')
    .order('created_at')
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []) as InterviewReview[];
}

export async function getSourceRecord(recordId: string): Promise<SourceRecord | null> {
  const db = readClient();
  const { data, error } = await db
    .from('interview_source_records')
    .select('id,source_id,platform_post_id,normalized_url,title,author,published_at,status,created_at')
    .eq('id', recordId)
    .abortSignal(AbortSignal.timeout(8000))
    .maybeSingle();
  radarError(error);
  return (data as SourceRecord | null) ?? null;
}

// ---- Admin reads ----
export async function adminListRecords(): Promise<SourceRecord[]> {
  const identity = await actor();
  const { data, error } = await identity.db
    .from('interview_source_records')
    .select('id,source_id,platform_post_id,normalized_url,title,author,published_at,status,created_at')
    .order('created_at', { ascending: false })
    .limit(500)
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []) as SourceRecord[];
}

export async function adminListSubmissions(): Promise<UserSubmission[]> {
  const identity = await actor();
  const { data, error } = await identity.db
    .from('user_interview_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
    .abortSignal(AbortSignal.timeout(8000));
  radarError(error);
  return (data ?? []) as UserSubmission[];
}

// ---- Admin mutations (via RPC) ----
export async function radarManage(action: string, payload: Record<string, unknown>) {
  const identity = await actor();
  const { error } = await identity.db.rpc('radar_manage', { action, payload });
  radarError(error);
}
