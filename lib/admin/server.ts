import 'server-only';
import { ApiError } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import type { AdminJob, JobSource } from './model';
type Identity = Awaited<ReturnType<typeof siteManager>>;
export function adminError(error: unknown) {
  if (!error) return;
  const value = error as { message?: string; code?: string };
  const known: Record<string, [number, string]> = {
    ADMIN_FORBIDDEN: [403, '当前账号无权执行此操作。'],
    ADMIN_REAUTH: [403, '请退出并重新验证邮箱，在 15 分钟内管理管理员权限。'],
    ADMIN_CONFLICT: [409, '记录已被修改，请刷新后重试。'],
    ADMIN_NOT_FOUND: [404, '未找到该记录。'],
    ADMIN_INVALID: [400, '输入格式或字段不受支持。'],
    ADMIN_STATE: [409, '当前岗位状态不支持这项操作，请刷新并按审核流程继续。'],
    ADMIN_JOB_INCOMPLETE: [400, '请补齐城市、职责、要求、原始 JD、来源和投递方式后再提交。'],
    ADMIN_RETENTION_EVIDENCE: [400, '转正实习必须填写 JD 中真实的留用说明原文。'],
    ADMIN_DEADLINE_PASSED: [400, '岗位截止时间已过，不能提交或发布。'],
    ADMIN_REASON_REQUIRED: [400, '请填写至少 10 字的审核说明。'],
    ADMIN_SOURCE_CHECK_REQUIRED: [400, '审核通过前必须核验来源、投递方式和留用依据。'],
    ADMIN_INVITE_INVALID: [400, '邀请无效、已过期或不属于当前邮箱。'],
    ADMIN_ALREADY_MEMBER: [409, '当前账号已经是启用的管理员。'],
    ADMIN_BOOTSTRAPPED: [409, '超级管理员已初始化，后续请通过超级管理员邀请。'],
    ADMIN_VERIFIED_ACCOUNT_REQUIRED: [400, '请先使用该邮箱完成一次真实验证码登录。'],
    ADMIN_LAST_SUPER: [409, '请先授权另一位启用的超级管理员，再停用、降权或注销当前账号。'],
    ADMIN_FILE_INVALID: [400, 'JD 原件尚未上传完成、已失效或不属于当前岗位。'],
  };
  if (value.message && known[value.message]) {
    const [status, message] = known[value.message];
    throw new ApiError(status, message);
  }
  if (['22023', '22007', '22008', '22P02', '23514'].includes(value.code || ''))
    throw new ApiError(400, '字段格式、日期或内容长度不符合要求。');
  if (value.code === '42501') throw new ApiError(403, '数据库拒绝了未授权操作。');
  console.error('ADMIN_DATABASE_FAILED', {
    code: /^[A-Z0-9]{5,10}$/.test(value.code || '') ? value.code : 'UNKNOWN',
  });
  throw new ApiError(503, '后台数据暂不可用，请确认运营后台迁移已执行，或稍后重试。');
}
export function flattenJob(job: any, meta: any, source: any): AdminJob {
  if (!meta) throw new ApiError(503, '岗位运营元数据尚未准备好，请检查后台迁移。');
  return {
    ...job,
    ...meta,
    id: job.id,
    raw_jd: source?.corrected_jd || '',
    source_published_at: source?.source_published_at || null,
    source_file_id: source?.file_id || null,
  };
}
export async function adminJob(identity: Identity, id: string) {
  const job = await identity.db.from('job_catalog').select('*').eq('id', id).maybeSingle();
  adminError(job.error);
  if (!job.data) throw new ApiError(404, '未找到该岗位。');
  const [meta, sources, reviews] = await Promise.all([
    identity.db.from('job_admin_meta').select('*').eq('job_id', id).single(),
    identity.db
      .from('job_sources')
      .select('*')
      .eq('job_id', id)
      .order('revision', { ascending: false })
      .limit(30),
    identity.db
      .from('job_reviews')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  for (const item of [meta, sources, reviews]) adminError(item.error);
  const current = (sources.data as JobSource[]).find(
    (source) => source.id === meta.data.current_source_id
  );
  return {
    job: flattenJob(job.data, meta.data, current),
    sources: sources.data,
    reviews: reviews.data,
  };
}
export async function adminJobs(identity: Identity, query: URLSearchParams) {
  const offset = Math.max(0, Math.min(100000, Number(query.get('offset') || 0) || 0));
  let select = identity.db
    .from('job_catalog')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + 49);
  const state = query.get('state'),
    type = query.get('type'),
    term = (query.get('q') || '')
      .trim()
      .slice(0, 120)
      .replace(/[,%_()]/g, ' ');
  if (state) select = select.eq('state', state);
  if (type) select = select.eq('type', type);
  if (term) select = select.or(`company.ilike.%${term}%,title.ilike.%${term}%`);
  const result = await select;
  adminError(result.error);
  const ids = result.data!.map((row) => row.id);
  if (!ids.length) return { jobs: [], total: result.count || 0, nextOffset: null };
  const meta = await identity.db.from('job_admin_meta').select('*').in('job_id', ids);
  adminError(meta.error);
  const sourceIds = meta.data!.map((row) => row.current_source_id).filter(Boolean);
  const sources = sourceIds.length
    ? await identity.db.from('job_sources').select('*').in('id', sourceIds)
    : { data: [], error: null };
  adminError(sources.error);
  return {
    jobs: result.data!.map((job) =>
      flattenJob(
        job,
        meta.data!.find((row) => row.job_id === job.id),
        sources.data!.find((row) => row.job_id === job.id)
      )
    ),
    total: result.count || 0,
    nextOffset: offset + 50 < (result.count || 0) ? offset + 50 : null,
  };
}
