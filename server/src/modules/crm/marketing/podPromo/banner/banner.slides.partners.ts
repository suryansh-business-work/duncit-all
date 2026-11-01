import { M, brandLogo, footer, panelRadius, roomFor, startCanvas, type ImageSlot, type SlideContext, type SlidePlan } from './banner.layout';

/**
 * The people and the place: "Meet your host" and "The venue". Each is left
 * out when there is nothing to show — a pod with no venue (a virtual pod, a
 * park) has no venue slide, rather than an empty one.
 */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => [...part][0]?.toLocaleUpperCase() ?? '')
    .join('');

export function hostSlide(ctx: SlideContext): SlidePlan | null {
  const { width: W, height: H, family, palette, copy } = ctx;
  if (!copy.host_name) return null;
  const canvas = startCanvas(ctx, false);
  const inner = W - 2 * M;
  let y = canvas.text({ text: copy.host_heading, role: family.title_font, size: 72, minSize: 52, x: M, y: M + 100, width: inner, maxLines: 1, fill: palette.accent, align: 'center', upper: family.upper_title });
  const d = H > W ? 480 : 360;
  const top = y + 40;
  const cx = W / 2;
  // The ring behind the photo is what makes a plain selfie read as a portrait.
  canvas.circle(cx, top + d / 2, d / 2 + 16, palette.surface);
  const images: ImageSlot[] = [];
  if (ctx.has.host_photo) {
    images.push({ source: 'host_photo', x: cx - d / 2, y: top, w: d, h: d, shape: 'circle', fit: 'cover', layer: 'under' });
  } else {
    canvas.circle(cx, top + d / 2, d / 2, palette.accent);
    canvas.text({ text: initials(copy.host_name), role: family.title_font, size: d * 0.36, x: cx - d / 2, y: top + d * 0.32, width: d, maxLines: 1, fill: palette.accent_ink, align: 'center' });
  }
  y = canvas.text({ text: copy.host_name, role: family.title_font, size: 72, minSize: 48, x: M, y: top + d + 48, width: inner, maxLines: 2, fill: palette.ink, align: 'center', upper: family.upper_title });
  y = canvas.text({ text: copy.host_line, role: family.body_font, size: 36, x: M, y: y + 18, width: inner, maxLines: 3, fill: palette.muted, align: 'center', leading: 1.3 });
  if (ctx.has.host_logo && roomFor(y + 24, H - M - 60, 90)) {
    images.push({ source: 'host_logo', x: cx - 120, y: H - M - 150, w: 240, h: 90, shape: 'rect', fit: 'contain', layer: 'over' });
  } else {
    footer(canvas, ctx, palette.muted);
  }
  return { kind: 'HOST', background: palette.bg, svg: canvas.toString(), images: [...images, ...brandLogo(ctx)] };
}

export function venueSlide(ctx: SlideContext): SlidePlan | null {
  const { width: W, height: H, family, palette, copy } = ctx;
  if (!copy.venue_name) return null;
  const canvas = startCanvas(ctx, false);
  const inner = W - 2 * M;
  const images: ImageSlot[] = [];
  let y = M + 100;
  y = canvas.text({ text: copy.venue_heading, role: family.title_font, size: 64, minSize: 48, x: M, y, width: inner, maxLines: 1, fill: palette.accent, upper: family.upper_title });
  if (ctx.has.venue_photo) {
    const h = Math.round(H * (H > W ? 0.42 : 0.36));
    images.push({ source: 'venue_photo', x: M, y: y + 28, w: inner, h, shape: 'round', radius: panelRadius(family.radius), fit: 'cover', layer: 'under' });
    y += 28 + h;
  }
  y = canvas.text({ text: copy.venue_name, role: family.title_font, size: 68, minSize: 44, x: M, y: y + 36, width: inner, maxLines: H > W ? 2 : 1, fill: palette.ink, upper: family.upper_title });
  const lines = H > W ? 2 : 1;
  y = canvas.text({ text: copy.venue_address, role: family.body_font, size: 34, x: M, y: y + 14, width: inner, maxLines: lines, fill: palette.muted });
  canvas.text({ text: copy.venue_line, role: family.body_font, size: 32, x: M, y: y + 14, width: inner, maxLines: lines, fill: palette.ink, leading: 1.3 });
  if (ctx.has.venue_logo) {
    images.push({ source: 'venue_logo', x: W - M - 200, y: H - M - 110, w: 200, h: 90, shape: 'rect', fit: 'contain', layer: 'over' });
  } else {
    footer(canvas, ctx, palette.muted);
  }
  return { kind: 'VENUE', background: palette.bg, svg: canvas.toString(), images: [...images, ...brandLogo(ctx)] };
}
