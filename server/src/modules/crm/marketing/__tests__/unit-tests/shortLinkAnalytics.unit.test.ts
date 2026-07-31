import {
  clientIpFrom,
  geoFromIp,
  parseUserAgent,
  referrerHost,
  resolvePlatform,
} from '../../shortLink.analytics';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1';
const INSTAGRAM_APP = `${ANDROID_CHROME} Instagram 300.0.0.0 Android`;

describe('parseUserAgent', () => {
  it('reads device, OS and browser off a real agent', () => {
    expect(parseUserAgent(IPHONE_SAFARI)).toEqual({
      device_type: 'MOBILE',
      os: 'iOS',
      browser: 'Safari',
    });
    expect(parseUserAgent(ANDROID_CHROME)).toEqual({
      device_type: 'MOBILE',
      os: 'Android',
      browser: 'Chrome',
    });
  });

  // Every browser lies by inheritance — Edge claims Chrome, Chrome claims
  // Safari — so the most specific claim has to win.
  it('does not let Edge be mistaken for Chrome, or Chrome for Safari', () => {
    expect(parseUserAgent(WINDOWS_EDGE)).toEqual({
      device_type: 'DESKTOP',
      os: 'Windows',
      browser: 'Edge',
    });
    expect(parseUserAgent(ANDROID_CHROME).browser).toBe('Chrome');
  });

  it('separates tablets from phones', () => {
    expect(parseUserAgent(IPAD).device_type).toBe('TABLET');
  });

  it('names the in-app browser rather than its engine', () => {
    expect(parseUserAgent(INSTAGRAM_APP).browser).toBe('Instagram in-app');
    expect(parseUserAgent('Mozilla/5.0 FBAN/FBIOS').browser).toBe('Facebook in-app');
  });

  // Preview bots inflate click counts if they are counted as people.
  it('flags crawlers and link-preview fetchers', () => {
    for (const ua of ['Googlebot/2.1', 'facebookexternalhit/1.1', 'WhatsApp/2.23', 'Slackbot 1.0']) {
      expect(parseUserAgent(ua).device_type).toBe('BOT');
    }
  });

  it('says Unknown rather than guessing when there is no agent', () => {
    expect(parseUserAgent('')).toEqual({
      device_type: 'UNKNOWN',
      os: 'Unknown',
      browser: 'Unknown',
    });
    expect(parseUserAgent(null)).toEqual({
      device_type: 'UNKNOWN',
      os: 'Unknown',
      browser: 'Unknown',
    });
    expect(parseUserAgent('Something/1.0')).toEqual({
      device_type: 'DESKTOP',
      os: 'Unknown',
      browser: 'Unknown',
    });
  });
});

describe('resolvePlatform', () => {
  it('names the product a referrer belongs to', () => {
    expect(resolvePlatform('https://l.instagram.com/?u=x')).toBe('Instagram');
    expect(resolvePlatform('https://www.facebook.com/')).toBe('Facebook');
    expect(resolvePlatform('https://t.co/abc')).toBe('X (Twitter)');
    expect(resolvePlatform('https://www.google.co.in/search?q=x')).toBe('Google');
    expect(resolvePlatform('https://youtu.be/xyz')).toBe('YouTube');
  });

  it('keeps an unknown referrer as its host', () => {
    expect(resolvePlatform('https://blog.partner.example/post')).toBe('blog.partner.example');
  });

  // WhatsApp and most native share sheets strip the referrer entirely, so the
  // in-app browser is the only remaining signal.
  it('falls back to the in-app browser when the referrer was stripped', () => {
    expect(resolvePlatform(null, INSTAGRAM_APP)).toBe('Instagram');
    expect(resolvePlatform('', 'Mozilla/5.0 FBAN/FBIOS')).toBe('Facebook');
  });

  it('says Direct when nothing identifies a source', () => {
    expect(resolvePlatform(null, ANDROID_CHROME)).toBe('Direct');
    expect(resolvePlatform('not-a-url', IPHONE_SAFARI)).toBe('Direct');
    expect(resolvePlatform()).toBe('Direct');
  });
});

describe('referrerHost', () => {
  it('strips www and returns null for anything unparseable', () => {
    expect(referrerHost('https://www.instagram.com/p/1')).toBe('instagram.com');
    expect(referrerHost('garbage')).toBeNull();
    expect(referrerHost(null)).toBeNull();
  });
});

describe('geoFromIp', () => {
  it('resolves a known address', () => {
    const geo = geoFromIp('103.21.244.0');
    expect(geo.country).toBe('US');
    expect(geo.city).toBeTruthy();
  });

  // The database knows the country but not always the town — an empty string
  // is "not known", and must not surface as one.
  it('nulls the fields the database could not fill', () => {
    const geo = geoFromIp('8.8.8.8');
    expect(geo.country).toBe('US');
    expect(geo.city).toBeNull();
    expect(geo.region).toBeNull();
  });

  it('returns empties rather than throwing on a private or missing address', () => {
    expect(geoFromIp('127.0.0.1')).toEqual({ country: null, region: null, city: null });
    expect(geoFromIp(null)).toEqual({ country: null, region: null, city: null });
  });
});

describe('clientIpFrom', () => {
  // nginx appends hops, so the left-most entry is the actual visitor.
  it('takes the original client from X-Forwarded-For, not the proxy', () => {
    expect(clientIpFrom('203.0.113.9, 10.0.0.1, 10.0.0.2', '10.0.0.2')).toBe('203.0.113.9');
  });

  it('falls back to the socket, unwrapping IPv4-mapped IPv6', () => {
    expect(clientIpFrom(null, '::ffff:198.51.100.7')).toBe('198.51.100.7');
    expect(clientIpFrom('', '198.51.100.7')).toBe('198.51.100.7');
  });

  it('returns null when there is no address at all', () => {
    expect(clientIpFrom(null, null)).toBeNull();
    expect(clientIpFrom('  ', '')).toBeNull();
  });
});
