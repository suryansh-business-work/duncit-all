import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import type { NormalizedCacheObject } from '@apollo/client';
import '@fontsource-variable/plus-jakarta-sans/index.css';
import { configureLogs, httpTransport } from '@duncit/logs';
import { loadGoogleAnalytics } from '@duncit/brand/google-analytics';
import { consentBannerCopy, mountConsentBanner } from '@duncit/brand/consent-banner';
import { siteT } from '@duncit/brand/site-i18n';

import { App } from './app/App';
import { createStoreClient } from './app/apolloClient';
import { preloadPage, storeRoutes } from './app/router';
import { SSR_STATE_GLOBAL, type StoreSsrState } from './app/ssr-contract';
import { beginHydration } from './lib/hydration';
import { storeLog } from './lib/log';
import { StoreErrorBoundary } from './components/StoreErrorBoundary';
import { GRAPHQL_URL, MAIN_SITE_URL } from './config/env';
import { captureInstallPrompt, registerServiceWorker } from './lib/pwa';

configureLogs(httpTransport(GRAPHQL_URL.replace(/\/graphql$/, '/logs')), { platform: 'web', portal: 'ecomm' });

// The GA4 tag set for this website in Tech > Google Analytics, if any.
loadGoogleAnalytics(GRAPHQL_URL, 'ECOMM');

// The tracking-consent banner. GA above waits for its answer.
mountConsentBanner(consentBannerCopy(siteT), { policyUrl: `${MAIN_SITE_URL}/policies` });

// Installable, and the shell opens offline (production builds only).
captureInstallPrompt();
registerServiceWorker();

declare global {
  interface Window {
    [SSR_STATE_GLOBAL]?: StoreSsrState;
  }
}

const root = document.getElementById('root');
if (root) {
  // A server-rendered page carries its Apollo cache; the first render draws from it.
  const ssr = globalThis.window[SSR_STATE_GLOBAL];
  const client = createStoreClient({ initialState: ssr?.apollo as NormalizedCacheObject | undefined });
  const app = (
    <StrictMode>
      <StoreErrorBoundary scope="root">
        <App client={client}>
          <RouterProvider router={createBrowserRouter(storeRoutes)} />
        </App>
      </StoreErrorBoundary>
    </StrictMode>
  );
  if (ssr && root.hasChildNodes()) {
    // The page's code first, so the whole server HTML hydrates in one pass.
    // A chunk that fails to load still hydrates; React fetches it on render.
    const hydrate = () => {
      beginHydration();
      hydrateRoot(root, app, {
        // React recovers by drawing the part again in the browser; log where, so a
        // drift between the server's page and the browser's is seen and fixed.
        onRecoverableError: (error, info) => storeLog.warn('ssr', 'hydration', { error, component_stack: info.componentStack ?? '' }),
      });
    };
    preloadPage(globalThis.location.pathname).then(hydrate, hydrate);
  } else {
    createRoot(root).render(app);
  }
}
