import { useUserData } from '@duncit/user-context';
import type { FlatCatalogue } from '@duncit/i18n';

import { LocaleProvider } from './useTranslation';

interface Props {
  /** The surface's bundled fallback catalogue. */
  fallback: FlatCatalogue;
  children: React.ReactNode;
}

/**
 * LocaleProvider wired to the SIGNED-IN ACCOUNT's saved language.
 *
 * Without this the language only ever persists in this browser's storage: the
 * switcher writes `profile.locale` server-side, but nothing ever read it back,
 * so the same user on a new device — or after clearing storage — silently got
 * the device language instead of the one they chose.
 *
 * Must be rendered inside a UserProvider. A local switch still wins for the
 * rest of the session (LocaleProvider's own `override`), so changing language
 * stays instant and does not wait on the profile write.
 */
export function AppLocaleProvider({ fallback, children }: Readonly<Props>) {
  const { user } = useUserData();
  return (
    <LocaleProvider fallback={fallback} userLocale={user?.locale ?? null}>
      {children}
    </LocaleProvider>
  );
}
