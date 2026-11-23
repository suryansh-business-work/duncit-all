/**
 * The retrieval pipeline's pure parts: lexical vectors, chunking, stable point
 * ids, content hashing, hybrid-result fusion and the visibility filter.
 */
import { gzipSync } from 'node:zlib';
import { chunkCode, chunkPages, chunkText } from '../../index/chunk';
import { contentHash, documentKey } from '../../index/intel.indexer';
import { buildFilter, mergeHits, visibilityFilter } from '../../index/intel.search';
import { collectionOf, pointId } from '../../index/qdrant.client';
import { fnv1a, sparseVector, tokenize } from '../../index/sparse';
import { fileKind, looksBinary, stripRoot } from '../../connectors/github/github.files';
import { TarReader, type TarEntry } from '../../connectors/github/tar.stream';

describe('sparse vectors', () => {
  it('lower-cases, drops stop words and splits identifiers into parts', () => {
    expect(tokenize('The createPodDraft and pod_draft_id')).toEqual(['createpoddraft', 'create', 'pod', 'draft', 'pod_draft_id', 'pod', 'draft', 'id']);
  });

  it('hashes tokens deterministically into a sorted sparse vector with sub-linear weights', () => {
    expect(fnv1a('pod')).toBe(fnv1a('pod'));
    const v = sparseVector('pod pod pod venue');
    expect(v.indices).toEqual([...v.indices].sort((a, b) => a - b));
    const podWeight = v.values[v.indices.indexOf(fnv1a('pod'))];
    expect(podWeight).toBeCloseTo(1 + Math.log(3));
    expect(v.values[v.indices.indexOf(fnv1a('venue'))]).toBe(1);
  });

  it('gives an empty vector for text with no searchable words', () => {
    expect(sparseVector('a the of !!')).toEqual({ indices: [], values: [] });
  });
});

describe('chunking', () => {
  const opts = { chars: 120, overlap: 20 };

  it('keeps short text as one chunk and never emits an overlap-only chunk', () => {
    expect(chunkText('Hello world.', opts)).toEqual([{ index: 0, text: 'Hello world.' }]);
    const chunks = chunkText(Array.from({ length: 6 }, (_, i) => `Paragraph ${i} ${'word '.repeat(10)}`).join('\n\n'), opts);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => expect(c.index).toBe(i));
    expect(chunks.every((c) => c.text.length <= opts.chars + 80)).toBe(true);
  });

  it('splits a very long sentence instead of dropping it', () => {
    const chunks = chunkText('x'.repeat(400), opts);
    expect(chunks.map((c) => c.text).join('')).toContain('x'.repeat(100));
  });

  it('carries page numbers through and numbers chunks across pages', () => {
    const chunks = chunkPages([{ page: 1, text: 'First page.' }, { page: 2, text: 'Second page.' }], opts);
    expect(chunks).toEqual([{ index: 0, text: 'First page.', page: 1 }, { index: 1, text: 'Second page.', page: 2 }]);
  });

  it('cuts code on lines and records the line range of each chunk', () => {
    const source = Array.from({ length: 200 }, (_, i) => `const line${i} = ${i};`).join('\n');
    const chunks = chunkCode(source, { chars: 600, overlap: 100 });
    expect(chunks[0]).toMatchObject({ line_start: 1 });
    expect(chunks.at(-1)?.line_end).toBe(200);
    expect(chunks[1]?.line_start).toBeLessThanOrEqual(chunks[0]?.line_end ?? 0);
  });

  it('returns nothing for empty text', () => {
    expect(chunkText('  \n\n ', opts)).toEqual([]);
  });
});

describe('ids, keys and hashes', () => {
  it('makes the same UUID-shaped point id for the same chunk, and different ids otherwise', () => {
    const a = pointId('GITHUB:c1:repo:file.ts', 0);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(pointId('GITHUB:c1:repo:file.ts', 0)).toBe(a);
    expect(pointId('GITHUB:c1:repo:file.ts', 1)).not.toBe(a);
  });

  it('keys documents by source, connector and external id', () => {
    expect(documentKey({ source: 'SLACK', connector_id: 'c9', external_id: 'C1:thread:1.2' })).toBe('SLACK:c9:C1:thread:1.2');
  });

  it('changes the content hash when title or text change, and only then', () => {
    const doc = { source: 'MEDIA' as const, connector_id: 'media', external_id: '1', scope: 'SHARED' as const, title: 'A', text: 'body' };
    expect(contentHash(doc)).toBe(contentHash({ ...doc }));
    expect(contentHash({ ...doc, text: 'body2' })).not.toBe(contentHash(doc));
    expect(contentHash({ ...doc, title: 'B' })).not.toBe(contentHash(doc));
    expect(contentHash({ ...doc, pages: [{ page: 1, text: 'body' }], text: undefined })).toBe(contentHash(doc));
  });

  it('keeps staging, production and shared data in separate collections', () => {
    expect(new Set([collectionOf('STAGING'), collectionOf('PRODUCTION'), collectionOf('SHARED')]).size).toBe(3);
  });
});

