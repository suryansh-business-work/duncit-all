import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { godaddyDomain, godaddySetNameServers } from '@modules/platform/dns/godaddy.gateway';
import { cloudflareActivationCheck } from './cloudflare.gateway';
import {
  godaddyNameServers,
  nameServerSet,
  requireConnected,
  snapshot,
  snapshotWithZone,
  type Connected,
} from './cloudflare.snapshot';

/**
 * Changing the domain's nameservers at GoDaddy — the one write on this page
 * that decides what the whole internet resolves for every *.duncit.com host.
 *
 * Switching to Cloudflare is refused while any GoDaddy record is missing on
 * Cloudflare: that record would stop resolving the moment resolvers follow the
 * new delegation, and nothing would say so.
 */

export type NameServerTarget = 'CLOUDFLARE' | 'GODADDY' | 'CUSTOM';

/** A registrar takes 2 to 13 nameservers. */
const MIN_NAME_SERVERS = 2;
const MAX_NAME_SERVERS = 13;
const MAX_HOSTNAME = 253;
/** One DNS label: letters, digits and inner hyphens, 1–63 long. */
const LABEL_RE = /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/;
/** How many missing hosts a refusal names before it stops listing. */
const LISTED = 10;

const refuse = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const isHostname = (name: string) => {
  const labels = name.split('.');
  return name.length <= MAX_HOSTNAME && labels.length >= 2 && labels.every((label) => LABEL_RE.test(label));
};

/** Hand-typed nameservers, refused unless every one is a hostname a registrar will take. */
function customNameServers(list: readonly string[], domain: string): string[] {
  const servers = nameServerSet(list);
  if (servers.length < MIN_NAME_SERVERS || servers.length > MAX_NAME_SERVERS) {
    throw refuse(`Enter between ${MIN_NAME_SERVERS} and ${MAX_NAME_SERVERS} different nameservers.`);
  }
  const invalid = servers.filter((ns) => !isHostname(ns));
  if (invalid.length > 0) throw refuse(`These are not hostnames: ${invalid.join(', ')}`);
  // A nameserver inside the domain it serves needs glue records at the
  // registrar, which this console does not manage.
  if (servers.some((ns) => ns === domain || ns.endsWith(`.${domain}`))) {
    throw refuse(`A nameserver under ${domain} needs glue records at GoDaddy. Use nameservers outside ${domain}.`);
  }
  return servers;
}

/** Where a switch points the domain, and the Cloudflare zone it activates (null for any other target). */
interface Target {
  servers: string[];
  zoneId: string | null;
}

/** Cloudflare's assigned pair — only once every GoDaddy record is already on Cloudflare. */
async function cloudflareTarget(conn: Readonly<Connected>): Promise<Target> {
  const snap = await snapshotWithZone(conn);
  const missing = snap.compare.rows.filter((row) => row.state === 'GODADDY_ONLY');
  if (missing.length > 0) {
    const listed = missing.slice(0, LISTED).map((row) => `${row.type} ${row.host}`).join(', ');
    throw refuse(
      `${missing.length} GoDaddy record(s) are not on Cloudflare yet and would stop resolving: ${listed}. Copy them first.`
    );
  }
  const servers = nameServerSet(snap.zone.name_servers ?? []);
  if (servers.length === 0) throw refuse('Cloudflare has not assigned nameservers to this zone yet. Reload in a minute.');
  return { servers, zoneId: snap.zone.id };
}

async function resolveTarget(conn: Readonly<Connected>, target: NameServerTarget, custom: readonly string[]): Promise<Target> {
  if (target === 'CUSTOM') return { servers: customNameServers(custom, conn.godaddy.domain), zoneId: null };
  if (target === 'CLOUDFLARE') return cloudflareTarget(conn);
  const servers = godaddyNameServers((await snapshot(conn)).godaddyRecords);
  if (servers.length === 0) {
    throw refuse('The GoDaddy zone holds no NS records at @ to restore. Enter GoDaddy’s nameservers as custom ones.');
  }
  return { servers, zoneId: null };
}

/**
 * Cloudflare notices new nameservers on its own schedule; asking now makes the
 * zone go active sooner. It is rate-limited, so a refusal is logged and the
 * switch still stands — the nameservers already changed at GoDaddy.
 */
async function nudgeActivation(conn: Readonly<Connected>, zoneId: string): Promise<void> {
  try {
    await cloudflareActivationCheck(conn.cloudflare, zoneId);
  } catch (error) {
    logs.server.warn('cloudflare', 'activation-check', { domain: conn.cloudflare.domain, error });
  }
}

export const nameServerService = {
  async set(target: NameServerTarget, custom: readonly string[] | null | undefined, by: string) {
    const conn = await requireConnected();
    const next = await resolveTarget(conn, target, custom ?? []);
    const before = nameServerSet((await godaddyDomain(conn.godaddy)).nameServers ?? []);
    await godaddySetNameServers(conn.godaddy, next.servers);
    logs.server.info('cloudflare', 'name-servers', { domain: conn.godaddy.domain, target, from: before, to: next.servers, by });
    if (next.zoneId) await nudgeActivation(conn, next.zoneId);
    return true;
  },
};
