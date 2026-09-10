import { mountDirectoryPortal, CLUB_ADMINS_SPEC } from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The club admins console.
 *
 * Ships its brief first, with no `console`. Admin has no club admins section to
 * lift — this one is built new against the server's own `clubAdminProfilesTable`
 * rather than taken from another portal, so the list and detail land in their
 * own change. Until then the tiles report their numbers instead of linking
 * nowhere.
 */
mountDirectoryPortal({
  appConfig,
  spec: CLUB_ADMINS_SPEC,
  devPort: 2032,
  subdomain: 'club-admins',
  logsPortal: logs.portal['club-admins'],
});
