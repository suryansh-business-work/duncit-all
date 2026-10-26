import { isSensitiveName } from '../catalog/sensitivity';

/**
 * The arguments of a call as the activity log keeps them: every parameter, so
 * an operator can see exactly what the AI asked for — except credentials, which
 * are replaced, and very long values, which are cut so one call cannot bloat
 * the log.
 */

const MAX_STRING = 500;
const MAX_ITEMS = 50;
const MAX_DEPTH = 6;
const MAX_PREVIEW = 8_000;
export const REDACTED = '[redacted]';

function redactNode(node: unknown, depth: number): unknown {
  if (typeof node === 'string') {
    return node.length > MAX_STRING ? `${node.slice(0, MAX_STRING)}… (+${node.length - MAX_STRING} chars)` : node;
  }
  if (node === null || typeof node !== 'object') return node;
  if (depth >= MAX_DEPTH) return '[…]';
  if (Array.isArray(node)) {
    const kept = node.slice(0, MAX_ITEMS).map((item) => redactNode(item, depth + 1));
    return node.length > MAX_ITEMS ? [...kept, `… (+${node.length - MAX_ITEMS} items)`] : kept;
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, isSensitiveName(key) ? REDACTED : redactNode(value, depth + 1)])
  );
}

export function redactArgs(args: unknown): string {
  const text = JSON.stringify(redactNode(args, 0)) ?? 'null';
  return text.length > MAX_PREVIEW ? `${text.slice(0, MAX_PREVIEW)}…` : text;
}
