import 'server-only';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ApiError } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { adminSupabase } from '@/lib/supabase/admin';
import { wordBlocks } from '@/lib/resume-files/word';
import { fileLines } from '@/lib/resume-files/search';
import { NativePdf } from '@/lib/resume-files/pdf';
import { adminError } from './server';
export const JD_BUCKET = 'jd-originals',
  JD_MAX_BYTES = 3 * 1024 * 1024;
export const jdMime = {
  txt: 'text/plain',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
export type JdType = keyof typeof jdMime;
export function jdPath(id: string, type: JdType) {
  return `${id}.${type}`;
}
export async function extractJd(bytes: Uint8Array, type: JdType) {
  let text = '';
  try {
    if (type === 'txt')
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
    else if (type === 'docx')
      text = fileLines(wordBlocks(bytes), [])
        .map((line) => line.text)
        .join('\n');
    else {
      if (!new TextDecoder().decode(bytes.subarray(0, 8)).startsWith('%PDF-'))
        throw new Error('文件内容不是 PDF。');
      const engine = await NativePdf.create(
        bytes,
        new Uint8Array(await readFile(join(process.cwd(), 'public/vendor/resume/pdfium.wasm'))),
        async () => {
          throw new Error('不需要加载编辑字体。');
        }
      );
      text = engine
        .info()
        .blocks.map((block) => block.text)
        .join('\n');
    }
  } catch (error) {
    throw new ApiError(
      400,
      type === 'txt'
        ? '无法读取，请使用 UTF-8 编码的 TXT。'
        : error instanceof Error
          ? error.message.replaceAll('简历', 'JD')
          : '无法提取 JD 文字。'
    );
  }
  text = text.trim();
  if (!text) throw new ApiError(400, '未提取到文字。扫描 PDF 暂不支持 OCR，请粘贴核对后的原文。');
  if (text.length > 50000) throw new ApiError(400, 'JD 原文超过 50000 字，请拆成单条岗位后导入。');
  return text;
}
export async function saveJdOriginal(
  identity: Awaited<ReturnType<typeof siteManager>>,
  name: string,
  type: JdType,
  bytes: Uint8Array,
  text: string
) {
  const hash = createHash('sha256').update(bytes).digest('hex'),
    registered = await identity.db.rpc('admin_register_import', {
      file_name: name,
      file_type: type,
      file_size: bytes.length,
      file_sha: hash,
      source_text: text,
    });
  adminError(registered.error);
  const id = registered.data.id as string,
    storage = adminSupabase().storage.from(JD_BUCKET),
    path = jdPath(id, type);
  try {
    const uploaded = await storage.upload(path, bytes, {
      contentType: jdMime[type],
      upsert: false,
    });
    if (uploaded.error)
      throw new ApiError(503, 'JD 私有原件保存失败，请检查后台迁移和 Storage 后重试。');
    const complete = await adminSupabase().rpc('admin_finish_import', { file_id: id });
    adminError(complete.error);
    return { id, fileName: name, fileType: type, fileSize: bytes.length, text };
  } catch (error) {
    await storage.remove([path]);
    await adminSupabase().from('jd_import_files').delete().eq('id', id).is('attached_job_id', null);
    throw error;
  }
}
export async function readJdOriginal(
  identity: Awaited<ReturnType<typeof siteManager>>,
  id: string
) {
  const record = await identity.db
    .from('jd_import_files')
    .select('id,file_name,file_type,file_size,sha256,ready')
    .eq('id', id)
    .maybeSingle();
  adminError(record.error);
  if (!record.data?.ready) throw new ApiError(404, '未找到可访问的 JD 原件。');
  const result = await adminSupabase()
    .storage.from(JD_BUCKET)
    .download(jdPath(id, record.data.file_type));
  if (result.error || !result.data) throw new ApiError(503, 'JD 原件暂时无法读取，请稍后重试。');
  const bytes = new Uint8Array(await result.data.arrayBuffer());
  if (
    bytes.length !== record.data.file_size ||
    createHash('sha256').update(bytes).digest('hex') !== record.data.sha256
  )
    throw new ApiError(503, '原件校验失败，请联系管理员。');
  return { ...record.data, bytes };
}
