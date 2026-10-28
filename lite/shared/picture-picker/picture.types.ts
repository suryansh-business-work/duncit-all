import type { PictureOrientation } from './picture.graphql';

/** Where the picture is shown: a wide cover, a square event cover, or a small avatar. */
export type PictureShape = 'cover' | 'square' | 'avatar';

interface ShapeSpec {
  /** The preview's intrinsic size, so the box is reserved before the bytes arrive. */
  width: number;
  height: number;
  /** The widest the preview grows to. */
  max: number;
  /** The aspect ratio the drop zone recommends. */
  ratio: string;
  /** The stock photo shape a search starts on. */
  orientation: PictureOrientation;
}

export const SHAPES: Record<PictureShape, ShapeSpec> = {
  cover: { width: 640, height: 360, max: 480, ratio: '16:9', orientation: 'LANDSCAPE' },
  square: { width: 640, height: 640, max: 420, ratio: '1:1', orientation: 'SQUARE' },
  avatar: { width: 160, height: 160, max: 160, ratio: '1:1', orientation: 'SQUARE' },
};

/** The formats the upload route takes; anything else is refused before it is sent. */
export const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export const BYTES_PER_MB = 1024 * 1024;

/** What the left-hand list points at: Pexels' picks, the host's earlier covers, a topic, or the search box. */
export type PictureSource = { kind: 'featured' } | { kind: 'previous' } | { kind: 'topic'; topic: string } | { kind: 'search'; query: string };

export const FEATURED: PictureSource = { kind: 'featured' };
export const PREVIOUS: PictureSource = { kind: 'previous' };

/** The Pexels query a source runs, or null when it is not a Pexels list. */
export function queryOf(source: PictureSource): string | null {
  if (source.kind === 'topic') return source.topic;
  if (source.kind === 'search') return source.query;
  return source.kind === 'featured' ? '' : null;
}

/** One tile in the results grid, whatever it came from. */
export interface PictureTile {
  id: string;
  src: string;
  alt: string;
  /** Painted while the thumbnail loads. */
  color?: string | null;
  /** The credit under the tile, e.g. the photographer. */
  caption?: string;
}
