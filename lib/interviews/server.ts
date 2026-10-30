import 'server-only';
import { ApiError, actor } from '@/lib/api';
import { adminSupabase } from '@/lib/supabase/admin';
import { tombstoneInterviewAudio } from './audio-storage';
import { z } from 'zod';

export async function interviewActor() {
  const identity = await actor();
  if (process.env.INTERVIEWS_ENABLED !== 'true')
    throw new ApiError(503, '面试复盘内部测试暂未开放。');
  return identity;
}
export function interviewError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const message = error.message;
  if (message === 'TRANSCRIPT_UNCONFIRMED') throw new ApiError(400, '请先校对并确认逐字稿。');
  if (message === 'NOT_FOUND' || message === 'JOB_NOT_FOUND')
    throw new ApiError(404, '未找到面试或岗位记录。');
  if (message === 'UPLOAD_QUOTA' || message === 'QUOTA_EXCEEDED')
    throw new ApiError(429, '本月使用额度已用完，请查看用量。');
  if (message === 'STATE_CONFLICT' || message === 'VERSION_CONFLICT' || error.code === '23505')
    throw new ApiError(409, '记录状态已改变，请刷新后重试。');
  throw new ApiError(503, '面试记录暂时无法处理，请稍后重试。');
}
export async function ownInterview(id: string, identity: Awaited<ReturnType<typeof actor>>) {
  z.uuid().parse(id);
  const { data, error } = await identity.db
    .from('interviews')
    .select('*')
    .eq('id', id)
    .eq('user_id', identity.userId)
    .maybeSingle();
  interviewError(error);
  if (!data) throw new ApiError(404, '未找到面试记录。');
  return data;
}
// Always called with an identity validated by actor(); never accept a browser path.
export async function purgeInterviewAudio(identity: Awaited<ReturnType<typeof actor>>) {
  const { data, error } = await identity.db
    .from('interviews')
    .select('id,audio_path')
    .eq('user_id', identity.userId);
  // Account deletion still works before the optional interview migration exists.
  if (error?.code === 'PGRST205' || error?.code === '42P01') return;
  interviewError(error);
  for (const row of data || []) {
    const removed = await identity.db.rpc('interview_action', {
      interview: row.id,
      action: 'delete',
    });
    interviewError(removed.error);
    // A durable cleanup record exists even if Storage is currently unavailable.
    await tombstoneInterviewAudio(adminSupabase(), row.audio_path);
  }
}
