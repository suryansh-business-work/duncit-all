// Self-hosted Nunito — replaces the Google Fonts <link> in index.html.
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureLogs, httpTransport } from '@duncit/logs';
import { captureShortLinkAttribution, installAttributionLinkDecorator } from '@duncit/utils';
import { SERVER_BASE } from './config/server';
import App from './App';

// Ship console errors to SignOz (via the server /logs ingest).
configureLogs(httpTransport(`${SERVER_BASE}/logs`), { platform: 'web' });

// Short-link attribution: a duncit.com marketing link may land here carrying
// dl/dlc markers. The shared helper verifies them against the API and records
// the visit; ordinary traffic costs one no-op call.
captureShortLinkAttribution({
  search: window.location.search,
  referrer: document.referrer,
  serverUrl: SERVER_BASE,
});
// Keep the tags on every hyperlink out to another duncit surface.
installAttributionLinkDecorator();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
