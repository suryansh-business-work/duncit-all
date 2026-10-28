import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { createLiteClient } from '../shared/apollo';
import { STORAGE_KEYS } from '../shared/env';
import { SSR_STATE_GLOBAL, type LiteSsrState } from '../shared/ssr-contract';
import { readStored } from '../shared/storage';
import { App } from './App';
import { registerServiceWorker } from './pwa';
import { routes } from './routes';

declare global {
  interface Window {
    [SSR_STATE_GLOBAL]?: LiteSsrState;
  }
}

const root = document.getElementById('root');
if (root) {
  const ssr = globalThis.window[SSR_STATE_GLOBAL];
  const client = createLiteClient(STORAGE_KEYS.token, 'WEBSITE', { initialState: ssr?.apollo });
  // Hydration must start from what the server drew: signed out stays signed out
  // for the first paint, and the session adopts any stored token right after.
  // With no server render at all, the session reads storage itself (undefined).
  let initialToken: string | null | undefined;
  if (ssr) initialToken = ssr.signedIn ? readStored(STORAGE_KEYS.token) : null;
  const app = (
    <StrictMode>
      <App client={client} initialToken={initialToken}>
        <RouterProvider router={createBrowserRouter(routes)} />
      </App>
    </StrictMode>
  );
  if (ssr && root.hasChildNodes()) hydrateRoot(root, app);
  else createRoot(root).render(app);
  registerServiceWorker();
}
