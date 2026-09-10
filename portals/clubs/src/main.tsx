import { Route } from 'react-router';
import {
  ClubDetailsPage,
  ClubEditorPage,
  ClubsPage,
  mountDirectoryPortal,
  CLUBS_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The clubs console — admin's Clubs section and its editor, on its own
 * subdomain. Admin no longer carries them.
 */
mountDirectoryPortal({
  appConfig,
  spec: CLUBS_SPEC,
  devPort: 2031,
  subdomain: 'clubs',
  logsPortal: logs.portal.clubs,
  console: {
    listPath: '/clubs',
    nav: [{ label: 'Clubs', labelKey: 'shell.nav.clubs', to: '/clubs', icon: 'community' }],
    routes: (authed) => (
      <>
        {/* Static before dynamic so /clubs/new is never read as a club id. */}
        <Route path="/clubs/new" element={authed(<ClubEditorPage />)} />
        <Route path="/clubs" element={authed(<ClubsPage />)} />
        <Route path="/clubs/:id" element={authed(<ClubDetailsPage />)} />
        <Route path="/clubs/:id/edit" element={authed(<ClubEditorPage />)} />
      </>
    ),
  },
});
