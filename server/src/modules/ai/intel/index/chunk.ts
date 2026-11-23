/**
 * Splits a document into overlapping chunks for embedding. Prose is cut on
 * paragraph and sentence boundaries; code is cut on lines so every chunk keeps
 * a line range a citation can point at; PDFs keep their page number.
 */

export interface Chunk {
  index: number;
  text: string;
  page?: number;
  line_start?: number;
  line_end?: number;
}

export interface ChunkOptions {
  chars: number;
  overlap: number;
}

const SENTENCE_END = /(?<=[.!?])\s+/;

function splitLong(piece: string, max: number): string[] {
  if (piece.length <= max) return [piece];
  const out: string[] = [];
  let current = '';
  for (const sentence of piece.split(SENTENCE_END)) {
    if ((current + ' ' + sentence).trim().length > max && current) {
      out.push(current.trim());
      current = '';
    }
    if (sentence.length > max) {
      for (let i = 0; i < sentence.length; i += max) out.push(sentence.slice(i, i + max));
    } else {
      current = `${current} ${sentence}`;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

export function chunkText(text: string, opts: ChunkOptions, page?: number, startIndex = 0): Chunk[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];
  const pieces = clean.split(/\n\s*\n/).flatMap((p) => splitLong(p.trim(), opts.chars));
  const chunks: Chunk[] = [];
  let current = '';
  // Whether `current` holds text no chunk has carried yet (not only the overlap tail).
  let fresh = false;
  const push = () => {
    chunks.push({ index: startIndex + chunks.length, text: current.trim(), ...(page === undefined ? {} : { page }) });
    current = opts.overlap > 0 ? current.slice(-opts.overlap) : '';
    fresh = false;
  };
  for (const piece of pieces) {
    if (fresh && current.length + piece.length + 2 > opts.chars) push();
    current = current ? `${current}\n\n${piece}` : piece;
    fresh = true;
  }
  if (fresh && current.trim()) push();
  return chunks;
}

export function chunkPages(pages: Array<{ page: number; text: string }>, opts: ChunkOptions): Chunk[] {
  const out: Chunk[] = [];
  for (const { page, text } of pages) out.push(...chunkText(text, opts, page, out.length));
  return out;
}

export function chunkCode(source: string, opts: ChunkOptions): Chunk[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const approxLineChars = Math.max(20, source.length / Math.max(lines.length, 1));
  const perChunk = Math.max(20, Math.floor(opts.chars / approxLineChars));
  const overlapLines = Math.min(Math.floor(perChunk / 3), Math.floor(opts.overlap / approxLineChars));
  const step = Math.max(1, perChunk - overlapLines);
  const chunks: Chunk[] = [];
  for (let start = 0; start < lines.length; start += step) {
    const slice = lines.slice(start, start + perChunk).join('\n').slice(0, opts.chars * 2);
    if (slice.trim()) chunks.push({ index: chunks.length, text: slice, line_start: start + 1, line_end: Math.min(lines.length, start + perChunk) });
    if (start + perChunk >= lines.length) break;
  }
  return chunks;
}
