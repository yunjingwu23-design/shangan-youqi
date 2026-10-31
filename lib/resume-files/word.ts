import { Unzip, UnzipInflate, zipSync, strFromU8, strToU8 } from 'fflate';
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from '@xmldom/xmldom';
import type { FileBlock, FileEdit, ParagraphFormat } from './model';
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
function child(node: XmlNode | null | undefined, name: string): XmlElement | undefined {
  return node
    ? (Array.from(node.childNodes).find(
        (item) =>
          item.nodeType === 1 &&
          (item as XmlElement).namespaceURI === W &&
          (item as XmlElement).localName === name
      ) as XmlElement | undefined)
    : undefined;
}
function ancestor(node: XmlNode, name: string): XmlElement | undefined {
  for (let item = node.parentNode; item; item = item.parentNode)
    if (
      item.nodeType === 1 &&
      (item as XmlElement).namespaceURI === W &&
      (item as XmlElement).localName === name
    )
      return item as XmlElement;
}
function numberAttr(node: XmlElement | undefined, name: string, scale = 20) {
  const value = node?.getAttributeNS(W, name);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value) / scale
    : undefined;
}
function paragraphFormat(properties: XmlElement | undefined): ParagraphFormat {
  const result: ParagraphFormat = {},
    indent = child(properties, 'ind'),
    spacing = child(properties, 'spacing'),
    align = child(properties, 'jc')?.getAttributeNS(W, 'val');
  if (['left', 'center', 'right', 'both'].includes(align || ''))
    result.align = align as ParagraphFormat['align'];
  for (const name of ['left', 'right'] as const) {
    const value = numberAttr(indent, name) ?? numberAttr(indent, name === 'left' ? 'start' : 'end');
    if (value !== undefined) result[name] = value;
  }
  for (const name of ['before', 'after'] as const) {
    const value = numberAttr(spacing, name);
    if (value !== undefined) result[name] = value;
  }
  if (
    spacing &&
    (!spacing.getAttributeNS(W, 'lineRule') || spacing.getAttributeNS(W, 'lineRule') === 'auto')
  ) {
    const value = numberAttr(spacing, 'line', 240);
    if (value !== undefined) result.line = value;
  }
  const tabs = child(properties, 'tabs');
  if (tabs)
    for (const tab of Array.from(tabs.getElementsByTagNameNS(W, 'tab')))
      if (tab.getAttributeNS(W, 'val') === 'right') result.rightTab = numberAttr(tab, 'pos');
  return result;
}
const paragraphOrder = [
  'pStyle',
  'keepNext',
  'keepLines',
  'pageBreakBefore',
  'framePr',
  'widowControl',
  'numPr',
  'suppressLineNumbers',
  'pBdr',
  'shd',
  'tabs',
  'suppressAutoHyphens',
  'kinsoku',
  'wordWrap',
  'overflowPunct',
  'topLinePunct',
  'autoSpaceDE',
  'autoSpaceDN',
  'bidi',
  'adjustRightInd',
  'snapToGrid',
  'spacing',
  'ind',
  'contextualSpacing',
  'mirrorIndents',
  'suppressOverlap',
  'jc',
  'textDirection',
  'textAlignment',
  'textboxTightWrap',
  'outlineLvl',
  'divId',
  'cnfStyle',
  'rPr',
  'sectPr',
  'pPrChange',
];
const runOrder = [
  'rStyle',
  'rFonts',
  'b',
  'bCs',
  'i',
  'iCs',
  'caps',
  'smallCaps',
  'strike',
  'dstrike',
  'outline',
  'shadow',
  'emboss',
  'imprint',
  'noProof',
  'snapToGrid',
  'vanish',
  'webHidden',
  'color',
  'spacing',
  'w',
  'kern',
  'position',
  'sz',
  'szCs',
  'highlight',
  'u',
  'effect',
  'bdr',
  'shd',
  'fitText',
  'vertAlign',
  'rtl',
  'cs',
  'em',
  'lang',
  'eastAsianLayout',
  'specVanish',
  'oMath',
  'rPrChange',
];
function ensure(parent: XmlElement, name: string, order: string[] = []) {
  const existing = child(parent, name);
  if (existing) return existing;
  const created = parent.ownerDocument!.createElementNS(W, `w:${name}`),
    at = order.indexOf(name),
    next = Array.from(parent.childNodes).find(
      (node) => node.nodeType === 1 && order.indexOf((node as XmlElement).localName || '') > at
    );
  parent.insertBefore(created, next || null);
  return created;
}
function setAttr(node: XmlElement, name: string, value: number | string) {
  node.setAttributeNS(W, `w:${name}`, String(value));
}
function applyParagraph(paragraph: XmlElement, format: ParagraphFormat, originalRightTab?: number) {
  let properties = child(paragraph, 'pPr');
  if (!properties) {
    properties = paragraph.ownerDocument!.createElementNS(W, 'w:pPr');
    paragraph.insertBefore(properties, paragraph.firstChild);
  }
  if (format.align) setAttr(ensure(properties, 'jc', paragraphOrder), 'val', format.align);
  for (const side of ['left', 'right'] as const)
    if (format[side] !== undefined) {
      const ind = ensure(properties, 'ind', paragraphOrder);
      ind.removeAttributeNS(W, side === 'left' ? 'start' : 'end');
      setAttr(ind, side, Math.round(format[side]! * 20));
    }
  for (const side of ['before', 'after'] as const)
    if (format[side] !== undefined) {
      const spacing = ensure(properties, 'spacing', paragraphOrder);
      spacing.removeAttributeNS(W, `${side}Autospacing`);
      spacing.removeAttributeNS(W, `${side}Lines`);
      setAttr(spacing, side, Math.round(format[side]! * 20));
    }
  if (format.line !== undefined) {
    const spacing = ensure(properties, 'spacing', paragraphOrder);
    setAttr(spacing, 'line', Math.round(format.line * 240));
    setAttr(spacing, 'lineRule', 'auto');
  }
  if (format.rightTab !== undefined) {
    const tabs = ensure(properties, 'tabs', paragraphOrder),
      rightTabs = Array.from(tabs.getElementsByTagNameNS(W, 'tab')).filter(
        (tab) => tab.getAttributeNS(W, 'val') === 'right'
      );
    const tab = rightTabs.at(-1) || tabs.ownerDocument!.createElementNS(W, 'w:tab');
    setAttr(tab, 'val', 'right');
    setAttr(tab, 'pos', Math.round(format.rightTab * 20));
    if (!tab.parentNode) tabs.appendChild(tab);
    // Native Word merges inherited tab stops. Clear the old position too, or a
    // move to the right can keep using the nearer stop from the paragraph style.
    if (
      originalRightTab !== undefined &&
      Math.round(originalRightTab * 20) !== Math.round(format.rightTab * 20)
    ) {
      const previous = Math.round(originalRightTab * 20),
        clear =
          Array.from(tabs.getElementsByTagNameNS(W, 'tab')).find(
            (item) =>
              item.getAttributeNS(W, 'val') === 'clear' &&
              Number(item.getAttributeNS(W, 'pos')) === previous
          ) || tabs.ownerDocument!.createElementNS(W, 'w:tab');
      setAttr(clear, 'val', 'clear');
      setAttr(clear, 'pos', previous);
      if (!clear.parentNode) tabs.appendChild(clear);
    }
    for (const item of Array.from(tabs.getElementsByTagNameNS(W, 'tab')).sort(
      (a, b) => Number(a.getAttributeNS(W, 'pos')) - Number(b.getAttributeNS(W, 'pos'))
    ))
      tabs.appendChild(item);
  }
}
export function wordBlocks(bytes: Uint8Array): FileBlock[] {
  const zip = validateDocx(bytes),
    result: FileBlock[] = [];
  const styles = zip['word/styles.xml'] ? parseXml(zip['word/styles.xml']) : undefined,
    styleMap = new Map(
      styles
        ? Array.from(styles.getElementsByTagNameNS(W, 'style')).map((style) => [
            style.getAttributeNS(W, 'styleId') || '',
            style,
          ])
        : []
    ),
    defaults = styles?.getElementsByTagNameNS(W, 'docDefaults')[0],
    defaultParagraph = paragraphFormat(child(child(defaults, 'pPrDefault'), 'pPr')),
    defaultRun = child(child(defaults, 'rPrDefault'), 'rPr'),
    defaultStyle =
      [...styleMap.values()]
        .find(
          (style) =>
            style.getAttributeNS(W, 'type') === 'paragraph' &&
            style.getAttributeNS(W, 'default') === '1'
        )
        ?.getAttributeNS(W, 'styleId') || '';
  function inherited(
    id: string,
    depth = 0
  ): { paragraph: ParagraphFormat; fontSize?: number; baseline?: number } {
    const style = styleMap.get(id);
    if (!style || depth > 20)
      return {
        paragraph: defaultParagraph,
        fontSize: numberAttr(child(defaultRun, 'sz'), 'val', 2),
        baseline: numberAttr(child(defaultRun, 'position'), 'val', 2),
      };
    const parent = inherited(child(style, 'basedOn')?.getAttributeNS(W, 'val') || '', depth + 1),
      run = child(style, 'rPr');
    return {
      paragraph: { ...parent.paragraph, ...paragraphFormat(child(style, 'pPr')) },
      fontSize: numberAttr(child(run, 'sz'), 'val', 2) ?? parent.fontSize,
      baseline: numberAttr(child(run, 'position'), 'val', 2) ?? parent.baseline,
    };
  }
  for (const part of Object.keys(zip)
    .filter((name) => parts.test(name))
    .sort()) {
    const doc = parseXml(zip[part]),
      texts = Array.from(doc.getElementsByTagNameNS(W, 't')),
      paragraphs = Array.from(doc.getElementsByTagNameNS(W, 'p')),
      rows = Array.from(doc.getElementsByTagNameNS(W, 'tr')),
      main = part === 'word/document.xml' ? doc : parseXml(zip['word/document.xml']),
      section = Array.from(main.getElementsByTagNameNS(W, 'sectPr')).at(-1),
      page = child(section, 'pgSz'),
      margins = child(section, 'pgMar'),
      width =
        (numberAttr(page, 'w') ?? 595.3) -
        (numberAttr(margins, 'left') ?? 72) -
        (numberAttr(margins, 'right') ?? 72),
      metadata = new Map<
        XmlElement,
        { before: Map<XmlElement, string>; word: NonNullable<FileBlock['word']>; group: string }
      >();
    for (const [index, paragraph] of paragraphs.entries()) {
      const properties = child(paragraph, 'pPr'),
        base = inherited(child(properties, 'pStyle')?.getAttributeNS(W, 'val') || defaultStyle),
        before = new Map<XmlElement, string>();
      let separator = '',
        hasTabs = false;
      for (const node of Array.from(paragraph.getElementsByTagNameNS(W, '*'))) {
        if (ancestor(node, 'p') !== paragraph) continue;
        if (node.localName === 'tab' && ancestor(node, 'r')) {
          separator += '\t';
          hasTabs = true;
        } else if (node.localName === 'br' && ancestor(node, 'r')) separator += '\n';
        else if (node.localName === 't') {
          if (node.textContent?.trim()) {
            before.set(node, separator);
            separator = '';
          } else separator += node.textContent || '';
        }
      }
      const cell = ancestor(paragraph, 'tc'),
        cellWidth = numberAttr(child(child(cell, 'tcPr'), 'tcW'), 'w');
      metadata.set(paragraph, {
        before,
        group: `${part}@${index}`,
        word: {
          paragraph: { ...base.paragraph, ...paragraphFormat(properties) },
          hasTabs,
          width: cellWidth && cellWidth > 0 ? cellWidth : width,
          fontSize: base.fontSize ?? 11,
          baseline: base.baseline ?? 0,
        },
      });
    }
    for (let i = 0; i < texts.length; i++)
      if (texts[i].textContent?.trim()) {
        const paragraph = ancestor(texts[i], 'p'),
          info = paragraph ? metadata.get(paragraph) : undefined,
          run = child(ancestor(texts[i], 'r'), 'rPr');
        result.push({
          key: `${part}#${i}`,
          text: texts[i].textContent || '',
          label: part.includes('header')
            ? '页眉文字'
            : part.includes('footer')
              ? '页脚文字'
              : `正文片段 ${i + 1}`,
          group: info?.group,
          row: ancestor(texts[i], 'tr')
            ? `${part}@row${rows.indexOf(ancestor(texts[i], 'tr')!)}`
            : undefined,
          before: info?.before.get(texts[i]),
          word: info
            ? {
                ...info.word,
                fontSize: numberAttr(child(run, 'sz'), 'val', 2) ?? info.word.fontSize,
                baseline: numberAttr(child(run, 'position'), 'val', 2) ?? info.word.baseline,
              }
            : undefined,
        });
      }
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
  const originalTabs = new Map(
    edits.some((edit) => edit.paragraph?.rightTab !== undefined)
      ? wordBlocks(bytes).map((block) => [block.key, block.word?.paragraph.rightTab] as const)
      : []
  );
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
      const paragraph = ancestor(element, 'p'),
        run = ancestor(element, 'r');
      if (change.paragraph) {
        if (!paragraph) throw new Error('无法定位这段文字的段落。');
        applyParagraph(paragraph, change.paragraph, originalTabs.get(change.key));
      }
      if (change.fontSize !== undefined || change.baseline !== undefined) {
        if (!run) throw new Error('无法定位这段文字的格式。');
        let properties = child(run, 'rPr');
        if (!properties) {
          properties = run.ownerDocument!.createElementNS(W, 'w:rPr');
          run.insertBefore(properties, run.firstChild);
        }
        if (change.fontSize !== undefined) {
          setAttr(ensure(properties, 'sz', runOrder), 'val', Math.round(change.fontSize * 2));
          const complex = child(properties, 'szCs');
          if (complex) setAttr(complex, 'val', Math.round(change.fontSize * 2));
        }
        if (change.baseline !== undefined)
          setAttr(ensure(properties, 'position', runOrder), 'val', Math.round(change.baseline * 2));
      }
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
