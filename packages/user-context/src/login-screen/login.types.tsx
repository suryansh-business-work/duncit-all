import type { ReactNode } from 'react';
import type { PaletteMode } from '@mui/material';
import type { SessionTranslate } from '../i18n';

export interface LoginFormValues {
  email: string;
  password: string;
}

export const loginInitialValues: LoginFormValues = {
  email: '',
  password: '',
};

/** Per-portal content that drives the shared login design. */
export interface LoginScreenConfig {
  /** Brand shown in the promo "By {brandName}" footer, e.g. "Duncit Finance". */
  brandName: string;
  /** Short portal name (used for logo alt text), e.g. "Finance". */
  portalName: string;
  /** One-line tagline shown in the dark banner under the login card. */
  tagline: string;
  /** Big stacked promo heading (first word solid, rest muted). */
  promoTitle: string;
  /** Supporting promo paragraph. */
  promoText: string;
  /** Full-bleed background image URL (rendered foggy). */
  bgImage: string;
  /** Logo URL (used in both light and dark mode). */
  logoUrl: string;
  /** Called when logoUrl fails to load, so the caller can swap in its bundled
   * copy — a URL that 404s never arrives empty (rule 39). */
  onLogoError?: () => void;
  /** Privacy policy URL (defaults to the public site). */
  privacyUrl?: string;
  /** Terms of use URL (defaults to the public site). */
  termsUrl?: string;
  /** Support contact email for login issues (defaults to admin@duncit.com). */
  contactEmail?: string;
}

export interface LoginScreenProps {
  config: LoginScreenConfig;
  mode: PaletteMode;
  onToggleMode: () => void;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  /**
   * The other way in, rendered directly under the password button — a code
   * emailed instead of a password. It sits there rather than under the legal
   * links because it is an alternative to the control above it, not an extra.
   */
  altSlot?: ReactNode;
  /** Optional extra content rendered below the form (e.g. Google sign-in). */
  footerSlot?: ReactNode;
  /**
   * The mounting surface's translator. `@duncit/shell` passes the live one, so
   * the screen follows the reader's language; the shipped English stands in
   * when a caller has none (rule 38).
   */
  t?: SessionTranslate;
}