describe('search filters and fusion', () => {
  it('lets employees see team files and their own private files only', () => {
    expect(visibilityFilter('u1', 'EMPLOYEE')).toEqual([
      { key: 'visibility', match: { value: 'TEAM' } },
      { must: [{ key: 'visibility', match: { value: 'PRIVATE' } }, { key: 'owner_id', match: { value: 'u1' } }] },
    ]);
    expect(visibilityFilter('u1', 'ADMIN')).toHaveLength(3);
  });

  it('restricts results to the turn’s sources', () => {
    expect(buildFilter(['GITHUB', 'MEDIA'], 'u1', 'EMPLOYEE').must).toEqual([{ key: 'source', match: { any: ['GITHUB', 'MEDIA'] } }]);
  });

  it('merges scopes by score, keeps the best-scoring copy of a chunk and numbers refs', () => {
    const p = (key: string, chunk: number, score: number) => ({ id: `${key}${chunk}`, score, payload: { document_key: key, chunk, title: key, text: `t${chunk}`, source: 'GITHUB', environment: 'STAGING', page: 3 } });
    const hits = mergeHits([[p('a', 0, 0.4), p('b', 0, 0.9)], [p('a', 0, 0.5), p('c', 1, 0.7)]], 3);
    expect(hits.map((h) => [h.ref, h.document_key, h.score])).toEqual([['S1', 'b', 0.9], ['S2', 'c', 0.7], ['S3', 'a', 0.5]]);
    expect(hits[0]).toMatchObject({ page: 3, line_start: null });
  });
});

describe('GitHub file selection and tarballs', () => {
  it('indexes docs and code, never vendored, generated, lock or binary files', () => {
    expect(fileKind('README.md')).toBe('doc');
    expect(fileKind('server/src/index.ts')).toBe('code');
    expect(fileKind('node_modules/x/index.js')).toBeNull();
    expect(fileKind('pnpm-lock.yaml')).toBeNull();
    expect(fileKind('dist/app.min.js')).toBeNull();
    expect(fileKind('assets/logo.png')).toBeNull();
    expect(stripRoot('owner-repo-abc123/server/src/a.ts')).toBe('server/src/a.ts');
    expect(looksBinary(Buffer.from([0x50, 0, 0x4b]))).toBe(true);
    expect(looksBinary(Buffer.from('plain text'))).toBe(false);
  });

  const header = (name: string, size: number, type = '0') => {
    const h = Buffer.alloc(512);
    h.write(name, 0, 'utf8');
    h.write(size.toString(8).padStart(11, '0'), 124, 'utf8');
    h.write(type, 156, 'utf8');
    return h;
  };
  const body = (data: Buffer) => Buffer.concat([data, Buffer.alloc((512 - (data.length % 512)) % 512)]);

  it('reads entries across arbitrary chunk boundaries, honouring pax paths and skipping big files', () => {
    const pax = Buffer.from('30 path=root/very/long/name.ts\n');
    const archive = Buffer.concat([
      header('pax', pax.length, 'x'), body(pax),
      header('short.ts', 5), body(Buffer.from('hello')),
      header('root/a.md', 3), body(Buffer.from('doc')),
      header('root/big.bin', 2000), body(Buffer.alloc(2000, 1)),
      Buffer.alloc(1024),
    ]);
    const entries: TarEntry[] = [];
    const reader = new TarReader(1000, (e) => entries.push(e));
    for (let i = 0; i < archive.length; i += 333) reader.push(archive.subarray(i, i + 333));
    expect(entries.map((e) => [e.path, e.data.toString()])).toEqual([['root/very/long/name.ts', 'hello'], ['root/a.md', 'doc']]);
    expect(gzipSync(archive).length).toBeGreaterThan(0);
  });
});
