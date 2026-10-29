import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookieName, privateHeaders, sameOrigin } from "@/lib/resume/security";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "不允许跨站请求。" },
      { status: 403, headers: privateHeaders },
    );
  const existing = req.cookies.get(cookieName)?.value;
  const token =
    existing && /^[a-f0-9]{64}$/.test(existing)
      ? existing
      : randomBytes(32).toString("hex");
  const response = NextResponse.json(
    {
      csrf: token,
      mode: "private-browser",
      storage: "indexeddb",
      cloudSync: false,
    },
    { headers: privateHeaders },
  );
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: new URL(req.url).protocol === "https:",
    sameSite: "strict",
    path: "/api/resume",
    maxAge: 3600,
  });
  return response;
}
