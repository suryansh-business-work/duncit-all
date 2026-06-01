import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider, gql } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider, PortalModeGate } from '@duncit/user-context';
import { urlConfigs } from './config/url-configs';
import { apolloClient } from './apollo';
import { ColorModeProvider } from './ColorModeContext';
import App from './App';
import 'react-datepicker/dist/react-datepicker.css';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

const PARTNER_ME = gql`
  query PartnerSessionMe {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      profile_photo
      roles
    }
  }
`;

const isAuthed = () => !!localStorage.getItem('token');

const loadUser = async () => {
  const { data } = await apolloClient.query({ query: PARTNER_ME, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <UserProvider isAuthed={isAuthed} loadUser={loadUser} storageKey="partner_user">
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <BrowserRouter>
                <PortalModeGate portalKey={"partners"} graphqlUrl={urlConfigs.graphqlUrl} appName={"Partners App"}>
                  <App />
                </PortalModeGate>
              </BrowserRouter>
            </GoogleOAuthProvider>
          </LocalizationProvider>
        </ColorModeProvider>
      </UserProvider>
    </ApolloProvider>
  </React.StrictMode>
);
