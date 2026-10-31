import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, sameOrigin, ApiError } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { consumeLimit } from '@/lib/rate-limit';
import { extractJd, saveJdOriginal, JD_MAX_BYTES, type JdType } from '@/lib/admin/jd-files';
export const runtime = 'nodejs';
export const POST = api(async (request) => {
  sameOrigin(request, 'application/octet-stream');
  const identity = await siteManager(['super_admin', 'editor']),
    name = z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(
        /^[^\x00-\x1f\\/]+\.(txt|docx|pdf)$/i,
        '支持 TXT、DOCX 和文字型 PDF；CSV/Excel 批量导入尚未开放。'
      )
      .parse(new URL(request.url).searchParams.get('name'));
  await consumeLimit('admin-jd-upload', identity.userId, 20, 3600);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, '请选择文件。');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    length += next.value.length;
    if (length > JD_MAX_BYTES) {
      await reader.cancel();
      throw new ApiError(413, 'JD 原件不能超过 3 MiB。');
    }
    chunks.push(next.value);
  }
  if (!length) throw new ApiError(400, '文件为空。');
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  const type = name.toLowerCase().split('.').at(-1) as JdType,
    text = await extractJd(bytes, type),
    file = await saveJdOriginal(identity, name, type, bytes, text);
  return NextResponse.json({ file }, { status: 201 });
});
