/**
 * Tech → Domain → Port Mapping: which domain nginx hands to which local port,
 * read live from the host's `sites-available`. Read-only — the vhosts are
 * still installed by the deploy (`deploy/nginx/*`) and certbot.
 *
 * Production and staging share the host, so both consoles show both sites.
 */
import { parsePortMap, type PortMapRoute, type PortMapSite } from './portMap.parse';
import { readNginxSites } from './portMap.host';

export interface PortMapOverview {
  available: boolean;
  error: string | null;
  sites: PortMapSite[];
  routes: PortMapRoute[];
  checked_at: string;
}

export const portMapService = {
  async overview(): Promise<PortMapOverview> {
    const { dump, error } = await readNginxSites();
    const parsed = error ? { sites: [], routes: [] } : parsePortMap(dump);
    return { available: !error, error, ...parsed, checked_at: new Date().toISOString() };
  },
};
