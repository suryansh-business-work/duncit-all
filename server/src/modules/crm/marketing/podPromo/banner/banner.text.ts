/**
 * Fitting words into a box: wrap at spaces, break a word longer than the line,
 * end a cut-short block with an ellipsis, and shrink a title until it fits.
 * The measuring function is passed in, so this is plain arithmetic a test can
 * drive with a fake font.
 */
export type Measure = (text: string, size: number) => number;

const ELLIPSIS = '…';

/** One word too wide for a line, cut into pieces that each fit. */
function breakWord(word: string, size: number, maxWidth: number, measure: Measure): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const char of word) {
    if (current && measure(current + char, size) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/** The longest prefix of `line` that fits with an ellipsis after it. */
function withEllipsis(line: string, size: number, maxWidth: number, measure: Measure): string {
  let text = line.trimEnd();
  while (text && measure(text + ELLIPSIS, size) > maxWidth) text = [...text].slice(0, -1).join('').trimEnd();
  return text + ELLIPSIS;
}

/** Every line the text needs at this size, with no limit on how many. */
function allLines(text: string, size: number, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = [];
  let current = '';
  const words = text.replaceAll(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  for (const word of words) {
    const pieces = measure(word, size) > maxWidth ? breakWord(word, size, maxWidth, measure) : [word];
    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (current && measure(candidate, size) > maxWidth) {
        lines.push(current);
        current = piece;
      } else {
        current = candidate;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface WrapResult {
  lines: string[];
  /** True when text was dropped to stay within maxLines. */
  truncated: boolean;
}

/** Wrap into at most `maxLines`; the last kept line ends in an ellipsis when text was dropped. */
export function wrapLines(text: string, size: number, maxWidth: number, maxLines: number, measure: Measure): WrapResult {
  const lines = allLines(text, size, maxWidth, measure);
  if (lines.length <= maxLines) return { lines, truncated: false };
  const kept = lines.slice(0, Math.max(1, maxLines));
  kept[kept.length - 1] = withEllipsis(`${kept.at(-1)} ${lines[kept.length]}`, size, maxWidth, measure);
  return { lines: kept, truncated: true };
}

export interface FitResult extends WrapResult {
  size: number;
}

/**
 * The largest size from `maxSize` down to `minSize` (in steps) at which the
 * text fits in `maxLines`; at the floor it is wrapped and cut with an ellipsis.
 */
export function fitText(text: string, opts: { maxSize: number; minSize: number; maxWidth: number; maxLines: number; measure: Measure }): FitResult {
  const step = Math.max(2, Math.round((opts.maxSize - opts.minSize) / 8));
  for (let size = opts.maxSize; size > opts.minSize; size -= step) {
    const result = wrapLines(text, size, opts.maxWidth, opts.maxLines, opts.measure);
    if (!result.truncated) return { ...result, size };
  }
  return { ...wrapLines(text, opts.minSize, opts.maxWidth, opts.maxLines, opts.measure), size: opts.minSize };
}

/** Text made safe for an SVG/XML attribute or text node. */
export function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
