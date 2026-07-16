import type { ReactNode } from 'react';
import type { LoginScreenConfig } from '@duncit/user-context';

export type { RedirectLocation } from '../lib/redirect';

/**
 * The slice of a portal's `appConfig` the login page needs. Every portal's
 * existing `AppConfig` is structurally compatible, so call-sites pass
 * `appConfig={appConfig}` unchanged (extra fields are ignored).
 */
export interface PortalLoginAppConfig {
  /** `portal_key` sent with the login mutation. */
  key: string;
  /** Short portal name (chip + logo alt), e.g. "Finance". */
  name: string;
  /** Brand name for the promo footer, e.g. "Duncit Finance". */
  fullName: string;
  /** One-line tagline under the login card. */
  tagline: string;
  promoTitle: string;
  promoText: string;
  /** Full-bleed background image URL. */
  loginImage: string;
}

/**
 * Session helpers the page writes through — exactly the shape returned by
 * `createSession` from `@duncit/shell`, so portals pass their existing
 * `lib/session` exports.
 */
export interface PortalLoginSession {
  setToken(token: string): void;
  hasAppAccess(roles?: readonly string[] | null): boolean;
  accessDeniedMessage(): string;
}

export interface PortalLoginPageProps {
  appConfig: PortalLoginAppConfig;
  session: PortalLoginSession;
  /** Where to land when no `?redirect=`/router state is present. Default `'/'` (admin: `'/hub'`). */
  defaultRedirect?: string;
  /** GraphQL operation name for the login mutation. Default `'ConsoleLogin'`. */
  mutationName?: string;
  /** Extra fields selected on `login.user` (e.g. `['onboarding_survey_completed']`). */
  extraUserFields?: readonly string[];
  /**
   * Skip the `hasAppAccess` role gate AND the `?denied=1` banner. Partners-app
   * is portal-gate-exempt by design — any authenticated user may enter.
   */
  skipAccessGate?: boolean;
  /** Extra content below the form (e.g. SendAdminCredentials, register CTA). */
  footerSlot?: ReactNode;
  /** Error-to-message mapper. Defaults to `parseApiError` from `@duncit/utils`. */
  parseError?: (error: unknown) => string;
  /** Overrides merged over the config derived from `appConfig` (e.g. `contactEmail`). */
  configOverrides?: Partial<LoginScreenConfig>;
}
