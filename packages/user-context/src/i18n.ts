import { createTranslator, flattenCatalogue, SESSION_BUNDLE } from '@duncit/i18n';

/**
 * This package's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy lives in @duncit/i18n under `session.*` with every other surface's,
 * so the admin panel can offer each key for translation; mWeb and the portal
 * shell both layer that namespace over their own bundle, which is how a
 * translated entry reaches these screens.
 */
export const SESSION_FALLBACK_FLAT = flattenCatalogue(SESSION_BUNDLE);

/**
 * The translator these screens accept.
 *
 * Structural rather than imported from a React hook on purpose: this package
 * sits BELOW `@duncit/app-settings` in the dependency graph (app-settings reads
 * `useUserData` from here), so it cannot call the shared `useTranslation`
 * without a cycle. The surface that mounts a screen passes its own `t` down.
 */
export type SessionTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/**
 * The translator used when no surface passed one.
 *
 * `UserProvider` renders the "user data not loaded" dialog as a SIBLING of the
 * locale provider — mWeb and the shell both mount `AppLocaleProvider` inside it,
 * because the provider reads the signed-in user's saved language from this
 * context. There is therefore no live translator in scope at that one call
 * site, and this is what it reads instead: the shipped English, from the same
 * keys, rather than a raw `session.notLoaded.title` on screen.
 */
export const sessionT: SessionTranslate = createTranslator({
  locale: 'en-IN',
  fallback: SESSION_FALLBACK_FLAT,
}).t;
