import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { configureLogs, httpTransport } from '@duncit/logs';

import { App } from './app/App';
import { GRAPHQL_URL } from './config/env';

configureLogs(httpTransport(GRAPHQL_URL.replace(/\/graphql$/, '/logs')), { platform: 'web', portal: 'ecomm' });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
