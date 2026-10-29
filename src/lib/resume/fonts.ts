import manifest from "./font-manifest.json";
import type { Resume } from "./model";
export function resumeCharacters(resume: Resume) {
  return (
    "简历教育0123456789 /" +
    resume.personal.name +
    resume.personal.headline +
    resume.personal.contact +
    resume.sections.map((s) => s.title + s.period + s.content).join("")
  );
}
export function selectFontFaces(resume: Resume) {
  const chars = new Set(
    Array.from(resumeCharacters(resume)).map((c) => c.codePointAt(0)!),
  );
  return manifest[resume.style.font].filter((face) =>
    face.ranges.some(([lo, hi]) =>
      [...chars].some((cp) => cp >= lo && cp <= hi),
    ),
  );
}
export function fontFaceCSS(
  face: ReturnType<typeof selectFontFaces>[number],
  base64: string,
) {
  return `@font-face{font-family:ResumeFont;src:url(data:font/woff2;base64,${base64}) format('woff2');font-weight:400;font-style:normal;font-display:block;unicode-range:${face.unicode}}`;
}
