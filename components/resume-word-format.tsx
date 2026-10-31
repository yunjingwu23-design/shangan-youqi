'use client';
import type { FileBlock, FileEdit, ParagraphFormat } from '@/lib/resume-files/model';
const mm = (points: number) => Math.round(((points * 25.4) / 72) * 100) / 100;
const pt = (millimeters: number) => Math.round(((millimeters * 72) / 25.4) * 1000) / 1000;
export function WordParagraphControls({
  block,
  edit,
  onChange,
  onReset,
  disabled,
}: {
  block: FileBlock;
  edit?: FileEdit;
  onChange: (format: ParagraphFormat) => void;
  onReset: () => void;
  disabled: boolean;
}) {
  if (!block.word) return null;
  const original = block.word.paragraph,
    value = { ...original, ...edit?.paragraph },
    change = (next: ParagraphFormat) => onChange({ ...edit?.paragraph, ...next });
  function nudge(delta: number) {
    const left = value.left || 0,
      right = value.right || 0,
      movement = Math.max(-72 - left, right - 360, Math.min(delta, 360 - left, right + 72));
    // Move both boundaries together, keeping width and right-aligned dates intact.
    change({ left: left + movement, right: right - movement });
  }
  return (
    <details className="resume-word-format">
      <summary>段落排版 · 对齐 / 缩进 / 日期</summary>
      <fieldset disabled={disabled} aria-label={`${block.label}所在段落排版`}>
        <label>
          对齐方式
          <select
            value={value.align || 'left'}
            onChange={(event) => change({ align: event.target.value as ParagraphFormat['align'] })}
          >
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
            <option value="both">两端对齐</option>
          </select>
        </label>
        <div className="resume-format-grid">
          {(['left', 'right', 'before', 'after'] as const).map((key) => (
            <label key={key}>
              {{ left: '左缩进', right: '右缩进', before: '段前间距', after: '段后间距' }[key]}
              （mm）
              <input
                type="number"
                step="0.01"
                min={key === 'left' || key === 'right' ? -25.4 : 0}
                max={key === 'left' || key === 'right' ? 127 : 50.8}
                value={mm(value[key] || 0)}
                onChange={(event) => {
                  if (event.target.value !== '' && event.target.validity.valid)
                    change({ [key]: pt(Number(event.target.value)) });
                }}
              />
            </label>
          ))}
          <label>
            行距倍数
            <input
              type="number"
              min="0.8"
              max="3"
              step="0.01"
              value={value.line ?? ''}
              placeholder="沿用原文"
              onChange={(event) => {
                if (event.target.value !== '' && event.target.validity.valid)
                  change({ line: Number(event.target.value) });
              }}
            />
          </label>
        </div>
        <div className="resume-format-nudge">
          <button type="button" onClick={() => nudge(-pt(1))}>
            段落左移 1 mm
          </button>
          <button type="button" onClick={() => nudge(pt(1))}>
            段落右移 1 mm
          </button>
        </div>
        {block.word.hasTabs && value.rightTab !== undefined && (
          <div className="resume-date-tab">
            <label>
              日期 / 末尾制表位（mm）
              <input
                type="number"
                min="0"
                max="282.22"
                step="0.01"
                value={mm(value.rightTab ?? block.word.width)}
                onChange={(event) => {
                  if (event.target.value !== '' && event.target.validity.valid)
                    change({ rightTab: pt(Number(event.target.value)) });
                }}
              />
            </label>
            <div className="resume-format-nudge">
              <button
                type="button"
                onClick={() =>
                  change({ rightTab: Math.max(0, (value.rightTab ?? block.word!.width) - pt(1)) })
                }
              >
                日期左移 1 mm
              </button>
              <button
                type="button"
                onClick={() =>
                  change({ rightTab: Math.min(800, (value.rightTab ?? block.word!.width) + pt(1)) })
                }
              >
                日期右移 1 mm
              </button>
            </div>
            <p>用于通过制表符放在行末的日期；只调整该制表位，保留前面的文字和样式。</p>
          </div>
        )}
        {block.word.hasTabs && value.rightTab === undefined && (
          <p>
            原段落使用普通制表符，没有右对齐日期制表位。可先调整段落缩进；单独移动末尾日期需在原
            Word 中设置右制表位。
          </p>
        )}
        <button type="button" className="resume-format-reset" onClick={onReset}>
          还原本段排版
        </button>
      </fieldset>
    </details>
  );
}
