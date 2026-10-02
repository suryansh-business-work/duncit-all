// Self-hosted Nunito — replaces the Google Fonts <link> in index.html.
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureLogs, httpTransport } from '@duncit/logs';
import { loadGoogleAnalytics } from '@duncit/brand/google-analytics';
import { consentBannerCopy, mountConsentBanner } from '@duncit/brand/consent-banner';
import { siteT } from '@duncit/brand/site-i18n';
import { startWebShortLinkAttribution } from '@duncit/utils';
import { MAIN_SITE_URL, SERVER_BASE } from './config/server';
import { TranslationProvider } from './i18n';
import App from './App';

// Ship console errors to SignOz (via the server /logs ingest).
configureLogs(httpTransport(`${SERVER_BASE}/logs`), { platform: 'web' });

// Short-link attribution: a duncit.com marketing link may land here carrying
// dl/dlc markers. The shared helper verifies them against the API and records
// the visit; ordinary traffic costs one no-op call. Only with marketing
// consent is the click remembered (consent banner).
startWebShortLinkAttribution(SERVER_BASE).catch((error) =>
  console.warn('Attribution did not start', error)
);

// The GA4 tag set for this website in Tech → Google Analytics, if any.
loadGoogleAnalytics(`${SERVER_BASE}/graphql`, 'STATUS');

// The tracking-consent banner — GA and attribution above wait for its answer.
mountConsentBanner(consentBannerCopy(siteT), { policyUrl: `${MAIN_SITE_URL}/policies` });

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    {/* Localization wraps the whole tree: the loading skeleton and the report
        form both render copy before any status data has arrived. */}
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </StrictMode>,
);
