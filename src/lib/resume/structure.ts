import { defaultStyle, type Resume, type ResumeSection } from "./model";
const rules: [ResumeSection["kind"], RegExp][] = [
  [
    "education",
    /^(教育(?:背景|经历|信息)|学历(?:背景)?|education(?:al background)?)$/i,
  ],
  [
    "experience",
    /^((?:实习|工作|实践|职业|专业)(?:经历|经验)|(?:work|professional|internship|employment)(?:\s+experience)?|experience)$/i,
  ],
  [
    "projects",
    /^(项目(?:经历|经验|实践)|科研(?:经历|项目)|projects?(?:\s+experience)?)$/i,
  ],
  [
    "campus",
    /^(校园(?:经历|经验|活动)|社团(?:经历|活动)|学生工作|志愿经历|extracurricular(?:\s+activities)?|leadership)$/i,
  ],
  [
    "skills",
    /^(技能(?:与证书|证书|及证书|特长)?|专业技能|个人技能|语言(?:能力|技能)?|证书|荣誉(?:奖项)?|skills?(?:\s*(?:&|and)\s*certifications?)?|certifications?)$/i,
  ],
  [
    "other",
    /^(自我评价|个人总结|个人简介|求职意向|summary|profile|interests|其他信息)$/i,
  ],
];
export function detectSection(line: string) {
  const clean = line
    .trim()
    .replace(/^[\d一二三四五六七八九十]+[.、\s)）]+/, "")
    .replace(/[：:|｜]+$/, "")
    .trim();
  for (const part of clean.split(/\s*[\/／|｜]\s*/)) {
    for (const [kind, pattern] of rules) {
      if (pattern.test(part.trim())) return kind;
    }
  }
  return undefined;
}
export function structureText(
  text: string,
  type: "docx" | "pdf",
  filename: string,
  warnings: string[] = [],
): Resume {
  const normalized = text
    .replace(/\r/g, "")
    .replace(/\u0000/g, "")
    .trim();
  if (normalized.length < 12)
    throw new Error(
      "未提取到足够文字；不支持扫描件、图片简历或仅含图片的文件。",
    );
  if (normalized.length > 80000)
    throw new Error("文件文字过长，请上传 80000 字符以内的简历。");
  const sections: ResumeSection[] = [];
  const header: string[] = [];
  let current: ResumeSection | undefined;
  for (const raw of normalized.split("\n")) {
    const line = raw.trimEnd();
    const kind = line.length < 70 ? detectSection(line) : undefined;
    if (kind) {
      current = {
        id: crypto.randomUUID(),
        kind,
        title: line.trim(),
        period: "",
        content: "",
      };
      sections.push(current);
    } else if (current) {
      current.content += (current.content ? "\n" : "") + line;
    } else header.push(line);
  }
  const nonempty = header.map((s) => s.trim()).filter(Boolean);
  let name = "";
  const candidate = nonempty.find(
    (s) => s.length < 45 && !/@|\d{5}|简历|resume|curriculum/i.test(s),
  );
  if (candidate) {
    name = candidate;
    nonempty.splice(nonempty.indexOf(candidate), 1);
  }
  if (!sections.length) {
    sections.push({
      id: crypto.randomUUID(),
      kind: "other",
      title: "待校对内容",
      period: "",
      content: normalized,
    });
    nonempty.length = 0;
    name = "";
    warnings.push(
      "未识别到标准模块标题，原文完整保留在“待校对内容”，请手动拆分模块。",
    );
  }
  if (!name) warnings.push("姓名未可靠识别，请手动填写；未猜测个人身份。");
  if (nonempty.join("\n").length > 2000) {
    sections.unshift({
      id: crypto.randomUUID(),
      kind: "other",
      title: "其他原文",
      period: "",
      content: nonempty.join("\n"),
    });
    nonempty.length = 0;
    warnings.push("标题前内容较长，已保留为“其他原文”。");
  }
  const boundedSections: ResumeSection[] = [];
  for (const section of sections) {
    let remaining = section.content.trim();
    let part = 0;
    do {
      let take = Math.min(16000, remaining.length);
      if (
        take < remaining.length &&
        /[\uD800-\uDBFF]/.test(remaining[take - 1])
      )
        take--;
      boundedSections.push({
        ...section,
        id: part ? crypto.randomUUID() : section.id,
        title: part
          ? section.title.slice(0, 85) + `（续 ${part + 1}）`
          : section.title,
        content: remaining.slice(0, take),
      });
      remaining = remaining.slice(take);
      part++;
    } while (remaining.length);
  }
  if (boundedSections.length > 30)
    throw new Error("识别出的模块超过 30 个，请合并模块或拆分文件后重试。");
  if (boundedSections.length > sections.length)
    warnings.push(
      "较长模块已自动拆成连续部分，所有提取文字均保留，请校对模块顺序。",
    );
  return {
    id: crypto.randomUUID(),
    name: filename.replace(/\.(docx|pdf)$/i, "").slice(0, 100) || "导入简历",
    updatedAt: new Date().toISOString(),
    personal: {
      name,
      headline: "",
      contact: nonempty
        .filter((s) => !/^(个人简历|简历|resume|curriculum vitae)$/i.test(s))
        .join("\n"),
    },
    sections: boundedSections,
    style: { ...defaultStyle },
    source: {
      type,
      filename: filename.slice(0, 200),
      originalText: normalized,
      warnings: [
        ...new Set([
          "当前采用模块化重排；表格、多栏、图片、页眉页脚及复杂版式无法保证原样还原，请逐项核对。",
          ...warnings,
        ]),
      ].slice(0, 30),
    },
  };
}
