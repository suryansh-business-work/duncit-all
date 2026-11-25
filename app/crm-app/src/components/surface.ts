import { RADII } from '@/constants/design';

/**
 * A content surface as the portal draws one: the surface colour with a
 * hairline edge and the card radius, flat (no shadow). The edge is what keeps
 * a row apart from the page in dark mode, where the two colours are close.
 */
export const SURFACE = {
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: RADII.md,
  padding: '$3',
} as const;
