import { openaiEmbed } from '@services/openai/openai.embeddings';
import { INTEL_LIMITS, type IndexScope, type IntelLevel, type IntelSource } from '../intel.constants';
import type { IntelSettings } from '../settings/intelSettings.types';
import { intelOpenAiCredentials } from './intel.openai';
import { collectionOf, qdrant, type QdrantFilter, type ScoredPoint } from './qdrant.client';
import { sparseVector } from './sparse';

/**
 * Hybrid retrieval: semantic (dense embeddings) and lexical (sparse, exact
 * terms) candidates fused by reciprocal rank inside Qdrant, per scope, then
 * merged across scopes. Metadata filters decide what may be returned at all:
 * the conversation's sources and environments, and file visibility (a private
 * file is only ever found by its owner).
 */

export interface SearchHit {
  ref: string;
  document_key: string;
  title: string;
  url: string;
  source: string;
  environment: string;
  text: string;
  page: number | null;
  line_start: number | null;
  line_end: number | null;
  score: number;
  meta: Record<string, unknown>;
}

export interface SearchInput {
  query: string;
  scopes: IndexScope[];
  sources: IntelSource[];
  userId: string;
  level: IntelLevel;
  topK: number;
  settings: IntelSettings;
}

/** Who may see which file: TEAM for everyone, PRIVATE for its owner, ADMINS for admins. */
export function visibilityFilter(userId: string, level: IntelLevel): QdrantFilter[] {
  const allowed: QdrantFilter[] = [
    { key: 'visibility', match: { value: 'TEAM' } },
    { must: [{ key: 'visibility', match: { value: 'PRIVATE' } }, { key: 'owner_id', match: { value: userId } }] },
  ];
  if (level !== 'EMPLOYEE') allowed.push({ key: 'visibility', match: { value: 'ADMINS' } });
  return allowed;
}

export function buildFilter(sources: IntelSource[], userId: string, level: IntelLevel): QdrantFilter {
  return { must: [{ key: 'source', match: { any: sources } }], should: visibilityFilter(userId, level) };
}

const toHit = (point: ScoredPoint): Omit<SearchHit, 'ref'> => {
  const p = point.payload;
  return {
    document_key: String(p.document_key ?? ''),
    title: String(p.title ?? ''),
    url: String(p.url ?? ''),
    source: String(p.source ?? ''),
    environment: String(p.environment ?? ''),
    text: String(p.text ?? ''),
    page: typeof p.page === 'number' ? p.page : null,
    line_start: typeof p.line_start === 'number' ? p.line_start : null,
    line_end: typeof p.line_end === 'number' ? p.line_end : null,
    score: point.score,
    meta: (p.meta as Record<string, unknown>) ?? {},
  };
};

/** Merges per-scope results: best score first, one entry per chunk, numbered S1…Sn. */
export function mergeHits(lists: ScoredPoint[][], topK: number): SearchHit[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .sort((a, b) => b.score - a.score)
    .filter((point) => {
      const id = `${String(point.payload.document_key)}#${String(point.payload.chunk)}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, topK)
    .map((point, i) => ({ ref: `S${i + 1}`, ...toHit(point) }));
}

export type SearchResult = { ok: true; hits: SearchHit[] } | { ok: false; message: string };

export async function hybridSearch(input: SearchInput): Promise<SearchResult> {
  const query = input.query.trim().slice(0, 2000);
  if (!query || input.sources.length === 0 || input.scopes.length === 0) return { ok: true, hits: [] };
  if (!(await qdrant.ready())) return { ok: false, message: 'The knowledge index (Qdrant) is not reachable right now.' };
  const embedded = await openaiEmbed({
    task: 'intel.embed',
    inputs: [query],
    model: input.settings.embeddings.model,
    dimensions: input.settings.embeddings.dimensions,
    detail: 'search query',
    user_id: input.userId,
    credentials: await intelOpenAiCredentials(input.settings),
  });
  if (!embedded.ok) return { ok: false, message: embedded.message };
  const dense = embedded.vectors[0] ?? [];
  const sparse = sparseVector(query);
  const filter = buildFilter(input.sources, input.userId, input.level);
  const limit = Math.min(Math.max(input.topK, 1), INTEL_LIMITS.maxSearchResults);
  const lists = await Promise.all(
    input.scopes.map((scope) => qdrant.hybrid(collectionOf(scope), dense, sparse, filter, limit).catch(() => [] as ScoredPoint[]))
  );
  return { ok: true, hits: mergeHits(lists, limit) };
}
