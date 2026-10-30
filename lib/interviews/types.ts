import type { Segment, InterviewReport } from './schema';
export type InterviewRecord = {
  id: string;
  title: string;
  job_id: string | null;
  job_title: string;
  round: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
  transcript_version: number;
  error_code: string | null;
  file_name: string;
  file_size: number;
};
export type ReportRecord = {
  id: string;
  revision: number;
  source_version: number;
  body: InterviewReport;
  author: 'ai' | 'manual';
  created_at: string;
};
export type InterviewDetail = {
  interview: InterviewRecord;
  transcript: { version: number; segments: Segment[]; confirmed_at: string | null } | null;
  reports: ReportRecord[];
  task: {
    kind: string;
    state: string;
    progress: number;
    attempts: number;
    error_code: string | null;
    updated_at: string;
  } | null;
};
export const interviewStatus: Record<string, string> = {
  awaiting_upload: '等待上传',
  queued: '排队中',
  transcribing: '正在转写',
  review: '待校对',
  analyzing: '正在生成报告',
  complete: '报告已保存',
  failed: '处理失败',
  cancelled: '已取消',
  deleting: '正在删除',
};
export const interviewErrors: Record<string, string> = {
  provider_auth: 'AI 服务凭证暂不可用，请联系管理员。',
  provider_rate_limit: '模型服务繁忙，后台将按策略重试。',
  provider_error: '模型服务暂时失败。',
  provider_timeout: '模型请求超时。',
  audio_invalid: '文件不是可处理的音频，请检查格式和音轨。',
  audio_duration_invalid: '录音时长无效或超过 120 分钟。',
  audio_no_speech: '未识别出语音，请检查录音内容。',
  quota_exceeded: '本月音频时长或费用额度已用完。',
  report_invalid: '报告未通过逐字稿证据检查，请重试。',
  storage_unavailable: '暂时无法读取私有录音。',
  worker_timeout: '后台处理超时。',
  worker_error: '后台处理失败，请重试或联系管理员。',
  report_incomplete: '报告未完整生成，请重试。',
  provider_refusal: '模型未能处理这份资料，请检查内容后重试。',
  version_conflict: '逐字稿版本已变化，请重新确认后生成。',
  cancelled: '任务已取消。',
};
