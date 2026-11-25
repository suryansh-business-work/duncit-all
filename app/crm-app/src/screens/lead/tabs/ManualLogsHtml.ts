/**
 * Manual logs and Ask AI answers are rich text (HTML) in the portal. The app
 * writes and reads them as plain text: what it sends is escaped, one
 * paragraph per line, with each @mention as the span the portal's editor
 * writes (so the server emails the person); what it shows is the text the
 * HTML carries.
 */

export interface LogMention {
  id: string;
  label: string;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&amp;': '&',
};

const MAX_CODE_POINT = 0x10ffff;

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

/** Named and numeric entities back to characters (&amp; last, so "&amp;lt;" stays "&lt;"). */
function decodeEntities(text: string): string {
  const numeric = text.replace(/&#(x[\da-f]+|\d+);/gi, (_match, code: string) => {
    const value =
      code.startsWith('x') || code.startsWith('X')
        ? Number.parseInt(code.slice(1), 16)
        : Number(code);
    return value >= 0 && value <= MAX_CODE_POINT ? String.fromCodePoint(value) : '';
  });
  return numeric.replace(
    /&(nbsp|lt|gt|quot|apos|#39|amp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
}

/** The words an HTML body carries: blocks and line breaks as new lines, list items as "- " lines. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr|ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const mentionSpan = (m: LogMention) =>
  `<span data-type="mention" class="rich-text-mention" data-id="${escapeHtml(m.id)}" data-label="${escapeHtml(m.label)}">@${escapeHtml(m.label)}</span>`;

/**
 * Typed text as the HTML body the portal stores. Only the mentions still in
 * the text become spans; a longer name is placed before a shorter one it
 * starts with, so "@Asha Rao" is never read as "@Asha".
 */
export function manualLogHtml(text: string, mentions: readonly LogMention[]): string {
  const live = mentions
    .filter((m) => text.includes(`@${m.label}`))
    .sort((a, b) => b.label.length - a.label.length);
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      // Mark each mention with a private-use placeholder first, so a name inside an inserted span is never matched again.
      let out = escapeHtml(line);
      live.forEach((m, index) => {
        out = out.split(escapeHtml(`@${m.label}`)).join(`${index}`);
      });
      live.forEach((m, index) => {
        out = out.split(`${index}`).join(mentionSpan(m));
      });
      return `<p>${out}</p>`;
    })
    .join('');
}

const SPAN_TAG = /<span\b[^>]*>/gi;
const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(tag)?.[1];

/** A stored body back to editable text, with the people it mentions (each "@Name" in the text). */
export function parseManualLogHtml(html: string | null | undefined): {
  text: string;
  mentions: LogMention[];
} {
  const source = html ?? '';
  const mentions: LogMention[] = [];
  let out = '';
  let cursor = 0;
  for (const match of source.matchAll(SPAN_TAG)) {
    const tag = match[0];
    const id = attr(tag, 'data-id');
    const start = match.index ?? 0;
    if (start < cursor || !tag.includes('data-type="mention"') || !id) continue;
    const close = source.indexOf('</span>', start + tag.length);
    const end = close === -1 ? start + tag.length : close + '</span>'.length;
    const inner = htmlToText(source.slice(start + tag.length, close === -1 ? end : close)).replace(
      /^@/,
      '',
    );
    const label = decodeEntities(attr(tag, 'data-label') ?? '') || inner;
    if (!mentions.some((m) => m.id === id)) mentions.push({ id, label });
    out += `${source.slice(cursor, start)}@${escapeHtml(label)}`;
    cursor = end;
  }
  return { text: htmlToText(out + source.slice(cursor)), mentions };
}
