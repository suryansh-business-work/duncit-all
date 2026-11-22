/**
 * The small Markdown subset Ask Duncit answers in, parsed into plain blocks
 * and inline spans so mWeb (MUI Typography) and the native app (Tamagui Text)
 * render the same structure — and neither ever injects HTML. Links are kept
 * only for http(s) URLs; anything else stays text.
 *
 * Supported: `#`–`###` headings, `-`/`*`/`•` bullets, `1.` numbered items,
 * paragraphs (blank-line separated), **bold**, *italic* / _italic_, `code`
 * and [label](https://…).
 */

export interface MdSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
}

export type MdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; spans: MdSpan[] }
  | { type: 'paragraph'; spans: MdSpan[] }
  | { type: 'bullets'; items: MdSpan[][] }
  | { type: 'numbered'; start: number; items: MdSpan[][] };

const SAFE_URL = /^https?:\/\/[^\s)]+$/i;
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

/** One line's inline markup → spans. Unknown or unsafe markup stays literal text. */
export function parseInline(line: string): MdSpan[] {
  const spans: MdSpan[] = [];
  let last = 0;
  for (const match of line.matchAll(INLINE)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > last) spans.push({ text: line.slice(last, index) });
    if (token.startsWith('**')) spans.push({ text: token.slice(2, -2), bold: true });
    else if (token.startsWith('`')) spans.push({ text: token.slice(1, -1), code: true });
    else if (token.startsWith('[')) {
      const label = token.slice(1, token.indexOf(']('));
      const href = token.slice(token.indexOf('](') + 2, -1);
      spans.push(SAFE_URL.test(href) ? { text: label, href } : { text: token });
    } else spans.push({ text: token.slice(1, -1), italic: true });
    last = index + token.length;
  }
  if (last < line.length) spans.push({ text: line.slice(last) });
  return spans.filter((span) => span.text.length > 0);
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;

export function parseAnswerMarkdown(source: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', spans: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  for (const raw of String(source ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    const prev = blocks[blocks.length - 1];
    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: 'heading', level: (heading[1] ?? '#').length as 1 | 2 | 3, spans: parseInline(heading[2] ?? '') });
    } else if (bullet) {
      flush();
      if (prev?.type === 'bullets') prev.items.push(parseInline(bullet[1] ?? ''));
      else blocks.push({ type: 'bullets', items: [parseInline(bullet[1] ?? '')] });
    } else if (numbered) {
      flush();
      if (prev?.type === 'numbered') prev.items.push(parseInline(numbered[2] ?? ''));
      else blocks.push({ type: 'numbered', start: Number(numbered[1] ?? 1), items: [parseInline(numbered[2] ?? '')] });
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** The answer as plain text (read-aloud, copy): markup removed, links kept as their label. */
export function markdownToPlainText(source: string): string {
  return parseAnswerMarkdown(source)
    .map((block) => {
      const text = (spans: MdSpan[]) => spans.map((s) => s.text).join('');
      if (block.type === 'bullets' || block.type === 'numbered') return block.items.map(text).join('\n');
      return text(block.spans);
    })
    .join('\n\n');
}
