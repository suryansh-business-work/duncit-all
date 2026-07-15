const HEX_ID_RE = /^[a-f0-9]{24}$/i;
const UUID_RE = /^[0-9a-f-]{20,}$/i;

/**
 * Turn a raw path segment into a human label. Honours an explicit `labelMap`
 * override first, collapses opaque ids (Mongo hex / uuid) to a friendly
 * "Detail", and otherwise title-cases the de-slugged segment.
 */
export function humanise(segment: string, labelMap?: Record<string, string>): string {
  const mapped = labelMap?.[segment];
  if (mapped) return mapped;
  if (HEX_ID_RE.test(segment) || UUID_RE.test(segment)) return 'Detail';
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
