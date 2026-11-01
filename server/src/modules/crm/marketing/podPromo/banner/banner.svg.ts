import { capHeight, linePath, measure } from './banner.fonts';
import { escapeXml, fitText, wrapLines } from './banner.text';
import type { FontRole } from './banner.theme';

/**
 * A small SVG writer for one slide: shapes, washes and text drawn as outlines.
 * It returns the y where each block ended, so a slide stacks blocks top-down
 * without knowing in advance how many lines each took.
 */
export type Align = 'left' | 'center';

export interface TextBlock {
  text: string;
  role: FontRole;
  size: number;
  /** Shrink down to this before cutting with an ellipsis; defaults to `size`. */
  minSize?: number;
  x: number;
  /** Top of the block. */
  y: number;
  width: number;
  maxLines: number;
  fill: string;
  align?: Align;
  /** Line advance as a multiple of the size. */
  leading?: number;
  upper?: boolean;
}

const round = (n: number) => Math.round(n * 10) / 10;

export class SvgCanvas {
  private readonly parts: string[] = [];
  private readonly defs: string[] = [];
  private gradientCount = 0;

  constructor(
    readonly width: number,
    readonly height: number
  ) {}

  rect(x: number, y: number, w: number, h: number, fill: string, opts: { radius?: number; opacity?: number; stroke?: string; strokeWidth?: number } = {}): this {
    const r = Math.min(opts.radius ?? 0, w / 2, h / 2);
    const stroke = opts.stroke ? ` fill-opacity="0" stroke="${escapeXml(opts.stroke)}" stroke-width="${opts.strokeWidth ?? 4}"` : '';
    this.parts.push(
      `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(r)}" fill="${escapeXml(fill)}" opacity="${opts.opacity ?? 1}"${stroke}/>`
    );
    return this;
  }

  circle(cx: number, cy: number, r: number, fill: string, opacity = 1): this {
    this.parts.push(`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${escapeXml(fill)}" opacity="${opacity}"/>`);
    return this;
  }

  /** The list bullet: a filled disc with a tick drawn in it. */
  tick(cx: number, cy: number, r: number, fill: string, ink: string): this {
    this.circle(cx, cy, r, fill);
    const s = r * 0.5;
    const d = `M${round(cx - s)} ${round(cy)} L${round(cx - s * 0.25)} ${round(cy + s * 0.7)} L${round(cx + s)} ${round(cy - s * 0.6)}`;
    this.parts.push(`<path d="${d}" fill="none" stroke="${escapeXml(ink)}" stroke-width="${round(r * 0.28)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    return this;
  }

  /** A vertical wash from `from` opacity at the top to `to` at the bottom, over a band. */
  wash(y: number, h: number, color: string, from: number, to: number): this {
    this.gradientCount += 1;
    const id = `wash${this.gradientCount}`;
    this.defs.push(
      `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${escapeXml(color)}" stop-opacity="${from}"/><stop offset="1" stop-color="${escapeXml(color)}" stop-opacity="${to}"/></linearGradient>`
    );
    this.parts.push(`<rect x="0" y="${round(y)}" width="${this.width}" height="${round(h)}" fill="url(#${id})"/>`);
    return this;
  }

  /** Wrapped, fitted text; returns the y just below the last line. */
  text(block: TextBlock): number {
    const content = block.upper ? block.text.toLocaleUpperCase() : block.text;
    const leading = block.leading ?? 1.2;
    const measureAt = (value: string, size: number) => measure(value, block.role, size);
    const fitted =
      block.minSize && block.minSize < block.size
        ? fitText(content, { maxSize: block.size, minSize: block.minSize, maxWidth: block.width, maxLines: block.maxLines, measure: measureAt })
        : { ...wrapLines(content, block.size, block.width, block.maxLines, measureAt), size: block.size };
    const ascent = capHeight(block.role) * fitted.size;
    fitted.lines.forEach((line, index) => {
      const baseline = block.y + ascent + index * fitted.size * leading;
      const lineWidth = measureAt(line, fitted.size);
      const x = block.align === 'center' ? block.x + (block.width - lineWidth) / 2 : block.x;
      this.parts.push(`<path d="${linePath(line, block.role, fitted.size, x, baseline)}" fill="${escapeXml(block.fill)}"/>`);
    });
    if (fitted.lines.length === 0) return block.y;
    return block.y + ascent + (fitted.lines.length - 1) * fitted.size * leading + fitted.size * 0.35;
  }

  /** A rounded label; `x` is its left edge, its centre or its right edge by `align`. Returns its box. */
  pill(label: string, opts: { role: FontRole; size: number; x: number; y: number; fill: string; ink: string; radius: number; align?: Align | 'right'; padX?: number; maxWidth?: number }) {
    const padX = opts.padX ?? opts.size * 0.9;
    const padY = opts.size * 0.55;
    const maxText = (opts.maxWidth ?? this.width) - padX * 2;
    const [line = ''] = wrapLines(label, opts.size, maxText, 1, (value, size) => measure(value, opts.role, size)).lines;
    const textWidth = measure(line, opts.role, opts.size);
    const w = textWidth + padX * 2;
    const h = opts.size * capHeight(opts.role) + padY * 2;
    let left = opts.x;
    if (opts.align === 'center') left = opts.x - w / 2;
    else if (opts.align === 'right') left = opts.x - w;
    this.rect(left, opts.y, w, h, opts.fill, { radius: opts.radius });
    const baseline = opts.y + padY + opts.size * capHeight(opts.role);
    this.parts.push(`<path d="${linePath(line, opts.role, opts.size, left + padX, baseline)}" fill="${escapeXml(opts.ink)}"/>`);
    return { x: left, y: opts.y, w, h };
  }

  toString(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}"><defs>${this.defs.join('')}</defs>${this.parts.join('')}</svg>`;
  }
}
