// Self-hosted Quicksand (variable weight axis) — replaces the Google Fonts
// <link> in index.html; same font, served from our own origin.
import '@fontsource-variable/quicksand/wght.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { gql } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { BrowserRouter } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { io } from 'socket.io-client';
import {
  UserProvider,
  PortalModeGate,
  buildSessionMeQuery,
  configureSessionSocket,
  type PortalModeGateProps,
} from '@duncit/user-context';
import { useTranslation } from './i18n/useTranslation';
import { getSocketUrl } from './lib/socket-url';
import { apolloClient } from './apollo';
import { captureShortLinkClick } from './lib/short-link-journey';
import { endRejectedSession, requireAuthForShortLinkLanding } from './lib/session-guard';
import { installAttributionLinkDecorator } from '@duncit/utils';
import { urlConfigs } from './config/url-configs';
import { configureLogs, httpTransport } from '@duncit/logs';
import { getOrCreateDuid } from '@duncit/user-core';
import { ColorModeProvider } from './ColorModeContext';
import { AppLocaleProvider, DuncitLocalizationProvider } from '@duncit/app-settings';
import { MWEB_FALLBACK_FLAT } from './i18n/fallback';
import { StudioModeProvider } from './StudioModeContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import { initPwa } from './pwa';
import { setRuntimeConfig, getGoogleClientId } from './config/runtimeConfig';

// Public client config (Google OAuth client id + Maps key) — fetched from the
// server, which sources it from the Tech portal. The bundled Vite env is only a
// local-dev fallback (see config/runtimeConfig.ts).
const PUBLIC_CLIENT_CONFIG = gql`
  query MwebPublicClientConfig {
    publicClientConfig {
      google_client_id
      google_maps_api_key
    }
  }
`;

initPwa();

// Global image fallback: replace any broken/404 <img> with a placeholder
document.addEventListener(
  'error',
  (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'IMG') {
      const img = t as HTMLImageElement;
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = '/img-placeholder.svg';
      }
    }
  },
  true // capture phase — fires before React synthetic events
);

// The shared session selection (@duncit/user-core) plus the one field only mWeb
// reads. This list used to be hand-maintained here and silently omitted
// `locale`, so a language chosen on the phone never followed the account back
// into mWeb.
const ME_QUERY = buildSessionMeQuery('MwebSessionMe', ['following_user_ids']);

const isAuthed = () => !!localStorage.getItem('token');

const loadUser = async () => {
  const { data } = await apolloClient.query<any>({ query: ME_QUERY, fetchPolicy: 'network-only' });
  const me = data?.me ?? null;
  // The provider only asks with a token attached, so a null answer is the
  // server refusing it — a deleted, blocked or no-longer-verifiable session
  // that would otherwise go on rendering the signed-in shell off the cache.
  if (!me) endRejectedSession();
  return me;
};

// Real-time: a profile change made in a portal or on the phone lands in this
// tab without a refetch. The factory is what keeps `@duncit/user-context` free
// of a socket.io dependency — each surface opens its own connection.
configureSessionSocket(() => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return io(getSocketUrl(), {
    path: '/socket.io',
    auth: { token },
    // Same fallback as the chat sockets: some networks block WebSockets.
    transports: ['websocket', 'polling'],
  });
});

// Ship structured, file-level logs to SignOz (via the server /logs ingest).
// environment + url + host are auto-detected from the browser at each call.
//
// The token and device id ride along as headers, exactly as on a GraphQL call:
// the server reads WHO from the verified token, never from the body, so a bug
// arrives with the account behind it instead of just a stack trace.
configureLogs(
  httpTransport(urlConfigs.graphqlUrl.replace(/\/graphql$/, '/logs'), {
    getToken: () => localStorage.getItem('token'),
    getDeviceId: getOrCreateDuid,
  }),
  { platform: 'web', client: () => ({ app_version: __APP_VERSION__ }) },
);

// Read the short-link click id BEFORE anything else runs. RequireAuth rewrites
// the URL to /login?redirect=… for signed-out visitors, and mounting waits up to
// 3s on config below — by then the parameter is gone from location.search.
captureShortLinkClick(globalThis.window.location.search);
// …then send the visitor to sign in, because a short link is measured by the
// account it produces. Runs AFTER the capture so the click id is already on
// its way: this only rewrites the URL, it does not reload.
requireAuthForShortLinkLanding();
// Re-attach the stored tags to every outbound duncit link at click time —
// storage does not cross origins, so the URL is the only vehicle to a
// website, another surface, or the native app.
installAttributionLinkDecorator();

/**
 * The portal-mode gate with mWeb's live translator attached.
 *
 * @duncit/user-context sits BELOW @duncit/app-settings in the dependency graph
 * (the locale provider reads the signed-in user from it), so the gate takes `t`
 * as a prop rather than calling the hook itself. Hoisted to module scope so it
 * is not redefined on every render (S6478).
 */
function LocalizedPortalModeGate(props: Readonly<Omit<PortalModeGateProps, 't'>>) {
  const { t } = useTranslation();
  return <PortalModeGate {...props} t={t} />;
}

function mount() {
  // A top-level ErrorBoundary wraps the WHOLE provider tree (not just the routes)
  // so a boot-time throw from a provider / gate / failing query shows the
  // recoverable fallback instead of unmounting React to a blank white screen.
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ApolloProvider client={apolloClient}>
          <UserProvider isAuthed={isAuthed} loadUser={loadUser} storageKey="mweb_user">
            <AppLocaleProvider fallback={MWEB_FALLBACK_FLAT}>
            <ColorModeProvider>
              <StudioModeProvider>
                <DuncitLocalizationProvider timeZoneAware>
                  <GoogleOAuthProvider clientId={getGoogleClientId()}>
                    {/* The v7_* opt-ins are gone: react-router 7 IS that behaviour. */}
                    <BrowserRouter>
                      <LocalizedPortalModeGate portalKey="mweb" graphqlUrl={urlConfigs.graphqlUrl} appName="Duncit"><App /></LocalizedPortalModeGate>
                    </BrowserRouter>
                  </GoogleOAuthProvider>
                </DuncitLocalizationProvider>
              </StudioModeProvider>
            </ColorModeProvider>
            </AppLocaleProvider>
          </UserProvider>
        </ApolloProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Pull the public client config before first render so GoogleOAuthProvider gets
// the Tech-portal client id. Render regardless on failure (env fallback applies)
// — and never block first paint on a hung/slow API: cap the wait at 3s.
const configReady = apolloClient
  .query<any>({ query: PUBLIC_CLIENT_CONFIG, fetchPolicy: 'network-only' })
  .then(({ data }) => {
    const c = data?.publicClientConfig;
    if (c) setRuntimeConfig({ googleClientId: c.google_client_id, googleMapsApiKey: c.google_maps_api_key });
  })
  .catch(() => undefined);

Promise.race([configReady, new Promise((resolve) => setTimeout(resolve, 3000))]).finally(mount);
