/** How a dialog is anchored on screen. */
export type DuncitDialogVariant =
  /** Bottom-anchored sheet — the app's dominant pattern. */
  | 'sheet'
  /** Centred card — confirmations and short prompts. */
  | 'center';

export interface DialogMetricsInput {
  variant: DuncitDialogVariant;
  /** Live window height, so rotation and split-screen re-measure. */
  windowHeight: number;
  windowWidth: number;
  /** Safe-area inset at the top (notch / status bar). */
  topInset: number;
  /** How far the keyboard is covering the screen right now, 0 when closed. */
  keyboardInset: number;
  /** Share of the usable height the dialog may take. */
  maxHeightRatio: number;
}

export interface DialogMetrics {
  /** Hard cap on the dialog's own height. The body scrolls inside it. */
  maxHeight: number;
  /** Lift applied to the whole stack so the keyboard never covers the dialog. */
  bottomLift: number;
  /** Width of a centred card; sheets are full-bleed. */
  cardWidth: number | string;
  cardMaxWidth: number;
}

/** Never let a dialog collapse to nothing on a tiny window. */
const MIN_HEIGHT = 180;
/** A centred card stops growing here, so it does not stretch on a tablet. */
const CARD_MAX_WIDTH = 460;

/**
 * How tall a dialog may be, right now.
 *
 * Derived rather than hardcoded because all four inputs move independently: the
 * window changes on rotation and in split-screen, the top inset differs per
 * device, and the keyboard opens and closes under the user. A fixed `maxHeight`
 * in pixels — which is what most of the app's modals used — is correct on
 * exactly one device in one orientation with the keyboard shut.
 *
 * The keyboard is subtracted from the AVAILABLE height as well as lifting the
 * dialog: lifting alone moves a too-tall sheet's header off the top of the
 * screen instead of shrinking its scroll area.
 */
export function dialogMetrics(input: Readonly<DialogMetricsInput>): DialogMetrics {
  const { variant, windowHeight, windowWidth, topInset, keyboardInset, maxHeightRatio } = input;

  // A sheet is anchored to the bottom, so only the keyboard eats into it; a
  // centred card also has to clear the notch at the top.
  const chrome = variant === 'center' ? topInset * 2 : topInset;
  const usable = Math.max(windowHeight - keyboardInset - chrome, MIN_HEIGHT);
  const ratio = Math.min(Math.max(maxHeightRatio, 0.2), 1);

  return {
    maxHeight: Math.max(Math.round(usable * ratio), MIN_HEIGHT),
    bottomLift: Math.max(keyboardInset, 0),
    cardWidth: variant === 'center' ? '88%' : '100%',
    cardMaxWidth: variant === 'center' ? CARD_MAX_WIDTH : Math.max(windowWidth, 1),
  };
}
