import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { config } from '@/lib/config';
import { serverSupabase } from '@/lib/supabase/server';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  if (
    request.headers.get('origin') !== config().origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new ApiError(403, '请求来源无效，请从本站重新操作。');
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, '请使用 JSON 请求。');
}
export async function readBody(request: Request, maximumBytes = 90000) {
  // Stream cap also handles requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, '请求内容为空。');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maximumBytes) {
      await reader.cancel();
      throw new ApiError(413, '请求内容过大。');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, '请求格式无效。');
  }
}
export async function actor() {
  const db = await serverSupabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new ApiError(401, '登录已过期，请重新登录。');
  const { data: mapping, error: mappingError } = await db
    .from('app_users')
    .select('user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (mappingError || !mapping) throw new ApiError(503, '账号资料尚未准备好，请稍后重试。');
  return { db, user, userId: mapping.user_id as string };
}
export function databaseError(error: unknown) {
  if (error) throw new ApiError(503, '暂时无法保存或读取数据，请稍后重试。');
}
export function api(handler: (request: Request) => Promise<Response>, mutation = false) {
  return async (request: Request) => {
    try {
      if (mutation) sameOrigin(request);
      return await handler(request);
    } catch (error) {
      if (error instanceof z.ZodError)
        return NextResponse.json(
          { error: error.issues[0]?.message || '输入无效。' },
          { status: 400 }
        );
      if (error instanceof ApiError)
        return NextResponse.json(
          { error: error.message, retryAfter: error.retryAfter },
          {
            status: error.status,
            headers: error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {},
          }
        );
      // Never log tokens, emails, request bodies or upstream credentials.
      console.error(
        'API operation failed',
        error instanceof Error && error.message === 'CONFIG_MISSING'
          ? 'configuration missing'
          : 'unexpected upstream error'
      );
      return NextResponse.json(
        { error: '服务暂不可用，请稍后重试或联系管理员。' },
        { status: 503 }
      );
    }
  };
}
