import { useEffect, useState, type ReactNode } from 'react';
import type { ApolloClient } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LocaleProvider } from '@duncit/app-settings';
import { ConfirmProvider, NotifyProvider } from '@duncit/dialogs';
import { RequestProgressBar } from '@duncit/ui';

import { GOOGLE_CLIENT_ID } from '../config/env';
import { STORE_FALLBACK } from '../i18n';
import { StoreClosedPage } from '../pages/closed/StoreClosedPage';
import { endHydration, startsFromServer } from '../lib/hydration';
import { fetchFullCopyAfterHydration } from './ssr-copy';
import { CartProvider } from './providers/CartProvider';
import { ColorModeProvider } from './providers/ColorModeProvider';
import { OccasionThemeProvider } from './providers/OccasionThemeProvider';
import { SessionProvider, useStoreSession } from './providers/SessionProvider';
import { StoreSettingsProvider, useStoreSettings } from './providers/StoreSettingsProvider';
import { WishlistProvider } from './providers/WishlistProvider';

/** The account's saved language wins over the browser's. */
function StoreLocale({ onKeyRead, children }: Readonly<{ onKeyRead?: (key: string) => void; children: ReactNode }>) {
  const { me } = useStoreSession();
  return (
    <LocaleProvider fallback={STORE_FALLBACK} userLocale={me?.locale ?? null} onKeyRead={onKeyRead}>
      {children}
    </LocaleProvider>
  );
}

/** A switched-off store shows its "opening soon" page on every route. */
function StoreGate({ children }: Readonly<{ children: ReactNode }>) {
  const { store_enabled: open } = useStoreSettings();
  if (!open) return <StoreClosedPage />;
  return (
    <CartProvider>
      <WishlistProvider>{children}</WishlistProvider>
    </CartProvider>
  );
}

function WithGoogle({ children }: Readonly<{ children: ReactNode }>) {
  if (!GOOGLE_CLIENT_ID) return <>{children}</>;
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

interface AppProps {
  /** One per page view in the browser, one per request on the server. */
  client: ApolloClient;
  /** The router: the browser's in main.tsx, a static one in entry-server.tsx. */
  children: ReactNode;
  /** Server only: told each copy key the page reads, so the page carries just those. */
  onCopyKey?: (key: string) => void;
}

export function App({ client, children, onCopyKey }: Readonly<AppProps>) {
  const [fromServer] = useState(startsFromServer);
  // A parent's effect runs after every child's, so by now each provider has
  // swapped the server's defaults for what this browser remembers.
  useEffect(() => {
    endHydration();
    return fromServer ? fetchFullCopyAfterHydration(client) : undefined;
  }, [client, fromServer]);
  return (
    <ApolloProvider client={client}>
      <WithGoogle>
        <SessionProvider>
          <StoreLocale onKeyRead={onCopyKey}>
            <ColorModeProvider>
              {/* The floor under every wait on the server (the settings load,
                  a shelf, a checkout) before any page draws its own loader. */}
              <RequestProgressBar />
              <ConfirmProvider>
                <NotifyProvider>
                  <StoreSettingsProvider>
                    <OccasionThemeProvider>
                      <StoreGate>{children}</StoreGate>
                    </OccasionThemeProvider>
                  </StoreSettingsProvider>
                </NotifyProvider>
              </ConfirmProvider>
            </ColorModeProvider>
          </StoreLocale>
        </SessionProvider>
      </WithGoogle>
    </ApolloProvider>
  );
}
