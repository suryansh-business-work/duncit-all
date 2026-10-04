/**
 * Turns the host's nginx `sites-available`, as `portMap.host.ts` prints it,
 * into which domain (and path) nginx hands to which local port.
 *
 * Only the mapping crosses into the API — domains, paths and upstream
 * addresses. Header values, auth includes and the rest of each file stay on
 * the host.
 */
import { childrenNamed, parseNginx, type NginxDirective } from './nginx.parse';

export const SITE_MARK = '@@SITE ';
export const END_MARK = '@@END';

/** nginx's catch-all name — a default server, not a domain anyone visits. */
const CATCH_ALL = '_';
const PASS_DIRECTIVES = new Set(['proxy_pass', 'grpc_pass']);
const DEFAULT_PORT: Record<string, number> = { http: 80, https: 443, grpc: 80, grpcs: 443 };
const AUTHORITY = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/;
const SCHEME = /^([a-z]+):\/\//i;
/** `443`, `[::]:443`, `0.0.0.0:443` — not `8443`. */
const HTTPS_LISTEN = /(?:^|:)443$/;

export interface PortMapSite {
  name: string;
  /** Linked into `sites-enabled` — nginx actually serves it. */
  enabled: boolean;
  domain_count: number;
}

export interface PortMapRoute {
  site: string;
  enabled: boolean;
  domain: string;
  location: string;
  /** The `proxy_pass` target exactly as written. */
  target: string;
  host: string | null;
  /** Null when the target is a unix socket or built from variables. */
  port: number | null;
  /** The domain answers HTTPS (some server block for it listens on 443 / ssl). */
  tls: boolean;
}

interface SiteFile {
  name: string;
  enabled: boolean;
  body: string;
}

/** Splits the dump into `sites-available` files, each flagged with whether `sites-enabled` links it. */
export function splitSites(dump: string): SiteFile[] {
  const sites: SiteFile[] = [];
  let current: SiteFile | null = null;
  for (const line of dump.split('\n')) {
    if (line.startsWith(SITE_MARK)) {
      const [flag, ...name] = line.slice(SITE_MARK.length).trim().split(' ');
      current = { name: name.join(' '), enabled: flag === '1', body: '' };
      sites.push(current);
    } else if (line.startsWith(END_MARK)) {
      current = null;
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  return sites;
}

/** Upstream name → its first `server` address. */
function upstreamsOf(root: NginxDirective[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const upstream of childrenNamed(root, 'upstream')) {
    const first = childrenNamed(upstream.block, 'server')[0]?.args[0];
    const name = upstream.args[0];
    if (name && first) map.set(name, first);
  }
  return map;
}

/** Every pass target under a block, with the location it sits in (`if` blocks keep their parent's). */
function passesIn(block: NginxDirective[], location: string): { location: string; target: string }[] {
  return block.flatMap((directive) => {
    const target = directive.args[0];
    if (PASS_DIRECTIVES.has(directive.name) && target) return [{ location, target }];
    if (directive.name === 'location' && directive.block) return passesIn(directive.block, directive.args.join(' '));
    if (directive.name === 'if' && directive.block) return passesIn(directive.block, location);
    return [];
  });
}

/** `http://127.0.0.1:2001/x` → host + port, resolving an upstream name; variables and sockets have no port. */
export function resolveTarget(target: string, upstreams: Map<string, string>): { host: string | null; port: number | null } {
  const scheme = SCHEME.exec(target)?.[1]?.toLowerCase() ?? 'http';
  const authority = target.replace(SCHEME, '').split('/')[0] ?? '';
  if (!authority || authority.includes('$')) return { host: null, port: null };
  const address = upstreams.get(authority) ?? authority;
  if (address.startsWith('unix:')) return { host: address, port: null };
  const match = AUTHORITY.exec(address);
  if (!match) return { host: address, port: null };
  const port = match[2] ? Number(match[2]) : (DEFAULT_PORT[scheme] ?? null);
  return { host: match[1] ?? null, port };
}

const listensTls = (server: NginxDirective) =>
  childrenNamed(server.block, 'listen').some((listen) => listen.args.includes('ssl') || HTTPS_LISTEN.test(listen.args[0] ?? ''));

const domainsOf = (server: NginxDirective) =>
  childrenNamed(server.block, 'server_name').flatMap((d) => d.args).filter((name) => name !== CATCH_ALL);

/** One site file's routes: an entry per (domain, location, target), however many server blocks repeat it. */
function routesOfSite(site: SiteFile): PortMapRoute[] {
  const root = parseNginx(site.body);
  const upstreams = upstreamsOf(root);
  const servers = childrenNamed(root, 'server');
  const tlsDomains = new Set(servers.filter(listensTls).flatMap(domainsOf));
  const routes = new Map<string, PortMapRoute>();
  for (const server of servers) {
    const passes = passesIn(server.block ?? [], '/');
    for (const domain of domainsOf(server)) {
      for (const { location, target } of passes) {
        const key = `${domain}|${location}|${target}`;
        if (routes.has(key)) continue;
        const { host, port } = resolveTarget(target, upstreams);
        routes.set(key, { site: site.name, enabled: site.enabled, domain, location, target, host, port, tls: tlsDomains.has(domain) });
      }
    }
  }
  return [...routes.values()];
}

/** Every site file and every domain → port route across them, sorted by domain then location. */
export function parsePortMap(dump: string): { sites: PortMapSite[]; routes: PortMapRoute[] } {
  const files = splitSites(dump);
  const perSite = files.map(routesOfSite);
  const sites = files.map((file, i) => ({
    name: file.name,
    enabled: file.enabled,
    domain_count: new Set(perSite[i]?.map((route) => route.domain)).size,
  }));
  const routes = perSite
    .flat()
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.location.localeCompare(b.location));
  return { sites, routes };
}
