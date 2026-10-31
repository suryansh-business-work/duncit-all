import type {
  ReelCorner,
  ReelFit,
  ReelMotion,
  ReelTextAnimation,
  ReelTextPosition,
  ReelTextStyle,
  ReelTransition,
} from '@duncit/gql-types';

/**
 * The copy key each option of the inspector's selects reads as. Written out
 * literally — the localization gate finds a key only by its literal text, so a
 * key composed from the value would ship unrendered. Typed by the generated
 * enums, so a value the server adds is a compile error here until it has a label.
 */

export const FIT_LABEL: Readonly<Record<ReelFit, string>> = {
  COVER: 'ai.reels.editor.fitCover',
  CONTAIN: 'ai.reels.editor.fitContain',
};

export const MOTION_LABEL: Readonly<Record<ReelMotion, string>> = {
  NONE: 'ai.reels.editor.motionNone',
  ZOOM_IN: 'ai.reels.editor.motionZoomIn',
  ZOOM_OUT: 'ai.reels.editor.motionZoomOut',
  PAN_LEFT: 'ai.reels.editor.motionPanLeft',
  PAN_RIGHT: 'ai.reels.editor.motionPanRight',
};

export const TRANSITION_LABEL: Readonly<Record<ReelTransition, string>> = {
  NONE: 'ai.reels.editor.transitionNone',
  FADE: 'ai.reels.editor.transitionFade',
  SLIDE: 'ai.reels.editor.transitionSlide',
  WIPE: 'ai.reels.editor.transitionWipe',
};

export const POSITION_LABEL: Readonly<Record<ReelTextPosition, string>> = {
  TOP: 'ai.reels.editor.positionTop',
  CENTER: 'ai.reels.editor.positionCenter',
  BOTTOM: 'ai.reels.editor.positionBottom',
};

export const STYLE_LABEL: Readonly<Record<ReelTextStyle, string>> = {
  TITLE: 'ai.reels.editor.styleTitle',
  SUBTITLE: 'ai.reels.editor.styleSubtitle',
  CAPTION: 'ai.reels.editor.styleCaption',
};

export const ANIMATION_LABEL: Readonly<Record<ReelTextAnimation, string>> = {
  NONE: 'ai.reels.editor.animationNone',
  FADE: 'ai.reels.editor.animationFade',
  POP: 'ai.reels.editor.animationPop',
  SLIDE_UP: 'ai.reels.editor.animationSlideUp',
  TYPEWRITER: 'ai.reels.editor.animationTypewriter',
};

export const CORNER_LABEL: Readonly<Record<ReelCorner, string>> = {
  TOP_LEFT: 'ai.reels.editor.cornerTopLeft',
  TOP_RIGHT: 'ai.reels.editor.cornerTopRight',
  BOTTOM_LEFT: 'ai.reels.editor.cornerBottomLeft',
  BOTTOM_RIGHT: 'ai.reels.editor.cornerBottomRight',
  CENTER: 'ai.reels.editor.cornerCenter',
};

/** A select's options, in the order the labels are written. */
export function optionsOf<T extends string>(
  labels: Readonly<Record<T, string>>,
  t: (key: string) => string
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: t(labels[value]) }));
}

/** The values a label map covers, as the non-empty tuple z.enum wants. */
export const valuesOf = <T extends string>(labels: Readonly<Record<T, string>>): [T, ...T[]] =>
  Object.keys(labels) as [T, ...T[]];
