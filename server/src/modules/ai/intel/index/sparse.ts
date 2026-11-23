import type { SparseVector } from './qdrant.client';

/**
 * The lexical half of hybrid search: a bag-of-words sparse vector per text.
 * Qdrant applies IDF itself (the collection's `modifier: idf`), so this only
 * supplies sub-linear term frequencies. Tokens are hashed into a 32-bit space
 * (FNV-1a), so no vocabulary has to be stored or kept in sync.
 *
 * Code-aware: `createPodDraft` and `pod_draft_id` also index their parts, so a
 * search for "pod draft" finds them, while the whole identifier still matches exactly.
 */

const TOKEN = /[\p{L}\p{N}_]+/gu;
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'be', 'this', 'that', 'are', 'was', 'from']);

export function fnv1a(token: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Parts of an identifier: camelCase humps and snake/kebab segments. */
function parts(word: string): string[] {
  const split = word
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_]+/)
    .filter(Boolean);
  return split.length > 1 ? split : [];
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(TOKEN)) {
    const word = match[0];
    const lower = word.toLowerCase();
    if (lower.length > 1 && lower.length <= 64 && !STOP.has(lower)) out.push(lower);
    for (const part of parts(word)) {
      const p = part.toLowerCase();
      if (p.length > 1 && !STOP.has(p)) out.push(p);
    }
  }
  return out;
}

export function sparseVector(text: string): SparseVector {
  const counts = new Map<number, number>();
  for (const token of tokenize(text)) {
    const index = fnv1a(token);
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  const indices = [...counts.keys()].sort((a, b) => a - b);
  return { indices, values: indices.map((i) => 1 + Math.log(counts.get(i) ?? 1)) };
}
