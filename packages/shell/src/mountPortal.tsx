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
import { AppLocaleProvider } from '@duncit/app-settings';
import { SHELL_FALLBACK_FLAT } from './i18n/fallback';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider, PortalModeGate } from '@duncit/user-context';
import { DuncitThemeProvider } from '@duncit/theme';
import { configureLogs, httpTransport } from '@duncit/logs';
import { captureShortLinkAttribution, installAttributionLinkDecorator } from '@duncit/utils';
import { PortalBranding } from './PortalBranding';
import { loadGoogleClientId } from './lib/google-client-id';
import type { MountPortalOptions } from './types';

const identity = (node: ReactNode): ReactNode => node;

/**
 * Boot a Duncit console with the shared Shell. Owns the entire common provider
 * stack — Apollo, user/session, theme + color mode, MUI localization, Google
 * OAuth, the router, portal-mode gating and console-log shipping — so each
 * portal only supplies its route tree and a few config values. The chrome
 * (header + sidebar + breadcrumbs) is the Shell's `AppShell`, which the
 * portal's `<App />` wraps its authed routes in.
 *
 * The Google OAuth client id is fetched from the server (which sources it from
 * the Tech portal's env store) before the first render, exactly as mWeb and the
 * native app do — no portal bakes it in at build time.
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
    i18nFallback,
    rootId = 'root',
  } = opts;

  // The portal's own copy layers OVER the shell chrome's, so a portal can
  // override a shared string without forking the shell bundle (rule 38).
  const fallback = { ...SHELL_FALLBACK_FLAT, ...i18nFallback };

  // Ship structured, file-level logs to SignOz (via the server /logs ingest).
  // environment + url + host are auto-detected from the browser at each call.
  // `portal: config.key` stamps the portal identity on every log — including
  // shared/generic loggers — so the telemetry Bugs view can slice by portal.
  configureLogs(httpTransport(graphqlUrl.replace(/\/graphql$/, '/logs')), {
    platform: 'web',
    portal: config.key,
  });

  // Short-link attribution: every portal is a *.duncit.com destination a
  // marketing link may point at, so the landing is reported at boot — before
  // render, because an auth guard immediately rewrites the URL and takes the
  // markers with it. Rejection-free by contract (every failure path inside
  // resolves), so no .catch — which would only add an uncoverable dead branch.
  captureShortLinkAttribution({
    search: globalThis.location.search,
    referrer: globalThis.document.referrer,
    serverUrl: graphqlUrl.replace(/\/graphql$/, ''),
  });
  // And keep the tags on every hyperlink out to another duncit surface —
  // storage does not cross origins, the URL does.
  installAttributionLinkDecorator();

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

  const render = (clientId: string) => {
    // With no client id configured in the Tech portal there is nothing to sign
    // in with, so the provider is left out entirely — the sign-in button reads
    // the same empty value and renders its "not configured" state.
    const router = <BrowserRouter>{wrap(routed)}</BrowserRouter>;
    const withGoogle = clientId ? <GoogleOAuthProvider clientId={clientId}>{router}</GoogleOAuthProvider> : router;

    ReactDOM.createRoot(mountNode).render(
      <React.StrictMode>
        <ApolloProvider client={apolloClient}>
          <UserProvider isAuthed={isAuthed} loadUser={loadUser} storageKey={userStorageKey ?? `${config.key}_user`}>
            <DuncitThemeProvider accent={config.accent} storageKey={config.colorModeKey} extend={themeExtend}>
              <AppLocaleProvider fallback={fallback}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                {withGoogle}
              </LocalizationProvider>
              </AppLocaleProvider>
            </DuncitThemeProvider>
          </UserProvider>
        </ApolloProvider>
      </React.StrictMode>,
    );
  };

  // Resolve the runtime client id first (capped at 3s inside the loader), then
  // render once. `googleClientId` is only the fallback for when the server has
  // none; if resolution itself blows up, render with that fallback.
  loadGoogleClientId(apolloClient, googleClientId)
    .then(render)
    .catch(() => render(googleClientId));
}
