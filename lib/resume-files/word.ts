import { Unzip, UnzipInflate, zipSync, strFromU8, strToU8 } from 'fflate';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { FileBlock, FileEdit } from './model';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const parts = /^word\/(document|header\d+|footer\d+)\.xml$/;
function boundedUnzip(bytes: Uint8Array) {
  const result: Record<string, Uint8Array> = Object.create(null);
  let total = 0,
    files = 0,
    failure: Error | null = null;
  const unzip = new Unzip((file) => {
    if (++files > 1500) throw new Error('Word 文档结构过于复杂，请精简后上传。');
    const chunks: Uint8Array[] = [];
    let length = 0;
    file.ondata = (error, data, final) => {
      if (failure) return;
      if (error) {
        failure = new Error('Word 压缩数据损坏。');
        return;
      }
      length += data.length;
      total += data.length;
      if (length > 16 * 1024 * 1024 || total > 32 * 1024 * 1024) {
        failure = new Error('Word 展开内容超过限制。');
        file.terminate();
        return;
      }
      chunks.push(data.slice());
      if (final) {
        const output = new Uint8Array(length);
        let at = 0;
        for (const chunk of chunks) {
          output.set(chunk, at);
          at += chunk.length;
        }
        result[file.name] = output;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let at = 0; at < bytes.length; at += 512) {
    unzip.push(bytes.subarray(at, at + 512), at + 512 >= bytes.length);
    if (failure) throw failure;
  }
  return result;
}
// Check the central directory before decompression. Never extract uploaded ZIPs to disk.
export function validateDocx(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0)
    throw new Error('Word 文件损坏或格式不受支持。');
  const count = view.getUint16(end + 10, true),
    start = view.getUint32(end + 16, true);
  if (count > 1500 || start >= bytes.length)
    throw new Error('Word 文档结构过于复杂，请精简后上传。');
  let offset = start,
    total = 0;
  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50)
      throw new Error('Word 文件目录损坏。');
    const size = view.getUint32(offset + 24, true),
      nameSize = view.getUint16(offset + 28, true),
      extra = view.getUint16(offset + 30, true),
      comment = view.getUint16(offset + 32, true);
    if (offset + 46 + nameSize + extra + comment > bytes.length)
      throw new Error('Word 文件目录损坏。');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameSize));
    total += size;
    if (
      size > 16 * 1024 * 1024 ||
      (parts.test(name) && size > 2 * 1024 * 1024) ||
      total > 32 * 1024 * 1024 ||
      name.includes('..') ||
      name.includes('\\') ||
      name.startsWith('/') ||
      /vbaProject|ActiveX/i.test(name)
    )
      throw new Error('请选择不含宏、嵌入程序且展开后不超过 32 MiB 的 DOCX。');
    offset += 46 + nameSize + extra + comment;
  }
  const zip = boundedUnzip(bytes);
  // Do not trust the central directory to describe local entry names or sizes.
  for (const [name, data] of Object.entries(zip))
    if (
      (parts.test(name) && data.length > 2 * 1024 * 1024) ||
      name.includes('..') ||
      name.includes('\\') ||
      name.startsWith('/') ||
      /vbaProject|ActiveX/i.test(name)
    )
      throw new Error('Word 文档包含不支持的内容或过大的文字部分。');
  if (
    !zip['word/document.xml'] ||
    !zip['[Content_Types].xml'] ||
    /macroEnabled/i.test(strFromU8(zip['[Content_Types].xml']))
  )
    throw new Error('请上传标准 DOCX；旧版 DOC 请先用 Word 另存为 DOCX。');
  return zip;
}
function parseXml(xml: Uint8Array) {
  const text = strFromU8(xml);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('文档包含不支持的 XML 声明。');
  return new DOMParser({
    onError: (level) => {
      if (level === 'fatalError' || level === 'error') throw new Error('Word XML 内容损坏。');
    },
  }).parseFromString(text, 'application/xml');
}
export function wordBlocks(bytes: Uint8Array): FileBlock[] {
  const zip = validateDocx(bytes),
    result: FileBlock[] = [];
  for (const part of Object.keys(zip)
    .filter((name) => parts.test(name))
    .sort()) {
    const doc = parseXml(zip[part]),
      texts = Array.from(doc.getElementsByTagNameNS(W, 't'));
    for (let i = 0; i < texts.length; i++)
      if (texts[i].textContent?.trim())
        result.push({
          key: `${part}#${i}`,
          text: texts[i].textContent || '',
          label: part.includes('header')
            ? '页眉文字'
            : part.includes('footer')
              ? '页脚文字'
              : `正文片段 ${i + 1}`,
        });
  }
  if (result.length > 1500) throw new Error('文字片段过多，请先精简简历。');
  return result;
}
export function editWord(bytes: Uint8Array, edits: FileEdit[]): Uint8Array {
  if (!edits.length) {
    validateDocx(bytes);
    return bytes.slice();
  }
  const zip = validateDocx(bytes),
    groups = new Map<string, FileEdit[]>();
  for (const edit of edits) {
    const part = edit.key.split('#')[0];
    if (!parts.test(part) || !zip[part]) throw new Error('修改的文字位置已失效。');
    groups.set(part, [...(groups.get(part) || []), edit]);
  }
  for (const [part, changes] of groups) {
    const doc = parseXml(zip[part]),
      texts = Array.from(doc.getElementsByTagNameNS(W, 't'));
    for (const change of changes) {
      const index = Number(change.key.split('#')[1]),
        element = texts[index];
      if (!Number.isInteger(index) || !element) throw new Error('修改的文字位置已失效。');
      const lines = change.text.split(/\r?\n/),
        anchor = element.nextSibling;
      element.textContent = lines[0];
      element.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      for (const line of lines.slice(1)) {
        const br = doc.createElementNS(W, 'w:br'),
          text = doc.createElementNS(W, 'w:t');
        text.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
        text.textContent = line;
        element.parentNode?.insertBefore(br, anchor);
        element.parentNode?.insertBefore(text, anchor);
      }
    }
    zip[part] = strToU8(new XMLSerializer().serializeToString(doc));
  }
  return zipSync(zip, { level: 6 });
}
