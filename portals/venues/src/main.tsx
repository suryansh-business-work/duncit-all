import { Route } from 'react-router';
import {
  mountDirectoryPortal,
  VenueEditorPage,
  VenuesPage,
  VENUES_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { EventRequestsPage } from '@duncit/shell';
import { appConfig } from './config/app-config';
import VenueRecordPage from './VenueRecordPage';

/**
 * The venues console — admin's Venues section, on its own subdomain.
 *
 * The list, the record and the editor are all here: a venue is registered,
 * corrected and re-configured from one place, and every field that moves is
 * appended to the record's change log.
 */
mountDirectoryPortal({
  appConfig,
  spec: VENUES_SPEC,
  devPort: 2030,
  subdomain: 'venues',
  logsPortal: logs.portal.venues,
  console: {
    listPath: '/venues',
    nav: [
      { label: 'Venues', labelKey: 'shell.nav.venues', to: '/venues', icon: 'storefront' },
      { label: 'Event Requests', labelKey: 'shell.nav.eventRequests', to: '/event-requests', icon: 'calendar' },
    ],
    routes: (authed) => (
      <>
        {/* Static before dynamic so /venues/new is never read as a venue id. */}
        <Route path="/venues/new" element={authed(<VenueEditorPage />)} />
        <Route path="/venues" element={authed(<VenuesPage />)} />
        <Route path="/event-requests" element={authed(<EventRequestsPage targetType="VENUE" scope="console" />)} />
        <Route path="/venues/:venueId" element={authed(<VenueRecordPage />)} />
        <Route path="/venues/:venueId/edit" element={authed(<VenueEditorPage />)} />
      </>
    ),
  },
});
