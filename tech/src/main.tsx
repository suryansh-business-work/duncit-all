import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider, gql } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider, PortalModeGate } from '@duncit/user-context';
import { urlConfigs } from './config/url-configs';
import { configureLogs, httpTransport, captureConsole, logs } from '@duncit/logs';
import { apolloClient } from './apollo';
import { ColorModeProvider } from './ColorModeContext';
import { ConfirmProvider } from './components/useConfirm';
import { appConfig } from './config/app-config';
import App from './App';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

const ME_QUERY = gql`
  query SessionMe {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      roles
      profile_photo
    }
  }
`;

const isAuthed = () => !!localStorage.getItem(appConfig.tokenKey);

const loadUser = async () => {
  const { data } = await apolloClient.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

// Ship console errors + structured logs to SignOz (via the server /logs ingest).
configureLogs(httpTransport(urlConfigs.graphqlUrl.replace(/\/graphql$/, '/logs')));
captureConsole(logs.portal.tech);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <UserProvider isAuthed={isAuthed} loadUser={loadUser} storageKey={`${appConfig.key}_user`}>
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <ConfirmProvider>
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <BrowserRouter>
                  <PortalModeGate portalKey={appConfig.key} graphqlUrl={urlConfigs.graphqlUrl} appName={appConfig.name}>
                    <App />
                  </PortalModeGate>
                </BrowserRouter>
              </GoogleOAuthProvider>
            </ConfirmProvider>
          </LocalizationProvider>
        </ColorModeProvider>
      </UserProvider>
    </ApolloProvider>
  </React.StrictMode>
);
