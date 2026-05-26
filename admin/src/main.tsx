import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider } from '@duncit/user-context';
import { apolloClient } from './apollo';
import { ColorModeProvider } from './ColorModeContext';
import { ConfirmProvider } from './components/useConfirm';
import { NotifyHost } from './components/notify';
import { ADMIN_ME } from './adminSession';
import App from './App';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

const isAuthed = () => !!localStorage.getItem('admin_token');

const loadUser = async () => {
  const { data } = await apolloClient.query({ query: ADMIN_ME, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <UserProvider isAuthed={isAuthed} loadUser={loadUser} storageKey="admin_user">
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <BrowserRouter>
                <ConfirmProvider>
                  <App />
                  <NotifyHost />
                </ConfirmProvider>
              </BrowserRouter>
            </GoogleOAuthProvider>
          </LocalizationProvider>
        </ColorModeProvider>
      </UserProvider>
    </ApolloProvider>
  </React.StrictMode>
);
