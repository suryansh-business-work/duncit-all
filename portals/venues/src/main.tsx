import { Route } from 'react-router';
import {
  mountDirectoryPortal,
  VenueDetailsPage,
  VenuesPage,
  VENUES_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The venues console — admin's Venues section, on its own subdomain.
 *
 * The list and detail are the ones admin rendered; admin no longer carries
 * them, so there is one implementation and one place it lives.
 */
mountDirectoryPortal({
  appConfig,
  spec: VENUES_SPEC,
  devPort: 2030,
  subdomain: 'venues',
  logsPortal: logs.portal.venues,
  console: {
    listPath: '/venues',
    nav: [{ label: 'Venues', labelKey: 'shell.nav.venues', to: '/venues', icon: 'storefront' }],
    routes: (authed) => (
      <>
        <Route path="/venues" element={authed(<VenuesPage />)} />
        <Route path="/venues/:venueId" element={authed(<VenueDetailsPage />)} />
      </>
    ),
  },
});
