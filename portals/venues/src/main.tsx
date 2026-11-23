import { Route } from 'react-router';
import {
  mountDirectoryPortal,
  VenueEditorPage,
  VenuesPage,
  VENUES_SPEC,
} from '@duncit/entity-consoles';
import { VENUE_KIT_BUNDLE } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { EventRequestsPage } from '@duncit/shell';
import { appConfig } from './config/app-config';
import VenueRecordPage from './VenueRecordPage';
import VenueKitPage from './pages/venue-kit';

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
  // The Venue Kit section reads the shared venueKit.* copy the website page does.
  i18nFallback: VENUE_KIT_BUNDLE,
  console: {
    listPath: '/venues',
    nav: [
      { label: 'Venues', labelKey: 'shell.nav.venues', to: '/venues', icon: 'storefront' },
      { label: 'Event Requests', labelKey: 'shell.nav.eventRequests', to: '/event-requests', icon: 'calendar' },
      { label: 'Venue Kit', labelKey: 'shell.nav.venueKit', to: '/venue-kit', icon: 'inventory' },
    ],
    routes: (authed) => (
      <>
        {/* Static before dynamic so /venues/new is never read as a venue id. */}
        <Route path="/venues/new" element={authed(<VenueEditorPage />)} />
        <Route path="/venues" element={authed(<VenuesPage />)} />
        <Route path="/venue-kit" element={authed(<VenueKitPage />)} />
        <Route path="/event-requests" element={authed(<EventRequestsPage targetType="VENUE" scope="console" />)} />
        <Route path="/venues/:venueId" element={authed(<VenueRecordPage />)} />
        <Route path="/venues/:venueId/edit" element={authed(<VenueEditorPage />)} />
      </>
    ),
  },
});
