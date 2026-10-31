import type { FileBlock, FileEdit } from './model';
export type FileLine = {
  key: string;
  blocks: FileBlock[];
  text: string;
  originalText: string;
  page?: number;
  row?: string;
};
const normalized = (text: string) => text.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
export function fileLines(blocks: FileBlock[], edits: FileEdit[], query = '', page?: number) {
  const groups = new Map<string, FileLine>(),
    changes = new Map(edits.map((edit) => [edit.key, edit.text]));
  for (const block of blocks) {
    const key = block.group || block.key;
    let line = groups.get(key);
    if (!line) {
      line = { key, blocks: [], text: '', originalText: '', page: block.page, row: block.row };
      groups.set(key, line);
    }
    line.blocks.push(block);
    line.text += (block.before || '') + (changes.get(block.key) ?? block.text);
    line.originalText += (block.before || '') + block.text;
  }
  const needle = normalized(query);
  const rows = new Map<string, { text: string; originalText: string }>();
  for (const line of groups.values())
    if (line.row) {
      const row = rows.get(line.row) || { text: '', originalText: '' };
      row.text += line.text + '\t';
      row.originalText += line.originalText + '\t';
      rows.set(line.row, row);
    }
  return [...groups.values()].filter((line) =>
    needle
      ? normalized(line.text).includes(needle) ||
        normalized(line.originalText).includes(needle) ||
        Boolean(
          line.row &&
            (normalized(rows.get(line.row)?.text || '').includes(needle) ||
              normalized(rows.get(line.row)?.originalText || '').includes(needle))
        )
      : page === undefined || line.page === undefined || line.page === page
  );
}
