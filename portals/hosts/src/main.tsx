import { mountDirectoryPortal, HOSTS_SPEC } from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The hosts console.
 *
 * Ships its brief first, with no `console`. Admin has no hosts section to
 * lift — this one is built new against the server's own `hostsTable`
 * rather than taken from another portal, so the list and detail land in their
 * own change. Until then the tiles report their numbers instead of linking
 * nowhere.
 */
mountDirectoryPortal({
  appConfig,
  spec: HOSTS_SPEC,
  devPort: 2033,
  subdomain: 'hosts',
  logsPortal: logs.portal['hosts'],
});
