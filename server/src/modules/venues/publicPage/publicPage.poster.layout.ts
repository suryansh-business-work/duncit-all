import { PDF_PALETTE } from '@services/pdf/document';

/**
 * The poster's measurements, colours and the arithmetic that has no drawing in
 * it — everything a designer would change lives in this one file.
 *
 * Points throughout (A4 is 595.28 x 841.89 pt; 1 mm = 2.835 pt). The page is
 * laid out for an office printer: a 14 mm margin no non-borderless printer
 * clips, white paper for most of the sheet, and the brand red spent in one
 * place — the scan panel — instead of flooding the page with toner.
 */
export const POSTER_COLORS = {
  // light.brand in @duncit/auth-tokens: the red of the wordmark itself.
  brand: '#f82c2e',
  // brand.50 / brand.100 / brand.200: the photo-less hero and its rings.
  tint: '#fff1f1',
  tintRing: '#ffe1e1',
  tintMark: '#ffc7c7',
  ink: PDF_PALETTE.ink,
  // neutral.600 — one step darker than the shared muted, so a draft-mode
  // greyscale print still shows the locality line.
  muted: '#4b5563',
  line: PDF_PALETTE.line,
  paper: PDF_PALETTE.paper,
  // A scanner wants the darkest dark the printer has.
  qr: '#000000',
} as const;

/** Width over height of the trimmed wordmark PNGs in services/_assets. */
export const WORDMARK_RATIO = 979 / 264;

export const POSTER = {
  margin: 40,
  brand: { height: 30, ruleGap: 18 },
  hero: { top: 90, radius: 20 },
  title: {
    gapAbove: 26,
    barWidth: 44,
    barHeight: 5,
    barGap: 14,
    max: 54,
    min: 26,
    lines: 2,
    lineGap: -0.12,
    subtitleGap: 6,
    subtitleSize: 14.5,
    subtitleLines: 2,
    gapBelow: 26,
  },
  panel: {
    top: 506,
    height: 256,
    radius: 24,
    padX: 30,
    padY: 28,
    card: 212,
    cardInset: 22,
    cardRadius: 14,
    columnGap: 28,
    icon: 26,
    iconGap: 16,
    headlineMax: 30,
    headlineMin: 17,
    headlineLines: 5,
    headlineLineGap: -0.1,
    pillHeight: 30,
    pillPadX: 14,
    pillGap: 14,
    urlMax: 12.5,
    urlMin: 8,
  },
  footer: { top: 784, height: 18, size: 12.5, markHeight: 17 },
} as const;

/** The ISO 18004 quiet zone: four modules of white on every side. */
export const QR_QUIET_MODULES = 4;

/**
 * The largest size from `max` down to `min` that `fits`, stepping by `step`.
 *
 * Falls back to `min` when nothing fits — the caller then lets the text clip
 * with an ellipsis, which is the honest outcome for a name no size can hold.
 */
export function fitFontSize(
  max: number,
  min: number,
  fits: (size: number) => boolean,
  step = 1,
): number {
  for (let size = max; size > min; size -= step) {
    if (fits(size)) return size;
  }
  return min;
}

/** The link as a person would type it: no scheme, no trailing slash. */
export function displayUrl(url: string): string {
  let shown = url.trim();
  const lower = shown.toLowerCase();
  if (lower.startsWith('https://')) shown = shown.slice(8);
  else if (lower.startsWith('http://')) shown = shown.slice(7);
  return shown.endsWith('/') ? shown.slice(0, -1) : shown;
}

/** The letter the photo-less hero shows: the first letter or digit of the name. */
export function monogram(title: string): string {
  const first = Array.from(title.trim()).find((char) => /[\p{L}\p{N}]/u.test(char));
  return first ? first.toLocaleUpperCase() : '';
}

export interface QrRun {
  row: number;
  col: number;
  length: number;
}

/**
 * The dark modules of a QR symbol as horizontal runs.
 *
 * The code is drawn as vector rectangles so it stays razor-sharp at any print
 * size; merging neighbours in a row cuts the rectangle count to roughly a
 * third and leaves no hairline seams between adjacent modules.
 */
export function qrRuns(size: number, data: ArrayLike<number>): QrRun[] {
  const runs: QrRun[] = [];
  for (let row = 0; row < size; row += 1) {
    let start = -1;
    for (let col = 0; col <= size; col += 1) {
      const dark = col < size && Boolean(data[row * size + col]);
      if (dark && start === -1) start = col;
      if (!dark && start !== -1) {
        runs.push({ row, col: start, length: col - start });
        start = -1;
      }
    }
  }
  return runs;
}
