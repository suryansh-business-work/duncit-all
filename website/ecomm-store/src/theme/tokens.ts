import { light, radii } from '@duncit/auth-tokens';

/**
 * The storefront's visual language (the PawCare-style mock, in Duncit red).
 *
 * Contrast rules this file encodes:
 * - `brand` (#F82C2E) is a FILL for icons, bubbles, illustration and LARGE
 *   white text only (3.9:1 with white) — never small white text, never red text.
 * - `cta` (#D92D2D) is the same red at 4.8:1, for buttons and chips that carry
 *   ordinary-size white text.
 * - Pastel card tints always carry dark `ink` text.
 */
export const STORE_TOKENS = {
  brand: light.brand,
  cta: light.primary,
  ctaHover: light.primaryHover,
  onBrand: light.onPrimary,
  ink: light.ink,
  muted: light.muted,
  page: '#F6F6F8',
  surface: light.surface,
  border: light.border,
  inputBorder: light.inputBorder,
  navBar: '#151515',
  brandTint: '#FFE9E9',
  radius: { card: radii.xl, panel: 20, pill: radii.pill, control: radii.lg },
  shadow: '0 8px 24px rgba(21, 21, 21, 0.06)',
} as const;

/** Warm pastels rotated across cards so a grid never reads as one flat block. */
export const CARD_TINTS = ['#FFE9E9', '#FFEEDD', '#F1EAFF', '#E7F2FF', '#E5F7EE'] as const;

/** A stable tint for the n-th card (position, not identity, decides it). */
export const tintAt = (position: number): string => CARD_TINTS[position % CARD_TINTS.length];

/** The breakpoint where the phone layout (bottom nav, full-screen filters) ends. */
export const DESKTOP_UP = 'md' as const;
