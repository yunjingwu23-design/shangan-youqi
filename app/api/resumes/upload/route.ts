import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, sameOrigin } from '@/lib/api';
import { consumeLimit } from '@/lib/rate-limit';
import { MAX_RESUME_BYTES } from '@/lib/resume-files/model';
import { createOriginal } from '@/lib/resume-files/server';
import { recordBusinessEvent } from '@/lib/analytics/server';
export const runtime = 'nodejs';
export const POST = api(async (request) => {
  sameOrigin(request, 'application/octet-stream');
  const identity = await actor();
  const fileName = z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[^\x00-\x1f\\/]+\.(pdf|docx)$/i, '支持 PDF / DOCX；旧版 DOC 请先另存为 DOCX。')
    .parse(new URL(request.url).searchParams.get('name'));
  await consumeLimit('resume-upload', identity.userId, 20, 3600);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, '请选择简历文件。');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.length;
    if (length > MAX_RESUME_BYTES) {
      await reader.cancel();
      throw new ApiError(413, '简历文件不能超过 3 MiB。');
    }
    chunks.push(chunk.value);
  }
  if (!length) throw new ApiError(400, '文件为空。');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const result = await createOriginal(identity, fileName, bytes);
  await recordBusinessEvent('resume_upload', identity.userId, '/resume');
  return NextResponse.json(
    { resume: { ...result.entry, original: result.original } },
    { status: 201 }
  );
});
