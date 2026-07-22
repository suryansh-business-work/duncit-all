// Self-hosted Nunito (the shared portal theme font) — replaces the per-portal
// Google Fonts <link>, so every console that mounts through the shell ships the
// font from its own origin (no third-party request, no SRI concern).
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import React, { type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider, PortalModeGate } from '@duncit/user-context';
import { DuncitThemeProvider } from '@duncit/theme';
import { configureLogs, httpTransport } from '@duncit/logs';
import { PortalBranding } from './PortalBranding';
import type { MountPortalOptions } from './types';

const identity = (node: ReactNode): ReactNode => node;

/**
 * Boot a Duncit console with the shared Shell. Owns the entire common provider
 * stack — Apollo, user/session, theme + color mode, MUI localization, Google
 * OAuth, the router, portal-mode gating and console-log shipping — so each
 * portal only supplies its route tree and a few config values. The chrome
 * (header + sidebar + breadcrumbs) is the Shell's `AppShell`, which the
 * portal's `<App />` wraps its authed routes in.
 */
export function mountPortal(opts: MountPortalOptions): void {
  const {
    config,
    apolloClient,
    graphqlUrl,
    googleClientId = '',
    loadUser,
    userStorageKey,
    children,
    themeExtend,
    wrap = identity,
    extras,
    rootId = 'root',
  } = opts;

  // Ship structured, file-level logs to SignOz (via the server /logs ingest).
  // environment + url + host are auto-detected from the browser at each call.
  configureLogs(httpTransport(graphqlUrl.replace(/\/graphql$/, '/logs')), { platform: 'web' });

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
