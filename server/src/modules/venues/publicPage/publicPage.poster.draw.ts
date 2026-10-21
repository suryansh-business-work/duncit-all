import { attempt, drawWordmark, type PosterFonts } from './publicPage.poster.assets';
import {
  POSTER,
  POSTER_COLORS,
  WORDMARK_RATIO,
  fitFontSize,
  monogram,
} from './publicPage.poster.layout';

/** Everything above the scan panel and below it: brand row, photo, name, sign-off. */
type Doc = PDFKit.PDFDocument;

export interface TextSpec {
  max: number;
  min: number;
  lines: number;
  /** Extra leading as a fraction of the font size (negative tightens). */
  lineGap: number;
  /** A ceiling in points, for a box that is bounded by height rather than lines. */
  maxHeight?: number;
}

export interface FittedText {
  size: number;
  lineGap: number;
  /** What the text occupies on the page. */
  height: number;
  /** What to hand pdfkit as the box height so it clips on exactly the last line. */
  clip: number;
}

/**
 * The size at which `text` sits inside `width` in at most `spec.lines` lines,
 * and the height it then takes. A name too long even at the smallest size
 * keeps the full line allowance and is clipped with an ellipsis when written.
 */
export function fitText(doc: Doc, font: string, text: string, width: number, spec: TextSpec): FittedText {
  doc.font(font);
  const measure = (size: number) => {
    const lineGap = size * spec.lineGap;
    const line = doc.fontSize(size).currentLineHeight(true) + lineGap;
    const lines = Math.round(doc.heightOfString(text, { width, lineGap }) / line);
    const allowed = Math.min(spec.lines, Math.floor((spec.maxHeight ?? Infinity) / line));
    return { lineGap, line, lines, allowed: Math.max(1, allowed) };
  };
  const size = fitFontSize(spec.max, spec.min, (candidate) => {
    const { lines, allowed } = measure(candidate);
    return lines <= allowed;
  });
  const { lineGap, line, lines, allowed } = measure(size);
  const shown = Math.max(1, Math.min(lines, allowed));
  // pdfkit ends a box with an ellipsis once two bare line heights no longer
  // fit below the cursor, so the box is sized to trip that on the last line —
  // a plain "lines x leading" box would trip a line early under tight leading.
  const clip = (shown - 2) * line + 2 * (line - lineGap) + 0.5;
  return { size, lineGap, height: shown * line, clip };
}

export function writeText(
  doc: Doc,
  font: string,
  color: string,
  text: string,
  at: { x: number; y: number; width: number },
  fitted: FittedText,
): void {
  doc
    .font(font)
    .fontSize(fitted.size)
    .fillColor(color)
    .text(text, at.x, at.y, {
      width: at.width,
      height: fitted.clip,
      lineGap: fitted.lineGap,
      ellipsis: true,
    });
}

