import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseResume } from "../src/lib/resume/parse";
import { structureText } from "../src/lib/resume/structure";
import { resumeSchema, blankResume } from "../src/lib/resume/model";
import { resumeHtml } from "../src/lib/resume/document";
for (const name of ["standard", "table", "english", "long"])
  test(`DOCX ${name}: extracts real text and expected editable modules`, async () => {
    const r = await parseResume(
      new Uint8Array(await readFile(`tests/fixtures/resume/${name}.docx`)),
      `${name}.docx`,
    );
    assert.equal(
      r.sections.some((s) => s.kind === "education"),
      true,
    );
    assert.equal(
      r.sections.some((s) => s.kind === "experience"),
      true,
    );
    assert.equal(
      r.sections.some((s) => s.kind === "projects"),
      true,
    );
    assert.equal(
      r.sections.some((s) => s.kind === "skills"),
      true,
    );
    assert.ok(r.source.originalText.includes("student@example.com"));
    if (name === "table")
      assert.ok(r.source.warnings.some((w) => w.includes("表格")));
  });
for (const name of ["single-column", "two-column", "multi-page"])
  test(`Text PDF ${name}: original text and layout warnings`, async () => {
    const r = await parseResume(
      new Uint8Array(await readFile(`tests/fixtures/resume/${name}.pdf`)),
      `${name}.pdf`,
    );
    assert.match(r.source.originalText, /student@example.com/);
    assert.match(r.source.originalText, /教育背景/);
    assert.match(r.source.originalText, /技能与证书/);
    assert.ok(
      r.sections.some((s) => s.kind === "education"),
      "education module",
    );
    assert.ok(
      r.sections.some((s) => s.kind === "skills"),
      "skills module",
    );
    assert.ok(r.source.warnings.some((w) => w.includes("PDF")));
  });
test("rejects scan-only PDF, renamed files and oversized documents", async () => {
  await assert.rejects(
    () => parseResume(new Uint8Array([1, 2, 3]), "fake.docx"),
    /有效/,
  );
  await assert.rejects(
    () => parseResume(new Uint8Array(3 * 1024 * 1024 + 1), "big.docx"),
    /超过/,
  );
  await assert.rejects(
    async () =>
      parseResume(
        new Uint8Array(await readFile("tests/fixtures/resume/scanned.pdf")),
        "scanned.pdf",
      ),
    /OCR|扫描/,
  );
});
test("ambiguous text stays editable without fabricated identities", () => {
  const r = structureText(
    "这里没有标准模块标题\n这是一段待人工确认的长内容。",
    "docx",
    "plain.docx",
  );
  assert.equal(r.sections[0].kind, "other");
  assert.equal(r.personal.name, "");
  assert.match(r.sections[0].content, /这里没有标准/);
});
test("schema rejects invalid layout and print escapes imported HTML", () => {
  const r = blankResume();
  r.personal.name = "<img src=x onerror=alert(1)>";
  assert.match(resumeHtml(r, "font"), /&lt;img/);
  assert.doesNotMatch(resumeHtml(r, "font"), /<img src=x/);
  assert.equal(
    resumeSchema.safeParse({ ...r, style: { ...r.style, fontSize: 500 } })
      .success,
    false,
  );
});

test("oversized extracted module is split without dropping characters", () => {
  const content = "项目内容".repeat(6000) + "末尾标记";
  const r = structureText("林同学\n项目经历\n" + content, "docx", "large.docx");
  assert.ok(r.sections.length > 1);
  assert.equal(r.sections.map((s) => s.content).join(""), content);
  assert.equal(resumeSchema.safeParse(r).success, true);
});
