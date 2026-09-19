/**
 * Read by a screen reader, invisible on screen.
 * Sizes are strings on purpose: `sx` reads a bare `1` as 100%, which turned
 * this into a viewport-sized box that added a blank band below the footer.
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
