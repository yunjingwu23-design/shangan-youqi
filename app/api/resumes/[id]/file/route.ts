import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, readBody } from '@/lib/api';
import { originalBytes } from '@/lib/resume-files/server';
import { fileEditSchema } from '@/lib/resume-files/model';
import { editWord } from '@/lib/resume-files/word';
function reply(bytes: Uint8Array, fileName: string, type: string) {
  return new NextResponse(new Uint8Array(bytes).buffer, {
    headers: {
      'Content-Type':
        type === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="resume.${type}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export const GET = api(async (request) => {
  const id = z.uuid().parse(new URL(request.url).pathname.split('/').at(-2));
  const source = await originalBytes(await actor(), id);
  return reply(source.bytes, source.original.fileName, source.original.fileType);
});
export const POST = api(async (request) => {
  const id = z.uuid().parse(new URL(request.url).pathname.split('/').at(-2));
  const { edits } = z
    .object({ edits: z.array(fileEditSchema).max(300) })
    .strict()
    .parse(await readBody(request));
  const source = await originalBytes(await actor(), id);
  if (source.original.fileType !== 'docx')
    throw new ApiError(400, 'PDF 请在原页面编辑器中预览后导出。');
  try {
    return reply(
      editWord(source.bytes, edits),
      source.original.fileName.replace(/\.docx$/i, '-已修改.docx'),
      'docx'
    );
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : '导出失败。');
  }
}, true);
