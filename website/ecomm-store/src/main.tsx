import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { configureLogs, httpTransport } from '@duncit/logs';
import { loadGoogleAnalytics } from '@duncit/brand/google-analytics';

import { App } from './app/App';
import { GRAPHQL_URL } from './config/env';

configureLogs(httpTransport(GRAPHQL_URL.replace(/\/graphql$/, '/logs')), { platform: 'web', portal: 'ecomm' });

// The GA4 tag set for this website in Tech → Google Analytics, if any.
loadGoogleAnalytics(GRAPHQL_URL, 'ECOMM');

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
