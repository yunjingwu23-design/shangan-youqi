import 'server-only';
import { ApiError } from '@/lib/api';

/** The schedule table has not been created yet (migration not applied). */
export function scheduleSchemaMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  return /relation .*schedule_events.* does not exist/i.test(error.message || '');
}

export function scheduleWriteError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (scheduleSchemaMissing(error))
    throw new ApiError(503, '日程功能尚未初始化，请先在 Supabase 执行「执行-日程提醒迁移.sql」。');
  if (error.code === '23503')
    throw new ApiError(400, '关联的岗位记录不存在或不属于当前账号，请重新选择。');
  if (error.code === '23514') throw new ApiError(400, '日程内容不符合要求，请检查后重试。');
  throw new ApiError(503, '暂时无法保存日程，请稍后重试。');
}
