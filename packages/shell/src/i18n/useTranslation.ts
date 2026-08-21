import { useTranslation as useSharedTranslation } from '@duncit/app-settings';

import { ALL_FALLBACK_FLAT } from './fallback';

/**
 * Translate in shell chrome — the portals' twin of mWeb's and the native app's
 * hook, on the same @duncit/i18n core so every surface resolves text
 * identically.
 *
 * Text precedence inside a provider: server catalogue -> what the portal
 * shipped via `mountPortal({ i18nFallback })` over the shell's -> the key.
 *
 * With NO provider above it — a test, a storybook, an error boundary — there is
 * no `i18nFallback` layered yet, so the floor here is every shipped namespace
 * rather than the shell's alone. A page rendered that way still reads "Hi Asha"
 * instead of `ai.welcome.greeting`. See ALL_FALLBACK_FLAT for why that costs
 * nothing, and why it does not replace a portal shipping its own bundle.
 */
export function useTranslation() {
  return useSharedTranslation(ALL_FALLBACK_FLAT);
}
