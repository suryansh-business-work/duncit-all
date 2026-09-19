/**
 * The one form grid every screen of this console lays its fields out on.
 *
 * Gaps are theme spacing tokens, and the ROW gap is not optional: an MUI text
 * field floats its label 9px above its own box, so two rows with no gap put
 * the label across the hint of the field above it (Settings › Checkout,
 * "0 = no limit" under "Prepaid discount"). Two units is the room MUI's own
 * `margin="normal"` gives a field, so a stacked phone layout reads the same
 * as the desktop one.
 */
export const TWO_COLUMNS = {
  display: 'grid',
  columnGap: 2,
  rowGap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
} as const;

export const THREE_COLUMNS = {
  display: 'grid',
  columnGap: 2,
  rowGap: 2,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
} as const;
