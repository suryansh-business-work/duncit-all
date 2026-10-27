import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { mongo } from 'mongoose';
jest.mock('node:zlib', () => {
  const actual = jest.requireActual('node:zlib');
  return { ...actual, createGzip: jest.fn((...args: unknown[]) => actual.createGzip(...args)) };
});

import { ARCHIVE_VERSION, createArchiveWriter, readArchive, type ArchiveEntry } from '../../dbBackup.archive';

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-'));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const file = (name: string) => path.join(dir, name);
async function readAll(target: string): Promise<ArchiveEntry[]> {
  const out: ArchiveEntry[] = [];
  for await (const entry of readArchive(target)) out.push(entry);
  return out;
}

/** An archive built by hand from raw frames, for shapes the writer never produces. */
function rawArchive(target: string, frames: Array<Record<string, unknown>>, chunk?: number) {
  const buffers = frames.map((value) => {
    const body = mongo.BSON.serialize(value);
    const head = Buffer.alloc(4);
    head.writeUInt32LE(body.length, 0);
    return Buffer.concat([head, body]);
  });
  const gz = zlib.gzipSync(Buffer.concat(buffers));
  fs.writeFileSync(target, gz);
  return { chunk, size: gz.length };
}

describe('writing and reading back', () => {
  it('round-trips the header, every collection with its indexes, and every document in order', async () => {
    const target = file('roundtrip.dbk.gz');
    const created = new Date('2026-03-04T05:06:07.000Z');
    const writer = createArchiveWriter(target, 'duncit', created);
    await writer.startCollection('users', [{ key: { email: 1 }, name: 'email_1', unique: true }]);
    await writer.writeDocument({ _id: new mongo.ObjectId('64b0000000000000000000aa'), name: 'Asha', born: new Date('1990-01-01T00:00:00Z') });
    await writer.writeDocument({ _id: 2, tags: ['a', 'b'], nested: { n: 1 } });
    await writer.startCollection('pods', []);
    await writer.writeDocument({ _id: 'p1', title: 'Run' });
    await writer.finish();

    const entries = await readAll(target);
    expect(entries.map((e) => e.kind)).toEqual(['header', 'collection', 'document', 'document', 'collection', 'document']);
    expect(entries[0]).toEqual({ kind: 'header', header: { version: ARCHIVE_VERSION, database: 'duncit', created_at: created } });
    expect(entries[1]).toEqual({ kind: 'collection', name: 'users', indexes: [{ key: { email: 1 }, name: 'email_1', unique: true }] });
    expect(entries[2]).toMatchObject({ kind: 'document', doc: { name: 'Asha', born: new Date('1990-01-01T00:00:00Z') } });
    expect(entries[3]).toMatchObject({ doc: { _id: 2, tags: ['a', 'b'], nested: { n: 1 } } });
    expect(entries[4]).toEqual({ kind: 'collection', name: 'pods', indexes: [] });
    expect(entries[5]).toMatchObject({ doc: { _id: 'p1', title: 'Run' } });
  });

  it('counts the uncompressed bytes handed to the writer', async () => {
    const writer = createArchiveWriter(file('raw.dbk.gz'), 'd', new Date());
    const afterHeader = writer.rawBytes();
    expect(afterHeader).toBeGreaterThan(0);
    await writer.startCollection('c', []);
    await writer.writeDocument({ a: 1 });
    expect(writer.rawBytes()).toBeGreaterThan(afterHeader);
    await writer.finish();
  });

  it('waits for the compressor to drain when documents are written faster than it can take them', async () => {
    const target = file('big.dbk.gz');
    const writer = createArchiveWriter(target, 'd', new Date());
    await writer.startCollection('big', []);
    // Incompressible payloads fill the stream's buffer, so some writes must await a drain.
    for (let i = 0; i < 60; i += 1) await writer.writeDocument({ _id: i, blob: new mongo.Binary(Buffer.alloc(300_000, i + 1)) });
    await writer.finish();
    const entries = await readAll(target);
    expect(entries.filter((e) => e.kind === 'document')).toHaveLength(60);
  });

  it('reads an archive that arrives in many small chunks, frames split anywhere', async () => {
    const target = file('chunked.dbk.gz');
    const writer = createArchiveWriter(target, 'd', new Date());
    await writer.startCollection('c', []);
    for (let i = 0; i < 400; i += 1) await writer.writeDocument({ _id: i, text: `row-${i}`.repeat(50) });
    await writer.finish();
    const entries = await readAll(target);
    expect(entries.filter((e) => e.kind === 'document')).toHaveLength(400);
  });
});

