import { GraphQLError } from 'graphql';

/**
 * Where a duncit.com short link is allowed to point.
 *
 * The link carries OUR brand, so the answer is not "anywhere". It is also not
 * the classic open-redirect hole — nothing in the REQUEST picks a destination,
 * a marketer with the role does — so the job here is narrower than it looks:
 * stop a compromised or careless marketing account turning duncit.com into a
 * hop to somewhere it should never reach.
 *
 * Two classes come out of this:
 *  - FIRST PARTY: our own sites and the two app stores. Unchanged from the day
 *    short links shipped, http included, because some of our own internal
 *    tooling is still served that way.
 *  - EXTERNAL: any other PUBLIC https host. A partner's site, a press piece, a
 *    form, a ticketing page. https only — a duncit.com link that downgrades to
 *    plaintext is our name on an insecure page.
 *
 * Everything below is what "public" excludes, and each exclusion is a real
 * failure mode rather than a theoretical one.
 */

const APP_STORE_HOSTS = new Set(['play.google.com', 'apps.apple.com']);

export const isDuncitHost = (host: string) =>
  host === 'duncit.com' || host.endsWith('.duncit.com');

/** Our own properties plus the app stores. Anything else is external. */
const isFirstPartyHost = (host: string) => isDuncitHost(host) || APP_STORE_HOSTS.has(host);

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

/** A URL longer than this is not a campaign destination; it is a payload. */
const MAX_DESTINATION_LENGTH = 2048;

const bad = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

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
  const head = address.split(':')[0] ?? '';
  return /^f[cd]/.test(head) || /^fe[89ab]/.test(head);
}

/**
 * A host nobody outside our own network could resolve the same way, whatever
 * DNS says today. Refused before the domain blocklist, because a blocklist
 * cannot enumerate these.
 */
function isNonPublicHost(host: string): boolean {
  if (host === 'localhost' || !host.includes('.')) return true;
  if (RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  if (isPrivateIpv6(host)) return true;
  const octets = ipv4Octets(host);
  if (octets) return isPrivateIpv4(octets);
  return false;
}

/** A blocked entry covers the domain itself and everything under it. */
const matchesDomain = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

/** What a blocked-domain entry is stored as: a bare host, lower-cased. */
export function normaliseBlockedDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  const withScheme = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export interface ClassifiedDestination {
  /** The normalised URL to store. */
  url: string;
  /** False for our own sites and the app stores, true for everything else. */
  is_external: boolean;
}

function parseDestination(raw: string): URL {
  if (raw.length > MAX_DESTINATION_LENGTH) {
    throw bad(`Keep the destination under ${MAX_DESTINATION_LENGTH} characters`);
  }
  try {
    return new URL(raw);
  } catch {
    throw bad('Destination must be a full URL, including https://');
  }
}

/** Credentials in a URL are a phishing pattern, never a campaign link. */
function rejectCredentials(url: URL) {
  if (url.username || url.password) {
    throw bad('A destination cannot carry a username or password');
  }
}

function checkExternal(url: URL, blockedDomains: readonly string[]) {
  if (url.protocol !== 'https:') {
    throw bad('An external destination has to be https — a duncit.com link never downgrades to http');
  }
  if (isNonPublicHost(url.hostname)) {
    throw bad('That address is not reachable on the public internet, so a short link to it would go nowhere');
  }
  const blocked = blockedDomains.find((domain) => matchesDomain(url.hostname, domain));
  if (blocked) {
    throw bad(`${blocked} is on the blocked-domain list — ask an admin if this link is meant to go out`);
  }
}

/**
 * Validate a hand-typed destination and say which class it is.
 *
 * Share links do NOT come through here: their destination is built by the
 * server from the thing being shared, so no caller ever picks it.
 */
export function classifyDestination(
  raw: string,
  blockedDomains: readonly string[] = [],
): ClassifiedDestination {
  const url = parseDestination(raw.trim());
  rejectCredentials(url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw bad('Destination must be an http or https URL');
  }
  const host = url.hostname.toLowerCase();
  if (isFirstPartyHost(host)) return { url: url.toString(), is_external: false };
  checkExternal(url, blockedDomains);
  return { url: url.toString(), is_external: true };
}
