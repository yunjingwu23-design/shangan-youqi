import { NextRequest, NextResponse } from "next/server";
import { authorize, privateHeaders } from "@/lib/resume/security";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return NextResponse.json(
    {
      code: "AI_NOT_CONFIGURED",
      error: "AI 简历优化与 JD 匹配尚未接入；当前不会将简历发送给 OpenAI。",
    },
    { status: 503, headers: privateHeaders },
  );
}
