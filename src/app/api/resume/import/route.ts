import { NextRequest, NextResponse } from "next/server";
import { authorize, privateHeaders, readLimited } from "@/lib/resume/security";
import { resumeSchema } from "@/lib/resume/model";
import { consumeBudget } from "@/lib/resume/budget";
import { parseResume, MAX_UPLOAD } from "@/lib/resume/parse";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  if (!consumeBudget(req))
    return NextResponse.json(
      { error: "操作过于频繁，请稍后重试。" },
      { status: 429, headers: privateHeaders },
    );
  try {
    const bytes = await readLimited(req, MAX_UPLOAD + 65536);
    const form = await new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": req.headers.get("content-type") || "" },
      body: bytes,
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json(
        { error: "请选择简历文件。" },
        { status: 400, headers: privateHeaders },
      );
    if (file.size > MAX_UPLOAD) throw new Error("文件超过 3MB。");
    const resume = await parseResume(
      new Uint8Array(await file.arrayBuffer()),
      file.name,
    );
    const validated = resumeSchema.safeParse(resume);
    if (!validated.success)
      throw new Error("识别结果超出允许范围，请拆分文件后重试。");
    return NextResponse.json(
      { resume: validated.data },
      { headers: privateHeaders },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "文件解析失败，请检查文件。" },
      { status: 422, headers: privateHeaders },
    );
  }
}
