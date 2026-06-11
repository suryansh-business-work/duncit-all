import React, { type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider, PortalModeGate } from '@duncit/user-context';
import { DuncitThemeProvider } from '@duncit/theme';
import { configureLogs, httpTransport, captureConsole } from '@duncit/logs';
import { PortalBranding } from './PortalBranding';
import type { MountPortalOptions } from './types';

const identity = (node: ReactNode): ReactNode => node;

/**
 * Boot a Duncit console with the shared Shell. Owns the entire common provider
 * stack — Apollo, user/session, theme + color mode, MUI localization, Google
 * OAuth, the router, portal-mode gating and console-log shipping — so each
 * portal only supplies its route tree and a few config values. The chrome
 * (header + sidebar) lives in the portal's own `<App />` for now and moves into
 * the Shell in a later phase.
 */
export function mountPortal(opts: MountPortalOptions): void {
  const {
    config,
    apolloClient,
    graphqlUrl,
    googleClientId = '',
    logsPortal,
    loadUser,
    userStorageKey,
    children,
    themeExtend,
    wrap = identity,
    extras,
    rootId = 'root',
  } = opts;

  // Ship console errors + structured logs to SignOz (via the server /logs ingest).
  configureLogs(httpTransport(graphqlUrl.replace(/\/graphql$/, '/logs')));
  captureConsole(logsPortal);

  const isAuthed = () => !!localStorage.getItem(config.tokenKey);

  const routed = (
    <>
      <PortalModeGate portalKey={config.key} graphqlUrl={graphqlUrl} appName={config.name}>
        {children}
      </PortalModeGate>
      <PortalBranding />
      {extras}
    </>
  );

  const mountNode = document.getElementById(rootId);
  if (!mountNode) throw new Error(`mountPortal: #${rootId} mount node not found`);

  ReactDOM.createRoot(mountNode).render(
    <React.StrictMode>
      <ApolloProvider client={apolloClient}>
        <UserProvider isAuthed={isAuthed} loadUser={loadUser} storageKey={userStorageKey ?? `${config.key}_user`}>
          <DuncitThemeProvider accent={config.accent} storageKey={config.colorModeKey} extend={themeExtend}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <GoogleOAuthProvider clientId={googleClientId}>
                <BrowserRouter>{wrap(routed)}</BrowserRouter>
              </GoogleOAuthProvider>
            </LocalizationProvider>
          </DuncitThemeProvider>
        </UserProvider>
      </ApolloProvider>
    </React.StrictMode>,
  );
}
