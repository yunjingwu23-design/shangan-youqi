import 'server-only';
import { ApiError, databaseError } from '@/lib/api';
export function salaryError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '23505')
    throw new ApiError(
      409,
      '同公司、岗位、城市、届别、学历、年份和薪资口径已有投稿，请修改原记录。'
    );
  if (error.code === '42501') throw new ApiError(403, '没有执行该操作的权限。');
  if (error.code === '40001') throw new ApiError(409, '记录已更新，请刷新后重试。');
  if (['23514', '22023', '22P02'].includes(error.code || ''))
    throw new ApiError(400, '字段无效或尚未完成来源核验。');
  databaseError(error);
}
