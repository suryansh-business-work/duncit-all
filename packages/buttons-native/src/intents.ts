/**
 * The press recipe — the one place that says what "this control is being
 * touched right now" looks like across Duncit.
 *
 * Framework-free on purpose: the native app compiles a linked package from its
 * own source and cannot resolve `react`/`tamagui` from `packages/<name>/`, so
 * this half holds nothing but numbers and pure functions. `@duncit/buttons`
 * layers MUI onto exactly these values for mWeb and the portals, which is what
 * stops the two surfaces drifting (CLAUDE.md rule 27).
 */

/**
 * What is being pressed — never how it is painted. The intent decides how much
 * a control dims and compresses, because a 4% compression reads completely
 * differently on a 44px chip and on a 380px card.
 */
export type PressIntent =
  /** Filled call-to-action. Darkens its own fill instead of dimming. */
  | 'solid'
  /** Outlined, tonal and chip-sized controls, toggles. */
  | 'control'
  /** Text buttons and icon buttons — small targets carrying no fill. */
  | 'ghost'
  /** Cards, tiles and any large tappable block. */
  | 'surface'
  /** List rows, menu items, tabs, nav actions — full-width, never compresses. */
  | 'row'
  /** Inline text links. */
  | 'inline';

export interface PressRecipe {
  /** Opacity while held. `1` means the control does not dim. */
  opacity: number;
  /** Scale while held. `1` means the control does not compress. */
  scale: number;
  /**
   * Strength of the state layer a transparent control paints under the press.
   * `0` means none. Web-only: a translucent overlay needs a compositing model
   * React Native does not have, so native expresses the same beat as an
   * explicit pressed background on the components that carry one.
   */
  tint: number;
  /**
   * How far a control that carries its OWN fill darkens. `1` means unchanged.
   * Filled controls dim badly — dropping the opacity of a red button over a
   * white page makes it lighter, which reads as "going away", not "pressed".
   */
  brightness: number;
}

/**
 * The six intents.
 *
 * The opacities are not invented: they are the six values the native app had
 * already grown by hand (0.6 / 0.7 / 0.75 / 0.8 / 0.85 / 0.9, across 436 call
 * sites). Naming them rather than re-picking them means adopting the system is
 * visually identity-preserving — the only thing every call site gains is the
 * compression, which is the beat that was missing everywhere.
 */
export const PRESS: Readonly<Record<PressIntent, Readonly<PressRecipe>>> = Object.freeze({
  solid: Object.freeze({ opacity: 1, scale: 0.96, tint: 0, brightness: 0.92 }),
  control: Object.freeze({ opacity: 0.85, scale: 0.96, tint: 0.12, brightness: 1 }),
  ghost: Object.freeze({ opacity: 0.75, scale: 0.94, tint: 0.12, brightness: 1 }),
  surface: Object.freeze({ opacity: 0.9, scale: 0.985, tint: 0.06, brightness: 1 }),
  row: Object.freeze({ opacity: 0.7, scale: 1, tint: 0.1, brightness: 1 }),
  inline: Object.freeze({ opacity: 0.6, scale: 1, tint: 0, brightness: 1 }),
});

/** Every intent, in weight order — for docs, demos and exhaustiveness checks. */
export const PRESS_INTENTS: readonly PressIntent[] = Object.freeze([
  'solid',
  'control',
  'ghost',
  'surface',
  'row',
  'inline',
]);

/**
 * Press-down is instant and release eases back.
 *
 * Animating the press IN is the single thing that makes a touch UI feel
 * broken: the finger is already lifting by the time the control has finished
 * reacting. Only the release is allowed to take time.
 */
export const PRESS_RELEASE_MS = 160;

/** Opacity a disabled control sits at, on every surface. */
export const DISABLED_OPACITY = 0.45;

/** Minimum tappable edge (WCAG 2.5.5 / iOS HIG), in px/pt. */
export const TOUCH_TARGET = 44;
