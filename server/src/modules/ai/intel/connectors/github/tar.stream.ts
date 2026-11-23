/**
 * A streaming reader for (ustar / pax) tar archives — enough for GitHub's
 * source tarballs. Entries larger than `maxBytes` are skipped without being
 * held in memory, so a large repository never sits in RAM whole.
 */

export interface TarEntry {
  path: string;
  size: number;
  data: Buffer;
}

const BLOCK = 512;

const field = (header: Buffer, start: number, length: number) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '').trim();

function paxPath(data: Buffer): string | null {
  for (const record of data.toString('utf8').split('\n')) {
    const match = /^\d+ path=(.*)$/.exec(record);
    if (match?.[1]) return match[1];
  }
  return null;
}

export class TarReader {
  private buffer: Buffer = Buffer.alloc(0);
  private pending: { path: string; size: number; type: string; keep: boolean; padded: number; chunks: Buffer[]; got: number } | null = null;
  private nextPath: string | null = null;

  constructor(
    private readonly maxBytes: number,
    private readonly onEntry: (entry: TarEntry) => void
  ) {}

  push(chunk: Buffer): void {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    let progressed = true;
    while (progressed) progressed = this.pending ? this.readBody() : this.readHeader();
  }

  private readHeader(): boolean {
    if (this.buffer.length < BLOCK) return false;
    const header = this.buffer.subarray(0, BLOCK);
    this.buffer = this.buffer.subarray(BLOCK);
    if (header.every((b) => b === 0)) return true;
    const size = Number.parseInt(field(header, 124, 12) || '0', 8) || 0;
    const type = field(header, 156, 1) || '0';
    const prefix = field(header, 345, 155);
    const name = field(header, 0, 100);
    const path = this.nextPath ?? (prefix ? `${prefix}/${name}` : name);
    if (type !== 'x' && type !== 'g' && type !== 'L') this.nextPath = null;
    const meta = type === 'x' || type === 'L';
    this.pending = { path, size, type, keep: meta || (type === '0' && size <= this.maxBytes), padded: Math.ceil(size / BLOCK) * BLOCK, chunks: [], got: 0 };
    return true;
  }

  private readBody(): boolean {
    const p = this.pending;
    if (!p) return false;
    const take = Math.min(this.buffer.length, p.padded - p.got);
    if (take === 0 && p.padded > 0) return false;
    const slice = this.buffer.subarray(0, take);
    this.buffer = this.buffer.subarray(take);
    if (p.keep && p.got < p.size) p.chunks.push(slice.subarray(0, Math.max(0, Math.min(take, p.size - p.got))));
    p.got += take;
    if (p.got < p.padded) return false;
    this.pending = null;
    const data = Buffer.concat(p.chunks);
    if (p.type === 'x') this.nextPath = paxPath(data);
    else if (p.type === 'L') this.nextPath = data.toString('utf8').replace(/\0+$/, '');
    else if (p.keep) this.onEntry({ path: p.path, size: p.size, data });
    return true;
  }
}
