import { Route } from 'react-router';
import {
  HostDetailsPage,
  HostEditorPage,
  HostsPage,
  mountDirectoryPortal,
  HOSTS_SPEC,
} from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The hosts console.
 *
 * Built against the server's own `hostsTable` and `host(host_doc_id:)` rather
 * than lifted from another portal: admin never had a hosts section. The list,
 * the record, the pods they run and the editor are all here, and every field
 * that moves is appended to the record's change log.
 */
mountDirectoryPortal({
  appConfig,
  spec: HOSTS_SPEC,
  devPort: 2033,
  subdomain: 'hosts',
  logsPortal: logs.portal['hosts'],
  console: {
    listPath: '/hosts',
    nav: [{ label: 'Hosts', labelKey: 'shell.nav.hosts', to: '/hosts', icon: 'people' }],
    routes: (authed) => (
      <>
        {/* Static before dynamic so /hosts/new is never read as a host id. */}
        <Route path="/hosts/new" element={authed(<HostEditorPage />)} />
        <Route path="/hosts" element={authed(<HostsPage />)} />
        <Route path="/hosts/:hostId" element={authed(<HostDetailsPage />)} />
        <Route path="/hosts/:hostId/edit" element={authed(<HostEditorPage />)} />
      </>
    ),
  },
});
