import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { actor, ApiError, databaseError } from '@/lib/api';
import type { CatalogJob } from './catalog';
import type { AdminRole } from './admin/model';
export async function publishedCatalog(): Promise<{ jobs: CatalogJob[]; available: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { jobs: [], available: false };
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db
      .from('job_catalog')
      .select('*')
      .eq('state', 'published')
      .order('verified_at', { ascending: false })
      .limit(500)
      .abortSignal(AbortSignal.timeout(8000));
    if (error) return { jobs: [], available: error.code === 'PGRST205' || error.code === '42P01' };
    return {
      jobs: (data as CatalogJob[]).filter(
        (job) => !job.deadline_at || new Date(job.deadline_at).getTime() > Date.now()
      ),
      available: true,
    };
  } catch {
    return { jobs: [], available: false };
  }
}
export async function catalogJob(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db
    .from('job_catalog')
    .select('*')
    .eq('id', id)
    .eq('state', 'published')
    .abortSignal(AbortSignal.timeout(8000))
    .maybeSingle();
  return error || (data?.deadline_at && new Date(data.deadline_at).getTime() <= Date.now())
    ? null
    : (data as CatalogJob | null);
}
export async function siteManager(roles: AdminRole[] = ['super_admin', 'editor', 'reviewer']) {
  const identity = await actor();
  const { data, error } = await identity.db
    .from('admin_memberships')
    .select('user_id,role,active')
    .eq('user_id', identity.userId)
    .eq('active', true)
    .maybeSingle();
  databaseError(error);
  if (!data || !roles.includes(data.role)) throw new ApiError(403, '当前账号没有运营权限。');
  return { ...identity, adminRole: data.role as AdminRole };
}
