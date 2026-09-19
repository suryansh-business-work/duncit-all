import { useMemo, type ReactNode } from 'react';
import { ApolloProvider, useMutation } from '@apollo/client/react';
import { BrowserRouter } from 'react-router';
import { DuncitLocalizationProvider, LocaleProvider } from '@duncit/app-settings';
import { ConfirmProvider, NotifyProvider } from '@duncit/dialogs';
import { DuncitThemeProvider } from '@duncit/theme';
import { RequestProgressBar } from '@duncit/ui';
import { createLiteClient } from '../shared/apollo';
import { STORAGE_KEYS } from '../shared/env';
import { LITE_SET_MY_LOCALE } from '../shared/graphql/documents';
import { PORTAL_FALLBACK } from '../shared/i18n';
import { LiteSessionProvider, useLiteSession } from '../shared/session';
import { ConsoleRoutes } from './routes';

/**
 * Localization sits INSIDE the session so the signed-in admin's saved language
 * wins, and a switch in the console is written back to their profile.
 */
function SessionLocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { me, signedIn } = useLiteSession();
  const [setMyLocale] = useMutation(LITE_SET_MY_LOCALE);
  const onLocaleChange = (code: string) => {
    if (!signedIn) return;
    setMyLocale({ variables: { locale: code } }).catch(() => undefined);
  };
  return (
    <LocaleProvider fallback={PORTAL_FALLBACK} userLocale={me?.locale} onLocaleChange={onLocaleChange}>
      {children}
    </LocaleProvider>
  );
}

export function App() {
  const client = useMemo(() => createLiteClient(STORAGE_KEYS.portalToken, 'PORTAL'), []);
  return (
    <ApolloProvider client={client}>
      <LiteSessionProvider tokenKey={STORAGE_KEYS.portalToken}>
        <SessionLocaleProvider>
          <DuncitThemeProvider storageKey={STORAGE_KEYS.portalColorMode} defaultMode="light">
            <DuncitLocalizationProvider timeZoneAware>
              <RequestProgressBar />
              <ConfirmProvider>
                <NotifyProvider>
                  <BrowserRouter>
                    <ConsoleRoutes />
                  </BrowserRouter>
                </NotifyProvider>
              </ConfirmProvider>
            </DuncitLocalizationProvider>
          </DuncitThemeProvider>
        </SessionLocaleProvider>
      </LiteSessionProvider>
    </ApolloProvider>
  );
}
