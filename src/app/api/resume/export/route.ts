import { NextRequest, NextResponse } from "next/server";
import { authorize, privateHeaders, readLimited } from "@/lib/resume/security";
import { resumeSchema } from "@/lib/resume/model";
import { exportResume } from "@/lib/resume/export";
import { consumeBudget, reserveExport } from "@/lib/resume/budget";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  if (!consumeBudget(req))
    return NextResponse.json(
      { error: "操作过于频繁，请一分钟后重试。" },
      { status: 429, headers: privateHeaders },
    );
  const release = reserveExport();
  if (!release)
    return NextResponse.json(
      { error: "导出繁忙，请稍后重试。" },
      { status: 429, headers: privateHeaders },
    );
  try {
    const bytes = await readLimited(req, 800000);
    const parsed = resumeSchema.safeParse(JSON.parse(bytes.toString()));
    if (!parsed.success)
      return NextResponse.json(
        { error: "简历数据不完整或超出限制，请检查内容和排版参数。" },
        { status: 400, headers: privateHeaders },
      );
    const { buffer, layout } = await exportResume(parsed.data);
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(parsed.data.name + ".pdf")}`,
        "X-Resume-Pages": String(layout.pages),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "PDF 导出失败。请检查预览是否溢出，稍后重试；如持续失败，请联系维护者检查 Chromium 运行环境。",
      },
      { status: 422, headers: privateHeaders },
    );
  } finally {
    release();
  }
}
