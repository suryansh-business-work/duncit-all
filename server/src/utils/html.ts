const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Text made safe to place inside HTML — element content or a quoted attribute.
 * Everything the server writes into markup from data (a crawler's card, an
 * analytics report's names) goes through this one function.
 */
export const escapeHtml = (value: string): string =>
  value.replaceAll(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * The text an HTML attribute or element actually says — `&amp;` back to `&`,
 * `&#39;` back to `'`. Text read OUT of someone's page is decoded once here,
 * so writing it back through escapeHtml never doubles it into `&amp;amp;`.
 * An entity this does not know is left exactly as written.
 */
export const decodeHtmlEntities = (value: string): string =>
  value.replaceAll(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    const lower = body.toLowerCase();
    if (lower.startsWith('#')) {
      const code = lower.startsWith('#x')
        ? Number.parseInt(lower.slice(2), 16)
        : Number.parseInt(lower.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[lower] ?? entity;
  });
