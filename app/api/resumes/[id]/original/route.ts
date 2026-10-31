import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, ApiError, readBody, databaseError } from '@/lib/api';
import { fileEditSchema, originalResumeSchema } from '@/lib/resume-files/model';
import { ownedOriginal, originalBytes, createOriginal } from '@/lib/resume-files/server';
import { editWord } from '@/lib/resume-files/word';
export const PUT = api(async (request) => {
  const id = z.uuid().parse(new URL(request.url).pathname.split('/').at(-2));
  const input = z
    .object({
      expectedUpdatedAt: z.string().min(1),
      title: z.string().trim().min(1).max(120),
      edits: z.array(fileEditSchema).max(300),
    })
    .strict()
    .parse(await readBody(request));
  const identity = await actor(),
    source = await ownedOriginal(identity, id);
  const original = originalResumeSchema.parse({ ...source.original, edits: input.edits });
  if (original.fileType === 'docx') {
    try {
      editWord((await originalBytes(identity, id)).bytes, input.edits);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : '文字位置已失效。');
    }
  } else if (input.edits.some((edit) => !/^[0-9]+:[0-9]+$/.test(edit.key)))
    throw new ApiError(400, 'PDF 文字位置无效。');
  const result = await identity.db
    .from('workspace_entries')
    .update({ title: input.title, content: JSON.stringify(original) })
    .eq('user_id', identity.userId)
    .eq('kind', 'resume')
    .eq('id', id)
    .eq('updated_at', input.expectedUpdatedAt)
    .select('id,title,company,updated_at')
    .maybeSingle();
  databaseError(result.error);
  if (!result.data) throw new ApiError(409, '该版本已在其他页面修改，请保留当前修改后重新载入。');
  return NextResponse.json({ resume: { ...result.data, original } });
}, true);
export const POST = api(async (request) => {
  const id = z.uuid().parse(new URL(request.url).pathname.split('/').at(-2)),
    identity = await actor(),
    source = await originalBytes(identity, id);
  const input = z
    .object({ title: z.string().trim().min(1).max(120), edits: z.array(fileEditSchema).max(300) })
    .strict()
    .parse(await readBody(request));
  const copied = originalResumeSchema.parse({ ...source.original, edits: input.edits });
  if (copied.fileType === 'docx') {
    try {
      editWord(source.bytes, input.edits);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : '修改位置无效。');
    }
  } else if (input.edits.some((edit) => !/^[0-9]+:[0-9]+$/.test(edit.key)))
    throw new ApiError(400, 'PDF 文字位置无效。');
  const result = await createOriginal(identity, source.original.fileName, source.bytes);
  const saved = await identity.db
    .from('workspace_entries')
    .update({ title: input.title.slice(0, 110) + ' · 新版本', content: JSON.stringify(copied) })
    .eq('id', result.entry.id)
    .eq('user_id', identity.userId)
    .select('id,title,company,updated_at')
    .single();
  databaseError(saved.error);
  return NextResponse.json({ resume: { ...saved.data, original: copied } }, { status: 201 });
}, true);
