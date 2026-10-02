import { GraphQLError } from 'graphql';
import { isNonPublicHost } from '@utils/public-host';

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
 * What "public" excludes lives in @utils/public-host, shared with the
 * server-side fetch that reads a destination's link-preview tags.
 */

const APP_STORE_HOSTS = new Set(['play.google.com', 'apps.apple.com']);

export const isDuncitHost = (host: string) =>
  host === 'duncit.com' || host.endsWith('.duncit.com');

/** Our own properties plus the app stores. Anything else is external. */
const isFirstPartyHost = (host: string) => isDuncitHost(host) || APP_STORE_HOSTS.has(host);

/** A URL longer than this is not a campaign destination; it is a payload. */
const MAX_DESTINATION_LENGTH = 2048;

const bad = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

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
