/**
 * The plain-text half of the message.
 *
 * Not optional in practice: a message with no text part scores worse with spam
 * filters, and it is what a screen reader or a text-only client shows. Deriving
 * one from the HTML is better than shipping none, so `text` is filled in when
 * the caller did not write one.
 *
 * The stripper is a single left-to-right pass rather than a set of regexes.
 * Matching `<script>…</script>` or even `<[^>]+>` with a regex backtracks
 * superlinearly on a long unclosed tag (Sonar S8786), and an email body is
 * attacker-adjacent input often enough to care.
 */

/** Tags whose CONTENT must not appear in the text body. */
const DROPPED = new Set(['script', 'style']);
/** Tags that end a block, so the text reads as paragraphs and not one line. */
const BLOCK_ENDS = new Set([
  '/p',
  '/div',
  '/tr',
  '/li',
  '/blockquote',
  '/h1',
  '/h2',
  '/h3',
  '/h4',
  '/h5',
  '/h6',
]);
/** Tags that are a line break in themselves. */
const BREAKS = new Set(['br', 'hr']);

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/** `<div class="x">` → `div`, `</P>` → `/p`. Lower-cased, attributes dropped. */
function tagName(tag: string): string {
  let inner = tag.slice(1, -1).trim();
  // A closing tag keeps its slash: `</p>` ends a paragraph, `<p>` starts one.
  const closing = inner.startsWith('/');
  if (closing) inner = inner.slice(1);
  const end = inner.search(/[\s/]/);
  const name = (end === -1 ? inner : inner.slice(0, end)).toLowerCase();
  return closing ? `/${name}` : name;
}

export function htmlToText(html: string): string {
  let out = '';
  let cursor = 0;

  while (cursor < html.length) {
    const open = html.indexOf('<', cursor);
    if (open === -1) {
      out += html.slice(cursor);
      break;
    }
    out += html.slice(cursor, open);

    const close = html.indexOf('>', open);
    // An unclosed tag is the end of anything readable.
    if (close === -1) break;

    const name = tagName(html.slice(open, close + 1));
    if (DROPPED.has(name)) {
      const end = html.toLowerCase().indexOf(`</${name}>`, close);
      cursor = end === -1 ? html.length : end + name.length + 3;
      continue;
    }
    if (BREAKS.has(name) || BLOCK_ENDS.has(name)) out += '\n';
    cursor = close + 1;
  }

  return out
    .replace(/&[#a-z0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
