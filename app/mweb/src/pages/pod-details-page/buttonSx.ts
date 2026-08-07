/**
 * The two button shapes the pod action panel is built from.
 *
 * Beside the panel rather than inside it, so the member panel that was split
 * out of it keeps exactly the same buttons rather than a second definition of
 * them.
 */
export const compactButtonSx = {
  minHeight: 40,
  px: 1.5,
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

export const gradientButtonSx = {
  ...compactButtonSx,
  background: 'linear-gradient(135deg, #ff4f73 0%, #ff8b5f 54%, #f5337a 100%)',
  boxShadow: '0 12px 24px rgba(245,51,122,0.28)',
  '&:hover': {
    background: 'linear-gradient(135deg, #ef3b63 0%, #f9794d 54%, #db2468 100%)',
    boxShadow: '0 14px 28px rgba(245,51,122,0.34)',
  },
};
