import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
export const cookieName = "sayq_resume_session";
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  let match = !origin;
  try {
    if (origin) {
      const url = new URL(origin);
      match =
        ["http:", "https:"].includes(url.protocol) &&
        url.host === (req.headers.get("host") || new URL(req.url).host);
    }
  } catch {
    return false;
  }
  return (
    match &&
    !["cross-site", "none"].includes(req.headers.get("sec-fetch-site") || "")
  );
}
export function authorize(req: NextRequest) {
  if (!sameOrigin(req) || !req.headers.get("origin"))
    return NextResponse.json(
      { error: "请求来源不匹配，请从本站打开简历编辑器。" },
      { status: 403, headers: privateHeaders },
    );
  const cookie = req.cookies.get(cookieName)?.value || "";
  const csrf = req.headers.get("x-resume-csrf") || "";
  if (
    !/^[a-f0-9]{64}$/.test(cookie) ||
    !/^[a-f0-9]{64}$/.test(csrf) ||
    csrf.length !== cookie.length ||
    !timingSafeEqual(Buffer.from(cookie), Buffer.from(csrf))
  )
    return NextResponse.json(
      { error: "简历处理会话无效，请刷新页面后重试。" },
      { status: 401, headers: privateHeaders },
    );
  return null;
}
export async function readLimited(req: NextRequest, limit: number) {
  const declared = Number(req.headers.get("content-length"));
  if (declared > limit) throw new Error("请求内容过大。");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("请求为空。");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("请求内容过大。");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
