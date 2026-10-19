import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans/index.css';
import { configureLogs, httpTransport } from '@duncit/logs';
import { loadGoogleAnalytics } from '@duncit/brand/google-analytics';
import { consentBannerCopy, mountConsentBanner } from '@duncit/brand/consent-banner';
import { siteT } from '@duncit/brand/site-i18n';

import { App } from './app/App';
import { StoreErrorBoundary } from './components/StoreErrorBoundary';
import { GRAPHQL_URL, MAIN_SITE_URL } from './config/env';
import { captureInstallPrompt, registerServiceWorker } from './lib/pwa';

configureLogs(httpTransport(GRAPHQL_URL.replace(/\/graphql$/, '/logs')), { platform: 'web', portal: 'ecomm' });

// The GA4 tag set for this website in Tech → Google Analytics, if any.
loadGoogleAnalytics(GRAPHQL_URL, 'ECOMM');

// The tracking-consent banner — GA above waits for its answer.
mountConsentBanner(consentBannerCopy(siteT), { policyUrl: `${MAIN_SITE_URL}/policies` });

// Installable, and the shell opens offline (production builds only).
captureInstallPrompt();
registerServiceWorker();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StoreErrorBoundary scope="root">
        <App />
      </StoreErrorBoundary>
    </StrictMode>,
  );
}
