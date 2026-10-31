import type { CSSProperties } from 'react';
import type { ReelCorner } from '../types';

/**
 * Where a picture pinned to a corner sits. The insets match the text bands, so
 * a logo never lands under the reel's own buttons — shared by scene overlays
 * and the brand watermark, which must agree on what "top right" means.
 */
export const CORNER: Readonly<Record<ReelCorner, CSSProperties>> = {
  TOP_LEFT: { top: '6%', left: '6%' },
  TOP_RIGHT: { top: '6%', right: '6%' },
  BOTTOM_LEFT: { bottom: '10%', left: '6%' },
  BOTTOM_RIGHT: { bottom: '10%', right: '6%' },
  CENTER: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
};
