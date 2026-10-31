import 'server-only';
import { createHash } from 'node:crypto';
import { actor, ApiError, databaseError } from '@/lib/api';
import { adminSupabase } from '@/lib/supabase/admin';
import {
  originalResumeSchema,
  readOriginal,
  RESUME_BUCKET,
  MAX_RESUME_BYTES,
  resumeObject,
} from './model';
import { validateDocx } from './word';
type Identity = Awaited<ReturnType<typeof actor>>;
export async function resumeBucket() {
  const storage = adminSupabase().storage;
  const existing = await storage.getBucket(RESUME_BUCKET);
  if (existing.data) {
    if (existing.data.public || Number(existing.data.file_size_limit) !== MAX_RESUME_BYTES) {
      const fixed = await storage.updateBucket(RESUME_BUCKET, {
        public: false,
        fileSizeLimit: MAX_RESUME_BYTES,
      });
      if (fixed.error) throw new ApiError(503, '简历私有存储尚未准备好。');
    }
    return storage.from(RESUME_BUCKET);
  }
  const created = await storage.createBucket(RESUME_BUCKET, {
    public: false,
    fileSizeLimit: MAX_RESUME_BYTES,
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  });
  if (created.error && !(await storage.getBucket(RESUME_BUCKET)).data)
    throw new ApiError(503, '无法准备简历私有存储，请稍后重试。');
  return storage.from(RESUME_BUCKET);
}
export async function ownedOriginal(identity: Identity, id: string) {
  const { data, error } = await identity.db
    .from('workspace_entries')
    .select('*')
    .eq('user_id', identity.userId)
    .eq('kind', 'resume')
    .eq('id', id)
    .maybeSingle();
  databaseError(error);
  const original = data ? readOriginal(data.content) : null;
  if (!data || !original) throw new ApiError(404, '未找到这份原版简历。');
  return { entry: data, original, path: resumeObject(identity.userId, id, original.fileType) };
}
export async function originalBytes(identity: Identity, id: string) {
  const owned = await ownedOriginal(identity, id),
    bucket = await resumeBucket();
  const { data, error } = await bucket.download(owned.path);
  if (error || !data) throw new ApiError(503, '原文件暂时无法读取，请稍后重试。');
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (
    bytes.length !== owned.original.fileSize ||
    createHash('sha256').update(bytes).digest('hex') !== owned.original.sha256
  )
    throw new ApiError(503, '原文件校验失败，请保留本地原件并联系管理员。');
  return { ...owned, bytes };
}
export async function createOriginal(identity: Identity, fileName: string, bytes: Uint8Array) {
  const type = fileName.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
  if (type === 'docx') {
    try {
      validateDocx(bytes);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : 'Word 格式无效。');
    }
  } else if (
    bytes.length < 100 ||
    !new TextDecoder().decode(bytes.subarray(0, 8)).startsWith('%PDF-') ||
    !new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 2048))).includes('%%EOF')
  )
    throw new ApiError(400, '文件内容不是 PDF，请重新导出后上传。');
  const { count, error: countError } = await identity.db
    .from('workspace_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', identity.userId)
    .eq('kind', 'resume')
    .like('content', '{"format":"shangan-original-resume-v1"%');
  databaseError(countError);
  if ((count || 0) >= 60)
    throw new ApiError(429, '最多保存 60 份原版简历，请先删除不再需要的版本。');
  const original = originalResumeSchema.parse({
    format: 'shangan-original-resume-v1',
    fileType: type,
    fileName,
    fileSize: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    edits: [],
  });
  const bucket = await resumeBucket();
  const initial = await identity.db
    .from('workspace_entries')
    .insert({
      user_id: identity.userId,
      kind: 'resume',
      title: fileName.replace(/\.(pdf|docx)$/i, '').slice(0, 120),
      content: JSON.stringify(original),
    })
    .select('id,title,company,updated_at')
    .single();
  databaseError(initial.error);
  if (!initial.data) throw new ApiError(503, '无法创建简历记录，请重试。');
  const id = initial.data.id,
    path = resumeObject(identity.userId, id, type);
  try {
    const stored = await bucket.upload(path, bytes, {
      contentType:
        type === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    });
    if (stored.error) throw new ApiError(503, '原文件上传失败，请重试。');
    // A purge/account closure may have removed the reserved row during upload.
    const check = await identity.db
      .from('workspace_entries')
      .select('id')
      .eq('id', id)
      .eq('user_id', identity.userId)
      .maybeSingle();
    if (check.error || !check.data) throw new ApiError(409, '账号数据已发生变化，本次上传已取消。');
    return { entry: initial.data, original };
  } catch (error) {
    await bucket.remove([path]);
    await identity.db
      .from('workspace_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', identity.userId);
    throw error;
  }
}
export async function removeOriginalFile(identity: Identity, id: string) {
  const { data, error } = await identity.db
    .from('workspace_entries')
    .select('content')
    .eq('id', id)
    .eq('kind', 'resume')
    .eq('user_id', identity.userId)
    .maybeSingle();
  databaseError(error);
  const original = data ? readOriginal(data.content) : null;
  if (original) {
    const removed = await (
      await resumeBucket()
    ).remove([resumeObject(identity.userId, id, original.fileType)]);
    if (removed.error) throw new ApiError(503, '原文件暂时无法删除，请稍后重试。');
  }
}
export async function purgeResumeFiles(identity: Identity) {
  // No bucket means this account has never used file upload. Do not require new setup for old users.
  const storage = adminSupabase().storage,
    exists = await storage.getBucket(RESUME_BUCKET);
  if (exists.error) {
    if (Number(exists.error.status) === 404 || /not found/i.test(exists.error.message)) return;
    throw new ApiError(503, '暂时无法检查简历文件，请稍后重试删除。');
  }
  for (let batch = 0; batch < 30; batch++) {
    const list = await storage.from(RESUME_BUCKET).list(identity.userId, { limit: 100 });
    if (list.error) throw new ApiError(503, '暂时无法读取待删除的简历文件。');
    if (!list.data.length) return;
    const removed = await storage
      .from(RESUME_BUCKET)
      .remove(list.data.map((file) => `${identity.userId}/${file.name}`));
    if (removed.error) throw new ApiError(503, '简历文件暂时无法删除，请稍后重试。');
  }
  throw new ApiError(503, '文件清理尚未完成，请重试。');
}
