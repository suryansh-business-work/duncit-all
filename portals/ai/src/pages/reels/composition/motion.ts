import type { CSSProperties } from 'react';
import { interpolate, spring } from 'remotion';
import type { ReelMotion, ReelTextAnimation } from '@duncit/gql-types';

/**
 * How things move in a reel — a scene's slow drift and a text's entrance.
 *
 * Only `opacity` and `transform` are animated. Both are drawn by the in-browser
 * renderer exactly as the player draws them, so what is previewed is what the
 * exported file shows; anything fancier is a difference waiting to be found
 * after the export.
 */

/** How far a zoom or a pan travels across a whole scene. */
const ZOOM = 0.15;
const PAN_PERCENT = 4;

/** A scene's drift at `progress` (0 at its first frame, 1 at its last). */
export function motionTransform(motion: ReelMotion, progress: number): string {
  switch (motion) {
    case 'ZOOM_IN':
      return `scale(${1 + ZOOM * progress})`;
    case 'ZOOM_OUT':
      return `scale(${1 + ZOOM * (1 - progress)})`;
    case 'PAN_LEFT':
      return pan(PAN_PERCENT - 2 * PAN_PERCENT * progress);
    case 'PAN_RIGHT':
      return pan(2 * PAN_PERCENT * progress - PAN_PERCENT);
    default:
      return 'none';
  }
}

/** A pan is drawn zoomed in, so the frame never slides off the picture's edge. */
function pan(offsetPercent: number): string {
  return [`scale(${1 + ZOOM})`, `translateX(${offsetPercent}%)`].join(' ');
}

/** How long a text takes to arrive. */
const ENTER_FRAMES = 12;
const SLIDE_PIXELS = 60;
const POP_FROM = 0.6;

/** A text's style `frame` frames after it appeared. */
export function entranceStyle(animation: ReelTextAnimation, frame: number, fps: number): CSSProperties {
  const progress = interpolate(frame, [0, ENTER_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
  switch (animation) {
    case 'FADE':
      return { opacity: progress };
    case 'SLIDE_UP':
      return { opacity: progress, transform: `translateY(${(1 - progress) * SLIDE_PIXELS}px)` };
    case 'POP': {
      const settle = spring({ frame, fps, config: { damping: 12 } });
      return { opacity: progress, transform: `scale(${POP_FROM + (1 - POP_FROM) * settle})` };
    }
    default:
      return {};
  }
}

/** Frames per character — fast enough that a caption is read, not waited for. */
const FRAMES_PER_CHARACTER = 1.5;

/** The part of `text` a typewriter has reached. Counted in code points, so an emoji is never cut in half. */
export function typedText(text: string, frame: number): string {
  const characters = Array.from(text);
  return characters.slice(0, Math.ceil(frame / FRAMES_PER_CHARACTER)).join('');
}
