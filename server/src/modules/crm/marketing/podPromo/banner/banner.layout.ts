import { SvgCanvas } from './banner.svg';
import { SLIDE_MARGIN, type BannerFamily, type BannerPalette } from './banner.theme';
import type { SlideCopy } from './banner.copy';
import type { SlideKind } from '../podPromo.types';

/**
 * What a slide is made of before any pixel is drawn: the vector overlay, and
 * the pictures that sit under or over it. The renderer (banner.render.ts)
 * fetches each picture once and composites the layers in order.
 */
export type ImageSource = 'photo' | 'venue_photo' | 'host_photo' | 'brand_logo' | 'venue_logo' | 'host_logo' | 'qr';

export interface ImageSlot {
  source: ImageSource;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'round' | 'circle';
  radius?: number;
  /** cover fills the box (cropped on the subject); contain fits inside it (logos, QR). */
  fit: 'cover' | 'contain';
  /** under: below the overlay (photos); over: above it (logos, the QR code). */
  layer: 'under' | 'over';
}

export interface SlidePlan {
  kind: SlideKind;
  background: string;
  svg: string;
  images: ImageSlot[];
}

/** Which pictures exist for this pod, so a plan never asks for one that is not there. */
export interface Available {
  photo: boolean;
  venue_photo: boolean;
  host_photo: boolean;
  brand_logo: boolean;
  venue_logo: boolean;
  host_logo: boolean;
}

export interface SlideContext {
  width: number;
  height: number;
  family: BannerFamily;
  palette: BannerPalette;
  copy: SlideCopy;
  has: Available;
}

export const M = SLIDE_MARGIN;
/** Height of the brand logo strip at the top of a slide. */
export const LOGO_H = 64;
export const LOGO_W = 240;

/** A fresh canvas with the family's background, or a darkened photo when the slide is full-bleed. */
export function startCanvas(ctx: SlideContext, fullPhoto: boolean): SvgCanvas {
  const canvas = new SvgCanvas(ctx.width, ctx.height);
  if (fullPhoto) {
    canvas.rect(0, 0, ctx.width, ctx.height, ctx.palette.scrim, { opacity: ctx.family.scrim_opacity });
    // Darker behind the title and date at the top, and behind the price row at the bottom.
    canvas.wash(0, ctx.height * 0.6, ctx.palette.scrim, 0.6, 0);
    canvas.wash(ctx.height * 0.45, ctx.height * 0.55, ctx.palette.scrim, 0, 0.85);
  }
  return canvas;
}

/** The Duncit logo, top-left, when the brand has one. */
export function brandLogo(ctx: SlideContext): ImageSlot[] {
  return ctx.has.brand_logo ? [{ source: 'brand_logo', x: M, y: M, w: LOGO_W, h: LOGO_H, shape: 'rect', fit: 'contain', layer: 'over' }] : [];
}

/** The small footer every inner slide carries: the pod's title and date, so a lone slide still says what it is for. */
export function footer(canvas: SvgCanvas, ctx: SlideContext, ink: string): void {
  canvas.text({
    text: `${ctx.copy.title} · ${ctx.copy.date}`,
    role: ctx.family.body_font,
    size: 28,
    x: M,
    y: ctx.height - M - 34,
    width: ctx.width - 2 * M,
    maxLines: 1,
    fill: ink,
  });
}

/** Photo panels keep soft corners however round a family pills are — a pill-shaped photo crops the subject. */
export const panelRadius = (radius: number) => Math.min(radius, 48);

/** Whether the vertical space between two lines is worth a picture. */
export const roomFor = (top: number, bottom: number, min = 200) => bottom - top >= min;
