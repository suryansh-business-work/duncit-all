import { Route } from 'react-router';
import {
  ClubAdminDetailsPage,
  ClubAdminEditorPage,
  ClubAdminsPage,
  mountDirectoryPortal,
  CLUB_ADMINS_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The club admins console.
 *
 * Built against the server's own `clubAdminProfilesTable` — admin had no club
 * admins section to lift. The list, the record, the clubs each of them runs and
 * the editor are all here, and every field that moves is appended to the
 * record's change log.
 */
mountDirectoryPortal({
  appConfig,
  spec: CLUB_ADMINS_SPEC,
  devPort: 2032,
  subdomain: 'club-admins',
  logsPortal: logs.portal['club-admins'],
  console: {
    listPath: '/club-admins',
    nav: [
      {
        label: 'Club Admins',
        labelKey: 'shell.nav.clubAdmins',
        to: '/club-admins',
        icon: 'people',
      },
    ],
    routes: (authed) => (
      <>
        {/* Static before dynamic so /club-admins/new is never read as an id. */}
        <Route path="/club-admins/new" element={authed(<ClubAdminEditorPage />)} />
        <Route path="/club-admins" element={authed(<ClubAdminsPage />)} />
        <Route path="/club-admins/:clubAdminId" element={authed(<ClubAdminDetailsPage />)} />
        <Route path="/club-admins/:clubAdminId/edit" element={authed(<ClubAdminEditorPage />)} />
      </>
    ),
  },
});
