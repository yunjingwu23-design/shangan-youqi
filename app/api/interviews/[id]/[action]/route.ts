import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, ApiError, readBody } from '@/lib/api';
import { interviewActor, interviewError, ownInterview } from '@/lib/interviews/server';
import { adminSupabase } from '@/lib/supabase/admin';
import {
  AUDIO_BUCKET,
  MAX_AUDIO_BYTES,
  transcriptSchema,
  reportSchema,
  validateEvidence,
  segmentsSchema,
} from '@/lib/interviews/schema';
type Context = { params: Promise<{ id: string; action: string }> };
async function handle(request: Request, context: Context) {
  return api(async () => {
    const { id, action } = await context.params;
    const identity = await interviewActor();
    const row = await ownInterview(id, identity);
    if (request.method === 'POST' && action === 'upload') {
      if (row.status !== 'awaiting_upload') throw new ApiError(409, '录音已提交，不能覆盖原文件。');
      const { data, error } = await adminSupabase()
        .storage.from(AUDIO_BUCKET)
        .createSignedUploadUrl(row.audio_path, { upsert: false });
      if (error || !data) throw new ApiError(503, '录音上传服务暂不可用。');
      return NextResponse.json({ uploadUrl: data.signedUrl, path: row.audio_path });
    }
    let payload: unknown = {};
    let rpcAction = action;
    if (request.method === 'POST' && action === 'transcribe') {
      const { data, error } = await adminSupabase().storage.from(AUDIO_BUCKET).info(row.audio_path);
      if (error || !data) throw new ApiError(400, '尚未找到上传的录音，请重新上传。');
      if (
        typeof data.size !== 'number' ||
        data.size !== row.file_size ||
        data.size > MAX_AUDIO_BYTES
      )
        throw new ApiError(400, '录音实际大小与上传声明不一致，请删除后重新创建。');
    } else if (request.method === 'PUT' && action === 'transcript') {
      payload = transcriptSchema.parse(await readBody(request, 500000));
    } else if (request.method === 'POST' && action === 'report') {
      payload = z
        .object({ version: z.number().int().min(1), confirmed: z.literal(true) })
        .strict()
        .parse(await readBody(request));
    } else if (request.method === 'PUT' && action === 'report') {
      const edit = z
        .object({ revision: z.number().int().min(1), body: reportSchema })
        .strict()
        .parse(await readBody(request, 150000));
      const { data: report, error } = await identity.db
        .from('interview_reports')
        .select('source_version')
        .eq('interview_id', id)
        .eq('revision', edit.revision)
        .maybeSingle();
      interviewError(error);
      if (!report) throw new ApiError(404, '未找到报告版本。');
      const { data: source, error: sourceError } = await identity.db
        .from('interview_transcripts')
        .select('segments')
        .eq('interview_id', id)
        .eq('version', report.source_version)
        .single();
      interviewError(sourceError);
      try {
        validateEvidence(edit.body, segmentsSchema.parse(source?.segments));
      } catch {
        throw new ApiError(400, '报告证据必须对应原逐字稿，请保留有效的原文引用。');
      }
      payload = edit;
      rpcAction = 'edit_report';
    } else if (request.method === 'DELETE' && action === 'report') {
      rpcAction = 'delete_report';
    } else if (!(request.method === 'POST' && ['cancel', 'retry'].includes(action))) {
      throw new ApiError(404, '未找到此操作。');
    }
    const { error } = await identity.db.rpc('interview_action', {
      interview: id,
      action: rpcAction,
      payload,
    });
    interviewError(error);
    return NextResponse.json(
      { saved: true },
      {
        status:
          request.method === 'POST' && ['report', 'transcribe', 'retry'].includes(action)
            ? 202
            : 200,
      }
    );
  }, true)(request);
}
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export async function GET(request: Request, context: Context) {
  return api(async () => {
    const { id, action } = await context.params;
    const identity = await interviewActor();
    const row = await ownInterview(id, identity);
    if (action !== 'audio') throw new ApiError(404, '未找到此操作。');
    const { data, error } = await adminSupabase()
      .storage.from(AUDIO_BUCKET)
      .createSignedUrl(row.audio_path, 300);
    if (error || !data) throw new ApiError(503, '暂时无法播放录音。');
    return NextResponse.json({ url: data.signedUrl, expiresIn: 300 });
  })(request);
}
