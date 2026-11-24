import { createHash } from 'node:crypto';
import type { IndexScope } from '../intel.constants';

/**
 * A thin REST client for the self-hosted Qdrant container. Qdrant runs on the
 * stack's internal Docker network only (no host port, no public vhost), so the
 * address is the compose service name; QDRANT_URL overrides it for local runs.
 *
 * Each index scope is its own collection — staging data, production data and
 * environment-free data (uploaded files, Slack) never share one.
 */

export const DENSE = 'dense';
export const SPARSE = 'lexical';

const COLLECTION: Record<IndexScope, string> = {
  STAGING: 'intel_staging',
  PRODUCTION: 'intel_production',
  SHARED: 'intel_shared',
};

export const collectionOf = (scope: IndexScope): string => COLLECTION[scope];

/** Set by docker-compose to the stack's internal service; unset (local, tests) = no index. */
export const qdrantUrl = (): string => (process.env.QDRANT_URL?.trim() ?? '').replace(/\/$/, '');

export class QdrantError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'QdrantError';
  }
}

async function call<T>(method: string, path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
  if (!qdrantUrl()) throw new QdrantError('QDRANT_URL is not set on this server', 503);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = process.env.QDRANT_API_KEY?.trim();
  if (key) headers['api-key'] = key;
  const res = await fetch(`${qdrantUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as { result?: T; status?: { error?: string } }) : {};
  if (!res.ok) throw new QdrantError(parsed.status?.error ?? `Qdrant answered ${res.status}`, res.status);
  return parsed.result as T;
}

/** A stable UUID for a chunk, so re-indexing the same chunk overwrites it instead of duplicating it. */
export function pointId(documentKey: string, chunk: number): string {
  const hex = createHash('sha1').update(`${documentKey}#${chunk}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface QdrantPoint {
  id: string;
  vector: { [DENSE]: number[]; [SPARSE]: SparseVector };
  payload: Record<string, unknown>;
}

export interface CollectionInfo {
  status: string;
  points_count: number | null;
  indexed_vectors_count: number | null;
  config?: { params?: { vectors?: Record<string, { size?: number }> } };
}

export type QdrantFilter = Record<string, unknown>;

export interface ScoredPoint {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

const KEYWORD_FIELDS = ['source', 'connector_id', 'document_key', 'owner_id', 'visibility', 'environment'];

export const qdrant = {
  async ready(): Promise<boolean> {
    return (await this.probe()).ok;
  },

  /** Whether Qdrant answers, and if not, why — for the source cards and System Health. */
  async probe(): Promise<{ ok: boolean; error: string }> {
    try {
      await call('GET', '/collections', undefined, 4000);
      return { ok: true, error: '' };
    } catch (error) {
      const cause = (error as { cause?: { code?: string } })?.cause?.code;
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: cause ? `${message} (${cause})` : message };
    }
  },

  async info(collection: string): Promise<CollectionInfo | null> {
    try {
      return await call<CollectionInfo>('GET', `/collections/${collection}`, undefined, 6000);
    } catch (error) {
      if (error instanceof QdrantError && error.status === 404) return null;
      throw error;
    }
  },

  /** Creates the collection (dense + IDF-weighted sparse vectors) and its payload indexes. */
  async create(collection: string, dimensions: number): Promise<void> {
    await call('PUT', `/collections/${collection}`, {
      vectors: { [DENSE]: { size: dimensions, distance: 'Cosine' } },
      sparse_vectors: { [SPARSE]: { modifier: 'idf' } },
      on_disk_payload: true,
    });
    await Promise.all(KEYWORD_FIELDS.map((field) => call('PUT', `/collections/${collection}/index?wait=true`, { field_name: field, field_schema: 'keyword' })));
  },

  async drop(collection: string): Promise<void> {
    await call('DELETE', `/collections/${collection}`);
  },

  async upsert(collection: string, points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;
    await call('PUT', `/collections/${collection}/points?wait=true`, { points }, 60_000);
  },

  async deleteByFilter(collection: string, filter: QdrantFilter): Promise<void> {
    await call('POST', `/collections/${collection}/points/delete?wait=true`, { filter });
  },

  /** Changes payload fields (e.g. a file's visibility) on every matching point, without re-embedding. */
  async setPayload(collection: string, payload: Record<string, unknown>, filter: QdrantFilter): Promise<void> {
    await call('POST', `/collections/${collection}/points/payload?wait=true`, { payload, filter });
  },

  async count(collection: string, filter?: QdrantFilter): Promise<number> {
    const result = await call<{ count: number }>('POST', `/collections/${collection}/points/count`, { filter, exact: false });
    return result.count;
  },

  /** Hybrid query: dense and lexical candidates, fused by reciprocal rank (Qdrant Query API). */
  async hybrid(collection: string, dense: number[], sparse: SparseVector, filter: QdrantFilter | undefined, limit: number): Promise<ScoredPoint[]> {
    const prefetch = [
      { query: dense, using: DENSE, limit: limit * 4, filter },
      ...(sparse.indices.length ? [{ query: sparse, using: SPARSE, limit: limit * 4, filter }] : []),
    ];
    const result = await call<{ points: ScoredPoint[] }>('POST', `/collections/${collection}/points/query`, {
      prefetch,
      query: { fusion: 'rrf' },
      limit,
      with_payload: true,
    });
    return result.points ?? [];
  },
};
