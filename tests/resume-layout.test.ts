import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { strFromU8 } from 'fflate';
import { wordBlocks, editWord, validateDocx } from '../lib/resume-files/word';
import { fileLines } from '../lib/resume-files/search';
import { fileEditSchema, readOriginal } from '../lib/resume-files/model';
const source = readFileSync('tests/fixtures/resume-format.docx'),
  blocks = wordBlocks(source),
  label = blocks.find((block) => block.text === '项目')!,
  body = blocks.find((block) => block.text === '形成可复用的项目文档。')!,
  company = blocks.find((block) => block.text === '某公司｜产品实习生')!,
  date = blocks.find((block) => block.text === '2025.06–2025.09')!;
test('Word search matches a prefix across runs and returns the entire paragraph, including the body after the colon', () => {
  const found = fileLines(blocks, [], '项目经历');
  assert.equal(found.length, 1);
  assert.equal(found[0].text, '项目经历：负责产品需求整理，形成可复用的项目文档。');
  assert.equal(found[0].blocks.length, 4);
  assert.ok(found[0].blocks.some((block) => block.key === body.key));
  assert.equal(fileLines(blocks, [], '项目经历:')[0].key, found[0].key);
  const edits = [{ key: body.key, text: '完成真实需求分析。' }];
  assert.equal(
    fileLines(blocks, edits, '真实需求')[0].text,
    '项目经历：负责产品需求整理，完成真实需求分析。'
  );
  assert.equal(fileLines(blocks, edits, '形成可复用')[0].key, found[0].key);
  assert.equal(fileLines(blocks, [], '不存在的整行').length, 0);
  const tableRow = fileLines(blocks, [], 'Original Skills');
  assert.equal(tableRow.length, 2);
  assert.ok(tableRow.some((line) => line.text === 'Research and product delivery'));
});
test('Word dates retain native tabs, and paragraph/character formatting changes actual OOXML without modifying other parts', () => {
  assert.equal(company.group, date.group);
  assert.equal(company.word?.hasTabs, true);
  assert.ok(Math.abs(company.word!.paragraph.rightTab! - (120 * 72) / 25.4) < 0.03);
  assert.ok(fileLines(blocks, [], '某公司')[0].text.includes('\t2025.06–2025.09'));
  const target = company.word!.paragraph.rightTab! - 72 / 25.4,
    edited = editWord(source, [
      {
        key: company.key,
        text: company.text,
        paragraph: { rightTab: target, align: 'left', after: 6, line: 1.25 },
      },
      { key: date.key, text: date.text, fontSize: 10.5, baseline: 0.5 },
      { key: label.key, text: label.text, paragraph: { left: -2, right: 4, before: 3 } },
    ]),
    after = wordBlocks(edited),
    moved = after.find((block) => block.key === date.key)!;
  assert.ok(Math.abs(moved.word!.paragraph.rightTab! - target) < 0.03);
  assert.equal(moved.word!.fontSize, 10.5);
  assert.equal(moved.word!.baseline, 0.5);
  assert.equal(moved.word!.paragraph.line, 1.25);
  assert.equal(after.find((block) => block.key === label.key)!.word!.paragraph.left, -2);
  const beforeZip = validateDocx(source),
    afterZip = validateDocx(edited);
  for (const part of Object.keys(beforeZip))
    if (part !== 'word/document.xml') assert.deepEqual(afterZip[part], beforeZip[part], part);
  const xml = new DOMParser().parseFromString(
      strFromU8(afterZip['word/document.xml']),
      'application/xml'
    ),
    namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  assert.equal(
    Array.from(xml.getElementsByTagNameNS(namespace, 'tab')).filter(
      (tab) => tab.parentNode?.nodeName === 'w:r'
    ).length,
    1,
    'the native tab character remains, in addition to the explicit stop and clear setting'
  );
  assert.ok(xml.getElementsByTagNameNS(namespace, 'b').length >= 3, 'original bold runs remain');
  assert.deepEqual(Buffer.from(editWord(source, [])), source);
});
test('moving a date stop inherited from a Word style clears the old stop and preserves the style definition', () => {
  const inherited = readFileSync('tests/fixtures/resume-styled-date.docx'),
    company = wordBlocks(inherited).find((block) => block.text === '某公司｜产品实习生')!,
    original = company.word!.paragraph.rightTab!,
    changed = editWord(inherited, [
      { key: company.key, text: company.text, paragraph: { rightTab: original + 72 / 25.4 } },
    ]),
    before = validateDocx(inherited),
    after = validateDocx(changed),
    xml = new DOMParser().parseFromString(strFromU8(after['word/document.xml']), 'application/xml'),
    namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  assert.ok(Math.abs(original - (120 * 72) / 25.4) < 0.03);
  assert.deepEqual(after['word/styles.xml'], before['word/styles.xml']);
  assert.ok(
    Array.from(xml.getElementsByTagNameNS(namespace, 'tab')).some(
      (tab) =>
        tab.getAttributeNS(namespace, 'val') === 'clear' &&
        Number(tab.getAttributeNS(namespace, 'pos')) === Math.round(original * 20)
    )
  );
  assert.ok(
    Math.abs(
      wordBlocks(changed).find((block) => block.text === company.text)!.word!.paragraph.rightTab! -
        (original + 72 / 25.4)
    ) < 0.03
  );
});
test('original resume v1 remains readable, formatting is bounded and arbitrary CSS or PDF formatting is rejected', () => {
  assert.ok(
    readOriginal(
      JSON.stringify({
        format: 'shangan-original-resume-v1',
        fileType: 'docx',
        fileName: '旧简历.docx',
        fileSize: source.length,
        sha256: '0'.repeat(64),
        edits: [{ key: label.key, text: '旧修改' }],
      })
    )
  );
  assert.equal(
    fileEditSchema.safeParse({
      key: date.key,
      text: date.text,
      paragraph: { rightTab: 320 },
      fontSize: 12,
    }).success,
    true
  );
  for (const bad of [
    { key: date.key, text: date.text, fontSize: 200 },
    { key: date.key, text: date.text, paragraph: { left: Infinity } },
    {
      key: date.key,
      text: date.text,
      paragraph: { style: 'background:url(https://outside.invalid)' },
    },
    { key: '0:1', text: 'PDF', paragraph: { left: 1 } },
  ])
    assert.equal(fileEditSchema.safeParse(bad).success, false);
});
