import type { ReactNode } from 'react';
import type { ApolloClient } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import { ConfirmProvider, NotifyProvider } from '@duncit/dialogs';
import { RequestProgressBar } from '@duncit/ui';
import { STORAGE_KEYS } from '../shared/env';
import { LiteSessionProvider } from '../shared/session';
import { SESSION_COOKIE } from '../shared/ssr-contract';
import { MODE_STORAGE_KEY, buildLiteTheme } from '../shared/theme';
import { DisplayModeSync } from './app/providers/DisplayModeSync';
import { LiteLocale } from './app/providers/LiteLocale';
import { LiteSettingsProvider, useLiteSettings } from './app/providers/LiteSettingsProvider';
import { SignInPromptProvider } from './app/providers/SignInPromptProvider';

const theme = buildLiteTheme();

/** Google's provider only mounts when an admin configured a client id; the button follows. */
function WithGoogle({ children }: Readonly<{ children: ReactNode }>) {
  const { google_client_id: clientId } = useLiteSettings();
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

interface AppProps {
  client: ApolloClient;
  /** What the session starts from; see LiteSessionProvider. */
  initialToken?: string | null;
  /** The router: a browser router in the page, a static one in the server render. */
  children: ReactNode;
}

/** Every provider the web app needs, around whichever router the entry point brings. */
export function App({ client, initialToken, children }: Readonly<AppProps>) {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey={MODE_STORAGE_KEY} disableTransitionOnChange>
        <CssBaseline />
        <LiteSettingsProvider>
          <WithGoogle>
            <LiteSessionProvider tokenKey={STORAGE_KEYS.token} initialToken={initialToken} cookieName={SESSION_COOKIE}>
              <DisplayModeSync />
              <LiteLocale>
                <DuncitLocalizationProvider timeZoneAware>
                  <RequestProgressBar />
                  <ConfirmProvider>
                    <NotifyProvider>
                      <SignInPromptProvider>{children}</SignInPromptProvider>
                    </NotifyProvider>
                  </ConfirmProvider>
                </DuncitLocalizationProvider>
              </LiteLocale>
            </LiteSessionProvider>
          </WithGoogle>
        </LiteSettingsProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}
