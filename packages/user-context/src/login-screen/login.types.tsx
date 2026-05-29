import type { ReactNode } from 'react';
import type { PaletteMode } from '@mui/material';

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
  /** Optional extra content rendered below the form (e.g. Google sign-in). */
  footerSlot?: ReactNode;
}