/** The wordmark, top left, with a hairline carrying it across the sheet. */
export function drawBrandRow(doc: Doc): void {
  const { margin, brand } = POSTER;
  drawWordmark(doc, margin, margin, brand.height);
  const ruleY = margin + brand.height * 0.64;
  doc
    .moveTo(margin + brand.height * WORDMARK_RATIO + brand.ruleGap, ruleY)
    .lineTo(doc.page.width - margin, ruleY)
    .lineWidth(1)
    .strokeColor(POSTER_COLORS.line)
    .stroke();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The hero without a photo: a soft brand field, rings, and the name's initial. */
function drawHeroFallback(doc: Doc, box: Box, title: string, fonts: PosterFonts): void {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  doc.rect(box.x, box.y, box.width, box.height).fill(POSTER_COLORS.tint);
  const ringScales = [1.5, 1.08, 0.66];
  for (const [i, scale] of ringScales.entries()) {
    doc
      .circle(cx, cy, box.height * scale)
      .lineWidth(box.height * 0.11)
      .strokeColor(i === ringScales.length - 1 ? POSTER_COLORS.tintMark : POSTER_COLORS.tintRing)
      .stroke();
  }
  const letter = monogram(title);
  if (!letter) return;
  const disc = box.height * 0.3;
  doc.circle(cx, cy, disc).fill(POSTER_COLORS.paper);
  const size = disc * 1.15;
  doc.font(fonts.bold).fontSize(size).fillColor(POSTER_COLORS.brand);
  doc.text(letter, cx - disc, cy - doc.currentLineHeight(true) / 2, {
    width: disc * 2,
    align: 'center',
    lineBreak: false,
  });
}

/** The photo, cropped to a rounded frame — or the designed fallback when there is none. */
export function drawHero(
  doc: Doc,
  box: Box,
  image: Buffer | null,
  title: string,
  fonts: PosterFonts,
): void {
  doc.save();
  doc.roundedRect(box.x, box.y, box.width, box.height, POSTER.hero.radius).clip();
  const drawn =
    image !== null &&
    attempt(() =>
      doc.image(image, box.x, box.y, {
        cover: [box.width, box.height],
        align: 'center',
        valign: 'center',
      }),
    );
  if (!drawn) drawHeroFallback(doc, box, title, fonts);
  doc.restore();
}

export interface TitleBlock {
  title: FittedText | null;
  subtitle: FittedText | null;
  height: number;
}

/** Measured before anything is drawn: the photo takes whatever the name leaves. */
export function measureTitle(
  doc: Doc,
  fonts: PosterFonts,
  title: string,
  subtitle: string | null,
  width: number,
): TitleBlock {
  const spec = POSTER.title;
  const fittedTitle = title ? fitText(doc, fonts.bold, title, width, spec) : null;
  const fittedSubtitle = subtitle
    ? fitText(doc, fonts.medium, subtitle, width, {
        max: spec.subtitleSize,
        min: spec.subtitleSize,
        lines: spec.subtitleLines,
        lineGap: 0,
      })
    : null;
  const height =
    spec.barHeight +
    spec.barGap +
    (fittedTitle?.height ?? 0) +
    (fittedSubtitle ? spec.subtitleGap + fittedSubtitle.height : 0);
  return { title: fittedTitle, subtitle: fittedSubtitle, height };
}

/** A short brand bar, the name, and the locality (or handle) under it. */
export function drawTitle(
  doc: Doc,
  fonts: PosterFonts,
  block: TitleBlock,
  text: { title: string; subtitle: string | null },
  at: { x: number; y: number; width: number },
): void {
  const spec = POSTER.title;
  doc
    .roundedRect(at.x, at.y, spec.barWidth, spec.barHeight, spec.barHeight / 2)
    .fill(POSTER_COLORS.brand);
  let y = at.y + spec.barHeight + spec.barGap;
  if (block.title) {
    writeText(doc, fonts.bold, POSTER_COLORS.ink, text.title, { ...at, y }, block.title);
    y += block.title.height;
  }
  if (block.subtitle && text.subtitle) {
    y += spec.subtitleGap;
    writeText(doc, fonts.medium, POSTER_COLORS.muted, text.subtitle, { ...at, y }, block.subtitle);
  }
}

/** The sign-off line, with the wordmark closing the sheet on the right. */
export function drawFooter(doc: Doc, fonts: PosterFonts, footer: string): void {
  const { margin, footer: spec } = POSTER;
  const markWidth = spec.markHeight * WORDMARK_RATIO;
  const right = doc.page.width - margin;
  drawWordmark(doc, right - markWidth, spec.top + (spec.height - spec.markHeight) / 2, spec.markHeight);
  doc.font(fonts.medium).fontSize(spec.size).fillColor(POSTER_COLORS.ink);
  const line = doc.currentLineHeight(true);
  doc.text(footer, margin, spec.top + (spec.height - line) / 2, {
    width: right - markWidth - 16 - margin,
    height: line + 1,
    ellipsis: true,
  });
}
