import { mountDirectoryPortal, PODS_SPEC } from '@duncit/entity-consoles';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The pods console.
 *
 * Ships its brief first, without a `console`. The pods LIST is still admin's:
 * it reads admin's own `app-config` and reaches into the pod-monitoring
 * feature, so lifting it is a decoupling rather than the relocation the other
 * four consoles were. Until that is done the tiles report their numbers instead
 * of linking nowhere, and a pod's full detail already lives in
 * @duncit/pod-details, which admin, partners and the regional console all mount.
 */
mountDirectoryPortal({
  appConfig,
  spec: PODS_SPEC,
  devPort: 2034,
  subdomain: 'pods',
  logsPortal: logs.portal.pods,
});
