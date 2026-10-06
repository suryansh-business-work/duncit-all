/**
 * Just enough HTML structure for the CMS migration, over Astro's own output
 * (well-formed, double-quoted attributes). Not a general parser: it walks
 * tags, tracks depth, and treats <script>/<style>/<textarea> bodies as raw
 * text so a `<` inside them is never read as a tag.
 */

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea']);
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;

/**
 * Every tag in source order: { start, end, name, closing, attrs, selfClosing }.
 * Raw-text elements are skipped to their closing tag.
 */
export function tokens(html) {
  const out = [];
  TAG.lastIndex = 0;
  let match;
  while ((match = TAG.exec(html)) !== null) {
    if (match[0].startsWith('<!--')) continue;
    const name = match[2].toLowerCase();
    const token = {
      start: match.index,
      end: match.index + match[0].length,
      name,
      closing: match[1] === '/',
      attrs: match[3] ?? '',
      selfClosing: match[4] === '/' || VOID.has(name),
    };
    out.push(token);
    if (!token.closing && RAW.has(name)) {
      const close = html.toLowerCase().indexOf(`</${name}`, token.end);
      if (close === -1) break;
      TAG.lastIndex = close;
    }
  }
  return out;
}

/** An attribute's value from a tag's attribute text, entity-decoded. */
export function attr(attrs, name) {
  const match = new RegExp(String.raw`(?:^|\s)${name}\s*=\s*"([^"]*)"`).exec(attrs);
  return match ? decodeEntities(match[1]) : null;
}

export const hasAttr = (attrs, name) => new RegExp(String.raw`(?:^|\s)${name}(?:\s*=|\s|$)`).test(attrs);

const ENTITIES = { '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
export const decodeEntities = (value) => value.replaceAll(/&(?:quot|#39|lt|gt|amp);/g, (entity) => ENTITIES[entity]);
export const escapeAttr = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * The elements matching `predicate(token)`, each as { start, end, token }
 * spanning its start tag to its matching end tag. Outermost matches only.
 */
export function findElements(html, predicate) {
  const all = tokens(html);
  const found = [];
  for (let i = 0; i < all.length; i += 1) {
    const token = all[i];
    if (token.closing || !predicate(token)) continue;
    if (found.length && token.start < found.at(-1).end) continue;
    found.push({ start: token.start, end: elementEnd(all, i, html), token });
  }
  return found;
}

function elementEnd(all, index, html) {
  const open = all[index];
  if (open.selfClosing) return open.end;
  if (RAW.has(open.name)) {
    const close = html.toLowerCase().indexOf(`</${open.name}`, open.end);
    return html.indexOf('>', close) + 1;
  }
  let depth = 0;
  for (let i = index; i < all.length; i += 1) {
    const token = all[i];
    if (token.name !== open.name || token.selfClosing) continue;
    depth += token.closing ? -1 : 1;
    if (depth === 0) return token.end;
  }
  return html.length;
}

/** Replaces each matched element with what `replacer(html, element)` returns. */
export function replaceElements(html, predicate, replacer) {
  let out = '';
  let cursor = 0;
  for (const element of findElements(html, predicate)) {
    out += html.slice(cursor, element.start) + replacer(html.slice(element.start, element.end), element);
    cursor = element.end;
  }
  return out + html.slice(cursor);
}

/** The body's direct children, as html strings (whitespace-only text dropped). */
export function topLevelNodes(body) {
  const all = tokens(body);
  const nodes = [];
  let cursor = 0;
  for (let i = 0; i < all.length; i += 1) {
    const token = all[i];
    if (token.start < cursor || token.closing) continue;
    const end = elementEnd(all, i, body);
    const text = body.slice(cursor, token.start).trim();
    if (text) nodes.push(text);
    nodes.push(body.slice(token.start, end));
    cursor = end;
  }
  const tail = body.slice(cursor).trim();
  if (tail) nodes.push(tail);
  return nodes;
}

/** The inside of <body>, or the whole document if it has none. */
export function bodyOf(document) {
  const open = /<body\b[^>]*>/i.exec(document);
  if (!open) return document;
  const close = document.toLowerCase().lastIndexOf('</body>');
  return document.slice(open.index + open[0].length, close === -1 ? undefined : close);
}

export const headOf = (document) => {
  const open = document.toLowerCase().indexOf('<head');
  const close = document.toLowerCase().indexOf('</head>');
  return open === -1 || close === -1 ? '' : document.slice(open, close);
};
