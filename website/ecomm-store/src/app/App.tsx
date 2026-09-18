import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LocaleProvider } from '@duncit/app-settings';
import { ConfirmProvider, NotifyProvider } from '@duncit/dialogs';

import { GOOGLE_CLIENT_ID } from '../config/env';
import { STORE_FALLBACK } from '../i18n';
import { StoreClosedPage } from '../pages/closed/StoreClosedPage';
import { buildStoreTheme } from '../theme/storeTheme';
import { createStoreClient } from './apolloClient';
import { CartProvider } from './providers/CartProvider';
import { SessionProvider, useStoreSession } from './providers/SessionProvider';
import { StoreSettingsProvider, useStoreSettings } from './providers/StoreSettingsProvider';
import { WishlistProvider } from './providers/WishlistProvider';
import { router } from './router';

const client = createStoreClient();
const theme = buildStoreTheme();

/** The account's saved language wins over the browser's. */
function StoreLocale({ children }: Readonly<{ children: ReactNode }>) {
  const { me } = useStoreSession();
  return (
    <LocaleProvider fallback={STORE_FALLBACK} userLocale={me?.locale ?? null}>
      {children}
    </LocaleProvider>
  );
}

/** A switched-off store shows its "opening soon" page on every route. */
function StoreGate() {
  const { store_enabled: open } = useStoreSettings();
  if (!open) return <StoreClosedPage />;
  return (
    <CartProvider>
      <WishlistProvider>
        <RouterProvider router={router} />
      </WishlistProvider>
    </CartProvider>
  );
}

function WithGoogle({ children }: Readonly<{ children: ReactNode }>) {
  if (!GOOGLE_CLIENT_ID) return <>{children}</>;
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

export function App() {
  return (
    <ApolloProvider client={client}>
      <WithGoogle>
        <SessionProvider>
          <StoreLocale>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <ConfirmProvider>
                <NotifyProvider>
                  <StoreSettingsProvider>
                    <StoreGate />
                  </StoreSettingsProvider>
                </NotifyProvider>
              </ConfirmProvider>
            </ThemeProvider>
          </StoreLocale>
        </SessionProvider>
      </WithGoogle>
    </ApolloProvider>
  );
}
