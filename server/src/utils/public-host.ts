/**
 * Whether a host is reachable on the public internet.
 *
 * Two jobs share this rule: refusing a short-link destination nobody outside
 * our own network could open (shortLink.destination.ts), and refusing to point
 * a server-side fetch at this host, this LAN or the cloud metadata service
 * (open-graph.ts). One copy, so the two can never disagree about what
 * "private" means.
 */

/**
 * Suffixes that never name a host on the public internet. `.local` and
 * `.internal` resolve differently inside every network the link is opened on,
 * so a link built with one points at whatever the READER's network calls that
 * name — which is the whole trick behind an internal-service redirect.
 */
const RESERVED_SUFFIXES = [
  '.local',
  '.localhost',
  '.localdomain',
  '.internal',
  '.intranet',
  '.private',
  '.corp',
  '.home',
  '.home.arpa',
  '.lan',
  '.test',
  '.example',
  '.invalid',
  '.onion',
];

/** 1.2.3.4 -> [1, 2, 3, 4]; anything else -> null. */
function ipv4Octets(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number.parseInt(part, 10);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

/**
 * The address ranges that are not reachable from the public internet, so a
 * link pointing at one only ever means something on the network of whoever
 * opens it: this host, this LAN, the cloud metadata service.
 */
function isPrivateIpv4(octets: number[]): boolean {
  const [a = 0, b = 0, c = 0] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  return a >= 224; // multicast and reserved
}

/** `[::1]`, `[fc00::…]`, `[fe80::…]` — loopback, unique-local, link-local. */
function isPrivateIpv6(host: string): boolean {
  if (!host.startsWith('[') || !host.endsWith(']')) return false;
  const address = host.slice(1, -1).toLowerCase();
  if (address === '::1' || address === '::') return true;
  // An IPv4 address wearing an IPv6 prefix is that IPv4 address.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address)?.[1];
  if (mapped) return isPrivateIpv4(ipv4Octets(mapped) ?? [0]);
  const head = address.split(':')[0] ?? '';
  return /^f[cd]/.test(head) || /^fe[89ab]/.test(head);
}

/**
 * A host nobody outside our own network could resolve the same way, whatever
 * DNS says today. Every IPv6 literal (`[…]`, no dot) is refused by the first
 * line: campaigns are run against names, not raw addresses.
 */
export function isNonPublicHost(host: string): boolean {
  if (host === 'localhost' || !host.includes('.')) return true;
  if (RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  if (isPrivateIpv6(host)) return true;
  const octets = ipv4Octets(host);
  if (octets) return isPrivateIpv4(octets);
  return false;
}

/** A resolved address (as `dns.lookup` returns it) that is not public. */
export function isNonPublicAddress(address: string, family: number): boolean {
  return family === 6 ? isPrivateIpv6(`[${address}]`) : isNonPublicHost(address);
}
