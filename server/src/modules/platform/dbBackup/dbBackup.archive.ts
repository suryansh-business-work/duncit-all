import fs from 'node:fs';
import zlib from 'node:zlib';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { mongo } from 'mongoose';

/**
 * The archive format a backup is written in, and the reader a restore uses.
 *
 * One gzip stream of length-prefixed BSON frames: a 4-byte little-endian length
 * followed by that many bytes of BSON. Framing rather than one giant document
 * because a database does not fit in BSON's 16 MB per-document ceiling, and
 * streaming rather than buffering because it must not have to fit in memory
 * either — both writer and reader touch one document at a time.
 *
 * Frames are ordered, and a `coll` frame switches the collection every `doc`
 * frame after it belongs to. That is what keeps the name off each document,
 * which on a collection of a million rows is the difference between a sensible
 * archive and a wasteful one.
 *
 * Documents go through BSON.serialize on the way out and BSON.deserialize on
 * the way back, the same round trip the driver itself performs on every write,
 * so what restores is what the cursor read.
 */

/** Bumped only if a frame's shape changes; the reader refuses what it cannot read. */
export const ARCHIVE_VERSION = 1;

const LENGTH_BYTES = 4;

type FrameKind = 'header' | 'coll' | 'doc';

interface Frame {
  k: FrameKind;
  [key: string]: unknown;
}

export interface ArchiveHeader {
  version: number;
  database: string;
  created_at: Date;
}

export type ArchiveEntry =
  | { kind: 'header'; header: ArchiveHeader }
  | { kind: 'collection'; name: string; indexes: mongo.Document[] }
  | { kind: 'document'; doc: mongo.Document };

/** Frame one BSON payload: its byte length, then the payload. */
function frame(value: Frame): Buffer {
  const body = mongo.BSON.serialize(value);
  const header = Buffer.allocUnsafe(LENGTH_BYTES);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export interface ArchiveWriter {
  /** Begin a collection. Every document written after this belongs to it. */
  startCollection(name: string, indexes: mongo.Document[]): Promise<void>;
  writeDocument(doc: mongo.Document): Promise<void>;
  /** Flush and close. Resolves once the bytes are on disk. */
  finish(): Promise<void>;
  /** Close and delete a half-written archive after a failure. */
  abort(): Promise<void>;
  /** Uncompressed bytes handed to the writer so far. */
  rawBytes(): number;
}

/**
 * Open an archive for writing. The gzip stream owns backpressure: a write that
 * fills the buffer is awaited, so a fast cursor cannot outrun a slow disk.
 */
export function createArchiveWriter(
  filePath: string,
  database: string,
  createdAt: Date,
): ArchiveWriter {
  const gzip = zlib.createGzip();
  const file = fs.createWriteStream(filePath);
  // A gzip failure does not travel through pipe(), so it is turned into a file
  // failure — otherwise the archive stream simply stops and `done` waits forever.
  gzip.on('error', (err) => file.destroy(err));
  // Held on an object rather than a bare `let`: the assignment happens inside a
  // callback, which narrowing does not see through.
  const failure: { error: Error | null } = { error: null };
  const done = finished(file).catch((err: Error) => {
    failure.error = err;
  });
  gzip.pipe(file);
  let raw = 0;

  const push = async (value: Frame): Promise<void> => {
    const chunk = frame(value);
    raw += chunk.length;
    if (!gzip.write(chunk)) await once(gzip, 'drain');
  };

  // Written straight out rather than through push(): it is the first thing in
  // the stream, it is far too small to need backpressure, and a floating
  // promise here would be a frame whose ordering nothing guarantees.
  const head = frame({ k: 'header', v: ARCHIVE_VERSION, database, created_at: createdAt });
  raw += head.length;
  gzip.write(head);

  return {
    startCollection: (name, indexes) => push({ k: 'coll', name, indexes }),
    writeDocument: (doc) => push({ k: 'doc', d: doc }),
    async finish() {
      gzip.end();
      await done;
      // A disk that filled up mid-copy must fail the backup, not quietly leave
      // a truncated archive that only fails the day someone restores it.
      if (failure.error) throw failure.error;
    },
    async abort() {
      gzip.end();
      await done;
      await fs.promises.unlink(filePath).catch(() => undefined);
    },
    rawBytes: () => raw,
  };
}

/** Turn one decoded frame into the entry a caller acts on, or null to skip it. */
function toEntry(value: Frame): ArchiveEntry | null {
  if (value.k === 'header') {
    return {
      kind: 'header',
      header: {
        version: Number(value.v ?? 0),
        database: String(value.database ?? ''),
        created_at: value.created_at instanceof Date ? value.created_at : new Date(0),
      },
    };
  }
  if (value.k === 'coll') {
    return {
      kind: 'collection',
      name: String(value.name ?? ''),
      indexes: Array.isArray(value.indexes) ? (value.indexes as mongo.Document[]) : [],
    };
  }
  if (value.k === 'doc') return { kind: 'document', doc: value.d as mongo.Document };
  return null;
}

/**
 * Pull every complete frame out of a rolling buffer.
 *
 * Returns what is left over as well as what it decoded: a gzip chunk boundary
 * falls wherever it likes, so the tail is almost always a partial frame that
 * the next chunk completes.
 */
function drainFrames(buffer: Buffer): { entries: ArchiveEntry[]; rest: Buffer } {
  const entries: ArchiveEntry[] = [];
  let offset = 0;
  while (buffer.length - offset >= LENGTH_BYTES) {
    const size = buffer.readUInt32LE(offset);
    if (buffer.length - offset - LENGTH_BYTES < size) break;
    const start = offset + LENGTH_BYTES;
    const value = mongo.BSON.deserialize(buffer.subarray(start, start + size)) as Frame;
    const entry = toEntry(value);
    if (entry) entries.push(entry);
    offset = start + size;
  }
  return { entries, rest: buffer.subarray(offset) };
}

/**
 * Read an archive back, one entry at a time. Yields the header first, then a
 * `collection` entry per collection followed by its documents.
 */
export async function* readArchive(filePath: string): AsyncGenerator<ArchiveEntry> {
  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  let buffer: Buffer = Buffer.alloc(0);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk as Buffer]);
    const { entries, rest } = drainFrames(buffer);
    buffer = rest;
    yield* entries;
  }
}
