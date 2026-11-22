import type { ReactElement } from 'react';
import { Route } from 'react-router';
import ClubAdminHostsPage from './ClubAdminHostsPage';
import ClubAdminHostDetailPage from '../club-admin-host-detail-page/ClubAdminHostDetailPage';

/**
 * Club Admin › Your Clubs › Hosts and one host's page. `authed` is the
 * console's page wrapper (AppShell + SectionGate + an error boundary per page),
 * so both sit under the CLUB_ADMIN section like the club's pods routes.
 */
export function clubHostRoutes(authed: (page: ReactElement) => ReactElement) {
  return (
    <>
      <Route path="/club-admin/clubs/:clubId/hosts" element={authed(<ClubAdminHostsPage />)} />
      <Route path="/club-admin/clubs/:clubId/hosts/:userId" element={authed(<ClubAdminHostDetailPage />)} />
    </>
  );
}
