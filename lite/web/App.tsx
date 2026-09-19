import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import { ConfirmProvider, NotifyProvider } from '@duncit/dialogs';
import { RequestProgressBar } from '@duncit/ui';
import { createLiteClient } from '../shared/apollo';
import { STORAGE_KEYS } from '../shared/env';
import { LiteSessionProvider } from '../shared/session';
import { buildLiteTheme } from '../shared/theme';
import { LiteLocale } from './app/providers/LiteLocale';
import { LiteSettingsProvider, useLiteSettings } from './app/providers/LiteSettingsProvider';
import { SignInPromptProvider } from './app/providers/SignInPromptProvider';
import { router } from './router';

const client = createLiteClient(STORAGE_KEYS.token, 'WEBSITE');
const theme = buildLiteTheme();

/** Google's provider only mounts when an admin configured a client id; the button follows. */
function WithGoogle({ children }: Readonly<{ children: ReactNode }>) {
  const { google_client_id: clientId } = useLiteSettings();
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

export function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LiteSettingsProvider>
          <WithGoogle>
            <LiteSessionProvider tokenKey={STORAGE_KEYS.token}>
              <LiteLocale>
                <DuncitLocalizationProvider timeZoneAware>
                  <RequestProgressBar />
                  <ConfirmProvider>
                    <NotifyProvider>
                      <SignInPromptProvider>
                        <RouterProvider router={router} />
                      </SignInPromptProvider>
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
