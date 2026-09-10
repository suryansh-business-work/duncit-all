import { mountDirectoryPortal, CLUB_ADMINS_SPEC } from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The club-admins console.
 *
 * Everything a directory portal does — Apollo, session, chrome, login, routes,
 * the brief dashboard and the copy namespace — comes from
 * @duncit/entity-consoles, so what lives here is this console's identity and
 * nothing else (rule 40).
 */
mountDirectoryPortal({
  appConfig,
  spec: CLUB_ADMINS_SPEC,
  devPort: 2032,
  subdomain: 'club-admins',
  logsPortal: logs.portal['club-admins'],
});
