import { createHash } from 'node:crypto';
import { logs } from '@observability/log';
import { EMBED_BATCH, openaiEmbed } from '@services/openai/openai.embeddings';
import { INDEX_SCOPES, INTEL_LIMITS, type IndexScope, type IntelSource, type MediaVisibility } from '../intel.constants';
import type { IntelSettings } from '../settings/intelSettings.types';
import { chunkCode, chunkPages, chunkText, type Chunk } from './chunk';
import { intelOpenAiCredentials } from './intel.openai';
import { IntelDocumentModel } from './intelDocument.model';
import { collectionOf, pointId, qdrant, type QdrantPoint } from './qdrant.client';
import { sparseVector } from './sparse';

/**
 * Turns source documents into searchable chunks: chunk → embed → upsert into
 * the scope's Qdrant collection, recorded in the document registry. A document
 * whose content hash has not changed is skipped (no embedding spend); a changed
 * one gets a new version and its old chunks are replaced, never duplicated.
 */

export interface SourceDocument {
  source: IntelSource;
  connector_id: string;
  external_id: string;
  scope: IndexScope;
  title: string;
  url?: string;
  text?: string;
  pages?: Array<{ page: number; text: string }>;
  code?: boolean;
  owner_id?: string;
  visibility?: MediaVisibility;
  metadata?: Record<string, unknown>;
  updated_at?: Date | null;
}

export type IndexOutcome = 'INDEXED' | 'UNCHANGED' | 'FAILED' | 'EMPTY';

export const documentKey = (doc: Pick<SourceDocument, 'source' | 'connector_id' | 'external_id'>) => `${doc.source}:${doc.connector_id}:${doc.external_id}`;

const bodyOf = (doc: SourceDocument) => (doc.pages ? doc.pages.map((p) => p.text).join('\n') : (doc.text ?? '')).slice(0, INTEL_LIMITS.maxDocumentChars);

export const contentHash = (doc: SourceDocument) => createHash('sha256').update(`${doc.title}\u0000${bodyOf(doc)}`).digest('hex');

function chunksOf(doc: SourceDocument, settings: IntelSettings): Chunk[] {
  const opts = { chars: settings.embeddings.chunk_chars, overlap: settings.embeddings.chunk_overlap };
  if (doc.pages) return chunkPages(doc.pages.map((p) => ({ page: p.page, text: p.text.slice(0, INTEL_LIMITS.maxDocumentChars) })), opts);
  const text = bodyOf(doc);
  return doc.code ? chunkCode(text, opts) : chunkText(text, opts);
}

/** Creates any missing collection. Answers false when Qdrant is down. */
export async function ensureCollections(settings: IntelSettings): Promise<boolean> {
  if (!(await qdrant.ready())) return false;
  for (const scope of INDEX_SCOPES) {
    const name = collectionOf(scope);
    if (!(await qdrant.info(name))) await qdrant.create(name, settings.embeddings.dimensions);
  }
  return true;
}

async function embedAll(texts: string[], settings: IntelSettings, detail: string): Promise<number[][]> {
  const credentials = await intelOpenAiCredentials(settings);
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const res = await openaiEmbed({
      task: 'intel.embed',
      inputs: texts.slice(i, i + EMBED_BATCH),
      model: settings.embeddings.model,
      dimensions: settings.embeddings.dimensions,
      detail,
      credentials,
    });
    if (!res.ok) throw new Error(res.message);
    vectors.push(...res.vectors);
  }
  return vectors;
}

