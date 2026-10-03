/**
 * A duncit.com short link points at one of two things, and the form has to
 * know which it is being used for.
 *
 * TWIN: server/src/modules/crm/marketing/shortLink.destination.ts owns the
 * real rule and refuses anything this misses — including the admin-managed
 * blocked-domain list, which only the server can know. These copies exist so
 * the marketer is told before they submit, not after.
 */
const ALLOWED_STORE_HOSTS = new Set(['play.google.com', 'apps.apple.com']);

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

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isDuncitHost = (host: string) => host === 'duncit.com' || host.endsWith('.duncit.com');

/** Our own sites and the two app stores — what a link could always point at. */
export const isAllowedDestination = (value: string) => {
  const url = parseUrl(value);
  if (!url) return false;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname;
  return isDuncitHost(host) || ALLOWED_STORE_HOSTS.has(host);
};

/** 1.2.3.4 with every octet in range — anything else is a name, not an address. */
const isIpv4 = (host: string) =>
  host.split('.').length === 4 &&
  host
    .split('.')
    .every((part) => /^\d{1,3}$/.test(part) && Number.parseInt(part, 10) <= 255);

/**
 * A host that only means something inside somebody's own network. A short link
 * to one of these points at whatever the READER's network calls that name,
 * which is the trick behind an internal-service redirect rather than a typo.
 *
 * Raw addresses are refused outright here: campaigns are run against names,
 * and telling the difference between a public and a private address is the
 * server's job, where the full range table lives.
 */
const isNonPublicHost = (host: string) =>
  host === 'localhost' ||
  !host.includes('.') ||
  isIpv4(host) ||
  host.startsWith('[') ||
  RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix));

/**
 * A destination outside Duncit: any public https host.
 *
 * https only, because a duncit.com link that downgrades to plaintext puts our
 * name on an insecure page. A Duncit address is refused too — not because it
 * is unsafe, but because it belongs on the Short Links page, and a link made
 * here would never appear in this list.
 */
export const isAllowedExternalDestination = (value: string) => {
  const url = parseUrl(value);
  if (!url) return false;
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (isDuncitHost(host) || ALLOWED_STORE_HOSTS.has(host)) return false;
  return !isNonPublicHost(host);
};
