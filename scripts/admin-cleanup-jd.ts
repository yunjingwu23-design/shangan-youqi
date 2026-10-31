import { createClient } from '@supabase/supabase-js';
class AdminScriptError extends Error {}
async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AdminScriptError('缺少可信服务端 Supabase 配置。');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let total = 0;
  for (let batch = 0; batch < 50; batch++) {
    const claimed = await db.rpc('admin_claim_stale_imports');
    if (claimed.error)
      throw new AdminScriptError('暂时无法领取过期的未关联 JD 原件，请检查迁移后重试。');
    if (!claimed.data?.length) break;
    const removed = await db.storage
      .from('jd-originals')
      .remove(
        claimed.data.map(
          (file: { file_id: string; file_type: string }) => `${file.file_id}.${file.file_type}`
        )
      );
    if (removed.error)
      throw new AdminScriptError('私有原件清理失败；记录已锁定为不可关联，可安全重试。');
    const deleted = await db
      .from('jd_import_files')
      .delete()
      .in(
        'id',
        claimed.data.map((file: { file_id: string }) => file.file_id)
      )
      .is('attached_job_id', null)
      .eq('ready', false);
    if (deleted.error) throw new AdminScriptError('原件记录清理失败，请重试。');
    total += claimed.data.length;
  }
  console.info(`已清理 ${total} 个超过 24 小时且未关联岗位的 JD 原件。`);
}
void main().catch((error) => {
  console.error(
    error instanceof AdminScriptError
      ? error.message
      : '后台命令执行失败，请检查服务端配置、网络与数据库迁移。'
  );
  process.exitCode = 1;
});
