import { zipSync, strToU8 } from 'fflate';
import type { ResumeDocument } from '@/lib/resume';
const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!
  );
export function templateWord(document: ResumeDocument): Uint8Array {
  const compact = document.template === 'compact',
    size = compact ? 20 : 22,
    accent = document.template === 'compact' ? '365064' : '657D45';
  const p = (
    text: string,
    options: { bold?: boolean; size?: number; color?: string; after?: number } = {}
  ) =>
    `<w:p><w:pPr><w:spacing w:after="${options.after ?? 100}"/></w:pPr><w:r><w:rPr>${options.bold ? '<w:b/>' : ''}<w:sz w:val="${options.size || size}"/>${options.color ? `<w:color w:val="${options.color}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  const basics = document.basics,
    header =
      p(basics.name || '个人简历', { bold: true, size: 40, after: 160 }) +
      (basics.headline ? p(basics.headline, { color: accent }) : '') +
      [basics.city, basics.phone, basics.email, basics.links]
        .filter(Boolean)
        .map((text) => p(text, { size: 18 }))
        .join('');
  const content = document.sections
    .filter((section) => section.body.trim())
    .map(
      (section) =>
        p(section.title, { bold: true, size: 24, color: accent, after: 140 }) +
        section.body
          .split('\n')
          .map((line) => p(line))
          .join('')
    )
    .join('');
  const body =
    document.template === 'sidebar'
      ? `<w:tbl><w:tblPr><w:tblW w:w="10466" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="2800"/><w:gridCol w:w="7666"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:fill="EEF2E6"/><w:tcMar><w:left w:w="100" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar><w:vAlign w:val="top"/></w:tcPr>${header}</w:tc><w:tc><w:tcPr><w:tcW w:w="7666" w:type="dxa"/><w:tcMar><w:left w:w="220" w:type="dxa"/></w:tcMar></w:tcPr>${content || p('')}</w:tc></w:tr></w:tbl>`
      : header + content;
  const parts: Record<string, string> = {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/_rels/document.xml.rels':
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'word/styles.xml': `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/><w:sz w:val="${size}"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`,
  };
  return zipSync(
    Object.fromEntries(Object.entries(parts).map(([name, text]) => [name, strToU8(text)])),
    { level: 6 }
  );
}