describe('abort and failure', () => {
  it('removes a half-written archive on abort', async () => {
    const target = file('aborted.dbk.gz');
    const writer = createArchiveWriter(target, 'd', new Date());
    await writer.startCollection('c', []);
    await writer.abort();
    expect(fs.existsSync(target)).toBe(false);
  });

  it('does not mind aborting when the file is already gone', async () => {
    const target = file('gone.dbk.gz');
    const writer = createArchiveWriter(target, 'd', new Date());
    await writer.startCollection('c', []);
    const done = writer.abort();
    await expect(done).resolves.toBeUndefined();
    await expect(writer.abort()).resolves.toBeUndefined();
  });

  it('fails the backup when the disk cannot be written, instead of leaving a truncated archive', async () => {
    const writer = createArchiveWriter(path.join(dir, 'no-such-dir', 'x.dbk.gz'), 'd', new Date());
    await expect(writer.finish()).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('a compressor failure', () => {
  it('is turned into a failure of the file, so finishing the backup reports it instead of waiting forever', async () => {
    const actual = jest.requireActual('node:zlib') as typeof zlib;
    let captured: zlib.Gzip | null = null;
    (zlib.createGzip as unknown as jest.Mock).mockImplementationOnce((...args: unknown[]) => {
      captured = (actual.createGzip as (...a: unknown[]) => zlib.Gzip)(...args);
      return captured;
    });
    const writer = createArchiveWriter(file('zlibfail.dbk.gz'), 'd', new Date());
    (captured as unknown as zlib.Gzip).emit('error', new Error('zlib broke'));
    await expect(writer.finish()).rejects.toThrow('zlib broke');
  });
});

describe('readArchive on shapes the writer never produces', () => {
  const read = async (frames: Array<Record<string, unknown>>) => {
    const target = file(`raw-${Math.random().toString(36).slice(2)}.dbk.gz`);
    rawArchive(target, frames);
    return readAll(target);
  };

  it('defaults a header that is missing its fields', async () => {
    const [entry] = await read([{ k: 'header' }]);
    expect(entry).toEqual({ kind: 'header', header: { version: 0, database: '', created_at: new Date(0) } });
  });

  it('defaults a collection frame that is missing its name or indexes', async () => {
    const [entry] = await read([{ k: 'coll' }]);
    expect(entry).toEqual({ kind: 'collection', name: '', indexes: [] });
  });

  it('skips frames it does not know', async () => {
    const entries = await read([{ k: 'header', v: 1, database: 'd', created_at: new Date() }, { k: 'mystery', x: 1 }, { k: 'doc', d: { a: 1 } }]);
    expect(entries.map((e) => e.kind)).toEqual(['header', 'document']);
  });

  it('reads nothing from an empty archive and ignores trailing bytes too short to be a frame', async () => {
    const empty = file('empty.dbk.gz');
    fs.writeFileSync(empty, zlib.gzipSync(Buffer.alloc(0)));
    await expect(readAll(empty)).resolves.toEqual([]);
    const tail = file('tail.dbk.gz');
    fs.writeFileSync(tail, zlib.gzipSync(Buffer.from([1, 2])));
    await expect(readAll(tail)).resolves.toEqual([]);
  });

  it('stops at a frame that was cut short', async () => {
    const target = file('cut.dbk.gz');
    const body = mongo.BSON.serialize({ k: 'doc', d: { a: 1 } });
    const head = Buffer.alloc(4);
    head.writeUInt32LE(body.length, 0);
    fs.writeFileSync(target, zlib.gzipSync(Buffer.concat([head, body.subarray(0, body.length - 3)])));
    await expect(readAll(target)).resolves.toEqual([]);
  });

  it('rejects a file that is not gzip', async () => {
    const target = file('plain.txt');
    fs.writeFileSync(target, 'not an archive');
    await expect(readAll(target)).rejects.toThrow();
  });
});
