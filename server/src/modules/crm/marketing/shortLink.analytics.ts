import geoip from 'geoip-lite';

export type DeviceType = 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | 'UNKNOWN';

export interface ParsedAgent {
  device_type: DeviceType;
  os: string;
  browser: string;
}

export interface GeoPoint {
  country: string | null;
  region: string | null;
  city: string | null;
}

/**
 * Ordered because user agents lie by inheritance: Edge claims Chrome, Chrome
 * claims Safari, and every in-app webview claims whatever engine it embeds.
 * First match wins, so the most specific claim has to be tested first.
 */
const BROWSERS: [RegExp, string][] = [
  [/Instagram/i, 'Instagram in-app'],
  [/FBAN|FBAV|FB_IAB/i, 'Facebook in-app'],
  [/\bLine\//i, 'LINE in-app'],
  [/Threads/i, 'Threads in-app'],
  [/GSA\//i, 'Google app'],
  [/EdgA?\//i, 'Edge'],
  [/OPR\/|Opera/i, 'Opera'],
  [/SamsungBrowser/i, 'Samsung Internet'],
  [/Firefox|FxiOS/i, 'Firefox'],
  [/CriOS|Chrome/i, 'Chrome'],
  [/Safari/i, 'Safari'],
];

const OSES: [RegExp, string][] = [
  [/Windows NT/i, 'Windows'],
  [/Android/i, 'Android'],
  [/iPhone|iPad|iPod|iOS/i, 'iOS'],
  [/Mac OS X|Macintosh/i, 'macOS'],
  [/CrOS/i, 'ChromeOS'],
  [/Linux/i, 'Linux'],
];

const BOT = /bot|crawler|spider|crawling|facebookexternalhit|WhatsApp|Slackbot|Twitterbot|TelegramBot|preview|headless/i;

const firstMatch = (patterns: [RegExp, string][], value: string, fallback: string) =>
  patterns.find(([pattern]) => pattern.test(value))?.[1] ?? fallback;

function deviceTypeOf(ua: string): DeviceType {
  if (BOT.test(ua)) return 'BOT';
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'TABLET';
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'MOBILE';
  return 'DESKTOP';
}

export function parseUserAgent(userAgent?: string | null): ParsedAgent {
  const ua = (userAgent ?? '').trim();
  if (!ua) return { device_type: 'UNKNOWN', os: 'Unknown', browser: 'Unknown' };
  return {
    device_type: deviceTypeOf(ua),
    os: firstMatch(OSES, ua, 'Unknown'),
    browser: firstMatch(BROWSERS, ua, 'Unknown'),
  };
}

/**
 * Referrer host -> the product a human would name. Keys are matched as domain
 * suffixes, so l.instagram.com and www.instagram.com both land on Instagram.
 */
const REFERRER_PLATFORMS: [string, string][] = [
  ['instagram.com', 'Instagram'],
  ['facebook.com', 'Facebook'],
  ['fb.me', 'Facebook'],
  ['threads.net', 'Threads'],
  ['whatsapp.com', 'WhatsApp'],
  ['wa.me', 'WhatsApp'],
  ['t.co', 'X (Twitter)'],
  ['twitter.com', 'X (Twitter)'],
  ['x.com', 'X (Twitter)'],
  ['linkedin.com', 'LinkedIn'],
  ['lnkd.in', 'LinkedIn'],
  ['youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
  ['t.me', 'Telegram'],
  ['telegram.me', 'Telegram'],
  ['reddit.com', 'Reddit'],
  ['discord.com', 'Discord'],
  ['google.', 'Google'],
  ['bing.com', 'Bing'],
  ['duckduckgo.com', 'DuckDuckGo'],
];

/** The in-app browser a click came through, when it names a product. */
const IN_APP_PLATFORMS: [string, string][] = [
  ['Instagram in-app', 'Instagram'],
  ['Facebook in-app', 'Facebook'],
  ['Threads in-app', 'Threads'],
  ['LINE in-app', 'LINE'],
];

function hostOf(referrer: string): string | null {
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Where the click actually came from.
 *
 * Referrer is the strongest signal but is routinely stripped — WhatsApp and
 * most native share sheets send none at all. When it is missing, the in-app
 * browser in the user agent still names the product, which is why both are
 * consulted before falling back to Direct.
 */
export function resolvePlatform(referrer?: string | null, userAgent?: string | null): string {
  const host = hostOf((referrer ?? '').trim());
  if (host) {
    const match = REFERRER_PLATFORMS.find(([domain]) => host.includes(domain));
    return match ? match[1] : host;
  }
  const browser = parseUserAgent(userAgent).browser;
  const inApp = IN_APP_PLATFORMS.find(([name]) => name === browser);
  return inApp ? inApp[1] : 'Direct';
}

export const referrerHost = (referrer?: string | null) => hostOf((referrer ?? '').trim());

/** Offline MaxMind-lite lookup — no network call on the redirect path. */
export function geoFromIp(ip?: string | null): GeoPoint {
  const found = ip ? geoip.lookup(ip) : null;
  if (!found) return { country: null, region: null, city: null };
  return {
    // A record always carries a country — that is what makes it a record.
    // Region and city are routinely blank, and blank means "not known".
    country: found.country,
    region: found.region || null,
    city: found.city || null,
  };
}

/**
 * The visitor's address, not the proxy's. nginx sets X-Forwarded-For, and the
 * left-most entry is the original client; everything after it is a hop.
 */
export function clientIpFrom(forwardedFor?: string | null, remoteAddress?: string | null): string | null {
  const forwarded = (forwardedFor ?? '').split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const remote = (remoteAddress ?? '').replace(/^::ffff:/, '').trim();
  return remote || null;
}
