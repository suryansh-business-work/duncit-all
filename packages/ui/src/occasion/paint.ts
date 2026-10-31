import { colorWithAlpha, type OccasionDrawOp, type OccasionVectorLayer } from '@duncit/utils';

/**
 * Paints the occasion engine's draw operations (`occasionFrame` in
 * @duncit/utils) onto a 2D canvas. The engine decides what goes where; this
 * file only knows how a canvas draws a path, a picture, a dot or a glow.
 */

/** Parsed paths and loading pictures, kept for the life of one canvas so no frame re-parses them. */
export interface PaintCache {
  paths: Map<string, Path2D>;
  images: Map<string, HTMLImageElement>;
  /** Called once a picture finishes loading — a still frame repaints to show it. */
  onImageReady: () => void;
}

export const createPaintCache = (onImageReady: () => void = () => undefined): PaintCache => ({
  paths: new Map(),
  images: new Map(),
  onImageReady,
});

function pathFor(cache: PaintCache, d: string): Path2D {
  const known = cache.paths.get(d);
  if (known) return known;
  const path = new Path2D(d);
  cache.paths.set(d, path);
  return path;
}

/** The picture once it has loaded; null while it is still on its way (or failed). */
function imageFor(cache: PaintCache, src: string): HTMLImageElement | null {
  let image = cache.images.get(src);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.onload = cache.onImageReady;
    image.src = src;
    cache.images.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

function fillAndStroke(ctx: CanvasRenderingContext2D, path: Path2D, piece: Pick<OccasionVectorLayer, 'fill' | 'stroke' | 'stroke_width'>) {
  if (piece.fill) {
    ctx.fillStyle = piece.fill;
    ctx.fill(path);
  }
  if (piece.stroke && piece.stroke_width > 0) {
    ctx.strokeStyle = piece.stroke;
    ctx.lineWidth = piece.stroke_width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  }
}

/**
 * Centre the next drawing on a box at (x, y) of w × h, turned and (for a
 * right-to-left flyer) mirrored, with a soft shadow beneath so it floats above
 * the page instead of lying on it.
 */
function placeBox(ctx: CanvasRenderingContext2D, op: { x: number; y: number; rotate: number; mirrored: boolean }, w: number, h: number) {
  ctx.translate(op.x + w / 2, op.y + h / 2);
  ctx.rotate(op.rotate);
  ctx.scale(op.mirrored ? -1 : 1, 1);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 10;
}

/** Paint one operation. `width` is the canvas's CSS width (a band fills it edge to edge). */
export function paintOp(ctx: CanvasRenderingContext2D, op: OccasionDrawOp, cache: PaintCache, width: number): void {
  ctx.save();
  switch (op.op) {
    case 'mark':
      ctx.globalAlpha = op.alpha;
      ctx.translate(op.x, op.y);
      ctx.rotate(op.rotate);
      ctx.scale(op.scale * op.flip, op.scale);
      ctx.translate(-op.ox, -op.oy);
      fillAndStroke(ctx, pathFor(cache, op.d), op);
      break;
    case 'art': {
      placeBox(ctx, op, op.width * op.scale, op.height * op.scale);
      ctx.scale(op.scale, op.scale);
      ctx.translate(-op.width / 2, -op.height / 2);
      for (const piece of op.layers) {
        ctx.save();
        ctx.translate(piece.x, piece.y);
        fillAndStroke(ctx, pathFor(cache, piece.path), piece);
        ctx.restore();
      }
      break;
    }
    case 'image': {
      const image = imageFor(cache, op.src);
      if (image) {
        const height = (op.width * image.naturalHeight) / image.naturalWidth;
        placeBox(ctx, op, op.width, height);
        ctx.drawImage(image, -op.width / 2, -height / 2, op.width, height);
      }
      break;
    }
    case 'dot':
      ctx.fillStyle = op.color;
      if (op.tail_x !== null && op.tail_y !== null) {
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.r * 1.1;
        ctx.lineCap = 'round';
        ctx.globalAlpha = op.alpha * 0.55;
        ctx.beginPath();
        ctx.moveTo(op.tail_x, op.tail_y);
        ctx.lineTo(op.x, op.y);
        ctx.stroke();
      }
      // A faint halo, so a spark glows rather than reading as a flat disc.
      ctx.globalAlpha = op.alpha * 0.25;
      ctx.beginPath();
      ctx.arc(op.x, op.y, op.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = op.alpha;
      ctx.beginPath();
      ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'radial': {
      const glow = ctx.createRadialGradient(op.x, op.y, 0, op.x, op.y, op.radius);
      glow.addColorStop(0, colorWithAlpha(op.color, op.inner_alpha));
      glow.addColorStop(op.inner_stop, colorWithAlpha(op.color, op.inner_alpha));
      glow.addColorStop(1, colorWithAlpha(op.color, op.outer_alpha));
      ctx.fillStyle = glow;
      ctx.fillRect(op.x - op.radius, op.y - op.radius, op.radius * 2, op.radius * 2);
      break;
    }
    case 'linear': {
      const band = ctx.createLinearGradient(0, op.y0, 0, op.y1);
      band.addColorStop(0, colorWithAlpha(op.color, op.top_alpha));
      band.addColorStop(1, colorWithAlpha(op.color, op.bottom_alpha));
      ctx.fillStyle = band;
      ctx.fillRect(0, op.y0, width, op.y1 - op.y0);
      break;
    }
  }
  ctx.restore();
}
