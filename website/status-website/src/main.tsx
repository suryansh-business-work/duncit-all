import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { captureConsole, configureLogs, httpTransport, logs } from '@duncit/logs';
import { SERVER_BASE } from './config/server';
import App from './App';

// Ship console errors to SignOz (via the server /logs ingest).
configureLogs(httpTransport(`${SERVER_BASE}/logs`));
captureConsole(logs.website.status);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