export async function indexDocument(doc: SourceDocument, settings: IntelSettings, runId = ''): Promise<IndexOutcome> {
  const key = documentKey(doc);
  const hash = contentHash(doc);
  const existing = await IntelDocumentModel.findOne({ key }).lean();
  if (existing && existing.status === 'INDEXED' && existing.content_hash === hash && existing.scope === doc.scope) {
    if (runId) await IntelDocumentModel.updateOne({ _id: existing._id }, { $set: { seen_run: runId } });
    return 'UNCHANGED';
  }
  const base = {
    source: doc.source,
    connector_id: doc.connector_id,
    external_id: doc.external_id,
    scope: doc.scope,
    title: doc.title.slice(0, 300),
    url: doc.url ?? '',
    owner_id: doc.owner_id ?? '',
    visibility: doc.visibility ?? 'TEAM',
    metadata: doc.metadata ?? {},
    source_updated_at: doc.updated_at ?? null,
    seen_run: runId,
  };
  const chunks = chunksOf(doc, settings);
  try {
    if (existing) await qdrant.deleteByFilter(collectionOf(existing.scope), { must: [{ key: 'document_key', match: { value: key } }] });
    if (chunks.length === 0) {
      await IntelDocumentModel.updateOne({ key }, { $set: { ...base, content_hash: hash, chunk_count: 0, char_count: 0, status: 'INDEXED', error: '', indexed_at: new Date() }, $inc: { version: 1 } }, { upsert: true });
      return 'EMPTY';
    }
    const vectors = await embedAll(chunks.map((c) => `${doc.title}\n\n${c.text}`), settings, `${doc.source} · ${doc.title.slice(0, 80)}`);
    const points: QdrantPoint[] = chunks.map((chunk, i) => ({
      id: pointId(key, chunk.index),
      vector: { dense: vectors[i] ?? [], lexical: sparseVector(`${doc.title} ${chunk.text}`) },
      payload: {
        document_key: key,
        source: doc.source,
        connector_id: doc.connector_id,
        environment: doc.scope,
        title: base.title,
        url: base.url,
        text: chunk.text,
        chunk: chunk.index,
        page: chunk.page ?? null,
        line_start: chunk.line_start ?? null,
        line_end: chunk.line_end ?? null,
        owner_id: base.owner_id,
        visibility: base.visibility,
        updated_at: doc.updated_at ? doc.updated_at.toISOString() : null,
        meta: base.metadata,
      },
    }));
    await qdrant.upsert(collectionOf(doc.scope), points);
    await IntelDocumentModel.updateOne(
      { key },
      { $set: { ...base, content_hash: hash, chunk_count: chunks.length, char_count: bodyOf(doc).length, status: 'INDEXED', error: '', indexed_at: new Date() }, $inc: { version: 1 } },
      { upsert: true }
    );
    return 'INDEXED';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.server.warn('intel', 'index', { error, key });
    await IntelDocumentModel.updateOne({ key }, { $set: { ...base, status: 'FAILED', error: message.slice(0, 500) } }, { upsert: true });
    return 'FAILED';
  }
}

/** Removes one document's chunks and marks it deleted (kept for the audit of what was indexed). */
export async function removeDocument(key: string): Promise<void> {
  const doc = await IntelDocumentModel.findOne({ key }).lean();
  if (!doc) return;
  await qdrant.deleteByFilter(collectionOf(doc.scope), { must: [{ key: 'document_key', match: { value: key } }] }).catch((error) => logs.server.warn('intel', 'unindex', { error, key }));
  await IntelDocumentModel.updateOne({ key }, { $set: { status: 'DELETED', chunk_count: 0 } });
}

/** After a full sync: every document of the connector the run did not see was deleted upstream. */
export async function pruneUnseen(connectorId: string, runId: string): Promise<number> {
  const stale = await IntelDocumentModel.find({ connector_id: connectorId, status: { $ne: 'DELETED' }, seen_run: { $ne: runId } }, { key: 1 }).lean();
  for (const doc of stale) await removeDocument(doc.key);
  return stale.length;
}

/** Everything a connector indexed — used when the connector is deleted. */
export async function removeConnectorDocuments(connectorId: string): Promise<number> {
  const docs = await IntelDocumentModel.find({ connector_id: connectorId, status: { $ne: 'DELETED' } }, { key: 1 }).lean();
  for (const doc of docs) await removeDocument(doc.key);
  return docs.length;
}

export async function countIndexed(connectorId: string): Promise<number> {
  return IntelDocumentModel.countDocuments({ connector_id: connectorId, status: 'INDEXED' });
}
