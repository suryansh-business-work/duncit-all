import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider, gql } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider, PortalModeGate } from '@duncit/user-context';
import { apolloClient } from './apollo';
import { urlConfigs } from './config/url-configs';
import { configureLogs, httpTransport, captureConsole, logs } from '@duncit/logs';
import { ColorModeProvider } from './ColorModeContext';
import { StudioModeProvider } from './StudioModeContext';
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

// Mirrors the fields existing mweb screens read off `me`. Kept here (not in
// app-header/queries.ts) so the provider doesn't depend on a sibling module.
const ME_QUERY = gql`
  query MwebSessionMe {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      is_email_verified
      profile_photo
      city
      roles
      following_pod_ids
      following_user_ids
    }
  }
`;

const isAuthed = () => !!localStorage.getItem('token');

const loadUser = async () => {
  const { data } = await apolloClient.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

// Ship console errors + structured logs to SignOz (via the server /logs ingest).
configureLogs(httpTransport(urlConfigs.graphqlUrl.replace(/\/graphql$/, '/logs')));
captureConsole(logs.mWeb);

function mount() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ApolloProvider client={apolloClient}>
        <UserProvider isAuthed={isAuthed} loadUser={loadUser} storageKey="mweb_user">
          <ColorModeProvider>
            <StudioModeProvider>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <GoogleOAuthProvider clientId={getGoogleClientId()}>
                  <BrowserRouter>
                    <PortalModeGate portalKey="mweb" graphqlUrl={urlConfigs.graphqlUrl} appName="Duncit"><App /></PortalModeGate>
                  </BrowserRouter>
                </GoogleOAuthProvider>
              </LocalizationProvider>
            </StudioModeProvider>
          </ColorModeProvider>
        </UserProvider>
      </ApolloProvider>
    </React.StrictMode>
  );
}

// Pull the public client config before first render so GoogleOAuthProvider gets
// the Tech-portal client id. Render regardless on failure (env fallback applies).
apolloClient
  .query({ query: PUBLIC_CLIENT_CONFIG, fetchPolicy: 'network-only' })
  .then(({ data }) => {
    const c = data?.publicClientConfig;
    if (c) setRuntimeConfig({ googleClientId: c.google_client_id, googleMapsApiKey: c.google_maps_api_key });
  })
  .catch(() => undefined)
  .finally(mount);
