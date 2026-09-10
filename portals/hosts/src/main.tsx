import {
  mountDirectoryPortal,
  HostDetailsPage,
  HostsPage,
  HOSTS_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The hosts console.
 *
 * Everything a directory portal does — Apollo, session, chrome, login, routes,
 * the brief dashboard and the copy namespace — comes from
 * @duncit/entity-consoles, so what lives here is this console's identity and
 * nothing else (rule 40). The list and detail screens are the SAME ones the
 * onboarding portal renders: one implementation, two mounts.
 */
mountDirectoryPortal({
  appConfig,
  spec: HOSTS_SPEC,
  devPort: 2033,
  subdomain: 'hosts',
  logsPortal: logs.portal['hosts'],
  console: {
    listPath: '/hosts',
    detailParam: 'hostId',
    List: HostsPage,
    Detail: HostDetailsPage,
    navLabelKey: 'shell.nav.hosts',
    navIcon: 'community',
  },
});
