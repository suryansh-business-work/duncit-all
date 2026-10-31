/** The timeline's drawing units. Zoom is pixels per second of reel. */

export const MIN_ZOOM = 30;
export const MAX_ZOOM = 240;
export const DEFAULT_ZOOM = 80;

/** The track-name column on the left. */
export const LABEL_WIDTH = 96;
export const RULER_HEIGHT = 28;
export const SCENE_ROW_HEIGHT = 56;
export const ITEM_ROW_HEIGHT = 26;
/** Room after the last scene, so its end can be dragged out and the playhead reach it. */
export const END_PADDING_PX = 160;

export const msToPx = (ms: number, zoom: number): number => (ms / 1000) * zoom;
export const pxToMs = (px: number, zoom: number): number => Math.round((px / zoom) * 1000);

/** Seconds between ruler labels — the smallest step that keeps labels at least 64px apart. */
export function tickSeconds(zoom: number): number {
  return [1, 2, 5, 10, 15, 30, 60].find((step) => step * zoom >= 64) ?? 60;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
