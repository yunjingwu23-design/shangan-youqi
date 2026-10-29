import { z } from "zod";
export const sectionKinds = [
  "education",
  "experience",
  "projects",
  "campus",
  "skills",
  "other",
] as const;
export const sectionLabels: Record<(typeof sectionKinds)[number], string> = {
  education: "教育背景",
  experience: "实习 / 工作经历",
  projects: "项目经历",
  campus: "校园经历",
  skills: "技能与证书",
  other: "其他信息",
};
export const resumeSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().max(100),
    updatedAt: z.string().max(40),
    personal: z.object({
      name: z.string().max(100),
      headline: z.string().max(200),
      contact: z.string().max(2000),
    }),
    sections: z
      .array(
        z.object({
          id: z.string().max(100),
          kind: z.enum(sectionKinds),
          title: z.string().max(100),
          period: z.string().max(120),
          content: z.string().max(18000),
        }),
      )
      .max(30),
    style: z.object({
      font: z.enum(["sans", "serif"]),
      fontSize: z.number().min(9).max(15),
      lineHeight: z.number().min(1.2).max(2),
      sectionGap: z.number().min(6).max(28),
      margin: z.number().min(12).max(26),
    }),
    source: z.object({
      type: z.enum(["docx", "pdf", "manual"]),
      filename: z.string().max(200),
      originalText: z.string().max(80000),
      warnings: z.array(z.string().max(500)).max(30),
    }),
  })
  .superRefine((r, ctx) => {
    if (
      r.sections.reduce((n, s) => n + s.content.length, 0) +
        r.personal.contact.length >
      80000
    )
      ctx.addIssue({
        code: "custom",
        message: "简历内容过长，请控制在 80000 字符内。",
      });
  });
export type Resume = z.infer<typeof resumeSchema>;
export type ResumeSection = Resume["sections"][number];
export const defaultStyle: Resume["style"] = {
  font: "sans",
  fontSize: 10.5,
  lineHeight: 1.55,
  sectionGap: 14,
  margin: 18,
};
export function blankResume(): Resume {
  return {
    id: crypto.randomUUID(),
    name: "我的简历",
    updatedAt: new Date().toISOString(),
    personal: { name: "你的姓名", headline: "", contact: "" },
    sections: [
      {
        id: crypto.randomUUID(),
        kind: "education",
        title: "教育背景",
        period: "",
        content: "",
      },
    ],
    style: { ...defaultStyle },
    source: { type: "manual", filename: "", originalText: "", warnings: [] },
  };
}
