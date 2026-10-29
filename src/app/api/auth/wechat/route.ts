import { NextResponse } from "next/server";
// Intentionally closed until official website-app approval and full state/session handling.
export async function GET() {
  return NextResponse.json(
    { code: "WECHAT_NOT_AVAILABLE", message: "微信开放平台登录暂未开通。" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
