/**
 * The button shapes the pod booking bar is built from.
 *
 * Beside the panel rather than inside it, so the member and backout panels that
 * were split out of it keep exactly the same buttons rather than a second
 * definition of them.
 */
export const compactButtonSx = {
  minHeight: 40,
  px: 2,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

/** The bar's call to action: a flat green pill (the themed contained primary),
 * sized like the native bar's CTA. */
export const ctaButtonSx = {
  minHeight: 48,
  px: 3.5,
  fontSize: 15,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};
