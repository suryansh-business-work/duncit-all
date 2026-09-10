import {
  mountDirectoryPortal,
  VenueDetailsPage,
  VenuesPage,
  VENUES_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The venues console.
 *
 * Everything a directory portal does — Apollo, session, chrome, login, routes,
 * the brief dashboard and the copy namespace — comes from
 * @duncit/entity-consoles, so what lives here is this console's identity and
 * nothing else (rule 40). The list and detail screens are the SAME ones the
 * onboarding portal renders: one implementation, three mounts.
 */
mountDirectoryPortal({
  appConfig,
  spec: VENUES_SPEC,
  devPort: 2030,
  subdomain: 'venues',
  logsPortal: logs.portal.venues,
  console: {
    listPath: '/venues',
    // What VenueDetailsPage reads out of the URL.
    detailParam: 'venueId',
    List: VenuesPage,
    Detail: VenueDetailsPage,
    navLabelKey: 'shell.nav.venues',
    navIcon: 'storefront',
  },
});
