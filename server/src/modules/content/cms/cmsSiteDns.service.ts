import { dnsService } from '@modules/platform/dns/dns.service';
import { cmsSiteService } from './cmsSite.service';
import { badInput } from './cms.mappers';

/**
 * A website's own corner of the GoDaddy zone, for its Settings tab: the
 * address records of the hostnames the site answers on, and adding or
 * repointing an A record for one of them.
 *
 * Everything goes through the Tech → Domain service (`dns.service.ts`): the
 * same IPv4 check, the same set-based writes GoDaddy needs, the same audit
 * log line. This file only decides WHICH records a website may touch — its
 * own hostnames, inside the configured zone, A records only.
 */
const ADDRESS_TYPES = new Set(['A', 'AAAA', 'CNAME']);
const DEFAULT_TTL = 600;

/** `duncit.com` in zone `duncit.com` → `@`; `www.duncit.com` → `www`; outside → null. */
export function recordName(host: string, zone: string): string | null {
  if (!zone) return null;
  if (host === zone) return '@';
  return host.endsWith(`.${zone}`) ? host.slice(0, -(zone.length + 1)) : null;
}

export const cmsSiteDnsService = {
  async records(siteId: string) {
    const site = await cmsSiteService.requireDoc(siteId);
    const zone = await dnsService.zone();
    const hosts = site.domains.map((host) => {
      const name = zone.configured ? recordName(host, zone.domain) : null;
      return {
        host,
        name: name ?? '',
        in_zone: name !== null,
        records: name === null ? [] : zone.records.filter((record) => record.name === name && ADDRESS_TYPES.has(record.type)),
      };
    });
    return { configured: zone.configured, zone: zone.domain, hosts };
  },

  /**
   * Adds an A record for one of the site's hostnames, or — with `current` —
   * repoints that exact record. A hostname the site does not list, or one
   * outside the zone, is refused before GoDaddy is asked anything.
   */
  async setARecord(siteId: string, input: { host: string; ip: string; ttl?: number | null; current?: string | null }, by: string) {
    const site = await cmsSiteService.requireDoc(siteId);
    const host = input.host.trim().toLowerCase();
    if (!site.domains.includes(host)) throw badInput(`${host} is not one of this website's domains`);
    const zone = await dnsService.zone();
    const name = zone.configured ? recordName(host, zone.domain) : null;
    if (name === null) throw badInput(`${host} is not in the GoDaddy zone configured in Tech → Domain`);
    const record = { type: 'A', name, data: input.ip.trim(), ttl: input.ttl ?? DEFAULT_TTL };
    if (input.current) return dnsService.update({ type: 'A', name, data: input.current }, record, by);
    return dnsService.add(record, by);
  },
};
