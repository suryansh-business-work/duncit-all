/**
 * A composed CMS page is static html with live blocks dropped in:
 *
 *   <cms-block data-block="newsletter" data-props="{&quot;source&quot;:…}"></cms-block>
 *
 * The portal's editor writes that exact shape, so this splits on it without
 * an HTML parser: text between blocks goes out untouched, each block becomes a
 * server-rendered component. The pieces are only ever concatenated back in
 * order, so a block nested inside a <div> still closes correctly.
 */

export type Segment =
  | { kind: 'html'; html: string }
  | { kind: 'block'; block: string; props: Record<string, unknown> };

const BLOCK_TAG = /<cms-block data-block="([a-z0-9-]+)"(?: data-props="([^"]*)")?><\/cms-block>/g;

const ENTITIES: Record<string, string> = { '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };

const unescapeAttr = (value: string) => value.replaceAll(/&(?:quot|#39|lt|gt|amp);/g, (entity) => ENTITIES[entity]);

/** A block's props; anything unreadable becomes "no props" rather than a crash. */
export function parseProps(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(unescapeAttr(raw));
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function splitSegments(html: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of html.matchAll(BLOCK_TAG)) {
    const start = match.index;
    if (start > cursor) segments.push({ kind: 'html', html: html.slice(cursor, start) });
    segments.push({ kind: 'block', block: match[1], props: parseProps(match[2]) });
    cursor = start + match[0].length;
  }
  if (cursor < html.length) segments.push({ kind: 'html', html: html.slice(cursor) });
  return segments;
}
