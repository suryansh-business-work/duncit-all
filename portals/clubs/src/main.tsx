import { Route } from 'react-router';
import {
  ClubAdminEditorPage,
  ClubAdminInClubPage,
  ClubDetailsPage,
  ClubEditorPage,
  ClubsPage,
  HostEditorPage,
  HostInClubPage,
  mountDirectoryPortal,
  PodEditorInClubPage,
  PodInClubPage,
  CLUBS_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The clubs console — admin's Clubs section and its editor, on its own
 * subdomain. Admin no longer carries them.
 *
 * A club's hosts, admins and pods open here too, as the hosts, club-admins and
 * pods consoles' own record pages and editors: hosts and admins UNDER the club,
 * because either can belong to several and Back has to know which one the
 * reader came from; pods at `/pods/:id`, because a pod has exactly one club and
 * a host's Pods tab links there too.
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
        <Route path="/clubs/:clubId/hosts/:hostId" element={authed(<HostInClubPage />)} />
        <Route path="/clubs/:clubId/hosts/:hostId/edit" element={authed(<HostEditorPage />)} />
        <Route
          path="/clubs/:clubId/club-admins/:clubAdminId"
          element={authed(<ClubAdminInClubPage />)}
        />
        <Route
          path="/clubs/:clubId/club-admins/:clubAdminId/edit"
          element={authed(<ClubAdminEditorPage />)}
        />
        <Route path="/pods/:id" element={authed(<PodInClubPage />)} />
        <Route path="/pods/:id/edit" element={authed(<PodEditorInClubPage />)} />
      </>
    ),
  },
});
