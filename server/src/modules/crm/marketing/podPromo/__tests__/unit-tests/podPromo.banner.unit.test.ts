/**
 * The banner's pure parts: fitting text, picking the family and palette,
 * reading banner kits with fallbacks, the slide words, and which slides a pod
 * gets. Real bundled fonts are used for the slide plans — nothing is drawn.
 */
import { escapeXml, fitText, wrapLines, type Measure } from '../../banner/banner.text';
import { styleForCategories, DEFAULT_STYLE } from '../../banner/banner.styleMap';
import { hueOf, hexToRgb, pickPalette } from '../../banner/banner.palette';
import { BANNER_FAMILIES, BANNER_DIMENSIONS } from '../../banner/banner.theme';
import { readKit, collabHandle } from '../../podPromo.kit';
import { applyRewrite, linkText, rupees, templateCopy } from '../../banner/banner.copy';
import { fill } from '../../podPromo.copy';
import { planSlides } from '../../banner/banner.render';
import { qrSize } from '../../banner/banner.slides';
import type { PodBannerData } from '../../podPromo.pod';
import type { SlideContext } from '../../banner/banner.layout';

/** Every character is 10 px per 10 px of size: easy arithmetic. */
const mono: Measure = (text, size) => [...text].length * size;

describe('wrapLines', () => {
  it('wraps at spaces within the width', () => {
    expect(wrapLines('one two three four', 1, 9, 5, mono)).toEqual({ lines: ['one two', 'three', 'four'], truncated: false });
  });

  it('cuts a word longer than the line instead of overflowing', () => {
    const { lines } = wrapLines('supercalifragilistic', 1, 8, 5, mono);
    expect(lines.every((line) => line.length <= 8)).toBe(true);
    expect(lines.join('')).toBe('supercalifragilistic');
  });

  it('ends a cut-short block with an ellipsis that still fits', () => {
    const result = wrapLines('aaa bbb ccc ddd', 1, 7, 1, mono);
    expect(result.truncated).toBe(true);
    expect(result.lines).toEqual(['aaa bb…']);
    expect(mono(result.lines[0], 1)).toBeLessThanOrEqual(7);
  });

  it('gives no lines for blank text', () => {
    expect(wrapLines('   ', 1, 10, 3, mono).lines).toEqual([]);
  });
});

describe('fitText', () => {
  it('shrinks the size until the text fits the lines', () => {
    const result = fitText('aaaa bbbb', { maxSize: 10, minSize: 2, maxWidth: 50, maxLines: 1, measure: mono });
    expect(result.truncated).toBe(false);
    expect(result.size).toBeLessThan(10);
    expect(mono(result.lines[0], result.size)).toBeLessThanOrEqual(50);
  });

  it('truncates at the floor when even the smallest size cannot fit', () => {
    const result = fitText('a'.repeat(200), { maxSize: 10, minSize: 5, maxWidth: 50, maxLines: 1, measure: mono });
    expect(result.size).toBe(5);
    expect(result.truncated).toBe(true);
  });
});

it('escapes everything XML treats as markup', () => {
  expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;');
});

describe('styleForCategories', () => {
  it.each([
    [['Sports', 'Football'], 'SPORT_NIGHT'],
    [['Wellness', 'Yoga'], 'CALM_WELLNESS'],
    [['Arts & Crafts'], 'PLAYFUL_PASTEL'],
    [['Food & Drinks'], 'ELEGANT_SERIF'],
    [['Music'], 'FESTIVE_BOLD'],
  ])('maps %p to %s', (names, style) => {
    expect(styleForCategories(names)).toBe(style);
  });

  it('falls back to the default family for an unknown or missing category', () => {
    expect(styleForCategories(['Quizzing'])).toBe(DEFAULT_STYLE);
    expect(styleForCategories([])).toBe(DEFAULT_STYLE);
  });
});

describe('palette nudging', () => {
  it('reads hex and hue', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('nope')).toBeNull();
    expect(hueOf({ r: 0, g: 0, b: 255 }).hue).toBeCloseTo(240);
  });

  it('picks the palette whose background hue is nearest the photo', () => {
    const family = BANNER_FAMILIES.SPORT_NIGHT;
    expect(pickPalette(family, { r: 20, g: 120, b: 40 })).toBe(family.palettes[1]); // a green pitch
    expect(pickPalette(family, { r: 20, g: 40, b: 140 })).toBe(family.palettes[2]); // a blue stadium
  });

  it('keeps the first palette for a grey or missing photo', () => {
    const family = BANNER_FAMILIES.FESTIVE_BOLD;
    expect(pickPalette(family, { r: 120, g: 120, b: 125 })).toBe(family.palettes[0]);
    expect(pickPalette(family, null)).toBe(family.palettes[0]);
  });
});

describe('readKit', () => {
  it('reads an empty or absent kit as empty, opted in', () => {
    expect(readKit(undefined)).toEqual({ logo_url: '', instagram_handle: '', photo_urls: [], tagline: '', bio: '', collab_opt_in: true });
    expect(collabHandle(readKit(null))).toBeNull();
  });

  it('keeps only trusted pictures and a valid Instagram handle', () => {
    const kit = readKit({
      logo_url: 'https://evil.example.com/logo.png',
      instagram_handle: '@Blue.Cafe',
      photos: [{ url: 'https://ik.imagekit.io/duncit/a.jpg', caption: '' }, { url: 'http://ik.imagekit.io/insecure.jpg', caption: '' }],
      event_photos: [{ url: 'https://ik.imagekit.io/duncit/a.jpg', caption: 'dup' }],
      collab_opt_in: false,
    });
    expect(kit.logo_url).toBe('');
    expect(kit.instagram_handle).toBe('blue.cafe');
    expect(kit.photo_urls).toEqual(['https://ik.imagekit.io/duncit/a.jpg']);
    expect(collabHandle(kit)).toBeNull();
  });

  it('drops an invalid handle and survives wrong types', () => {
    const kit = readKit({ instagram_handle: 'bad..name', photos: 'not a list', tagline: 42 });
    expect(kit.instagram_handle).toBe('');
    expect(kit.photo_urls).toEqual([]);
    expect(kit.tagline).toBe('');
  });
});

const SHIPPED: Record<string, string> = {
  kicker: 'Duncit presents',
  kickerSoon: 'Save the date',
  cta: 'Book now',
  free: 'Free',
  priceSolo: '{price} solo',
  priceTier: '{price} each for {count}',
  timeRange: '{start} – {end}',
};
const t = (key: string, vars?: Record<string, string | number>) => fill(SHIPPED[key] ?? key, vars);

const pod = (over: Partial<PodBannerData> = {}): PodBannerData => ({
  id: '64b000000000000000000001',
  title: 'Sunset Run Club',
  description: 'An easy 5 km along the lake.',
  start: new Date('2026-11-14T13:30:00.000Z'),
  end: null,
  is_free: false,
  price: 1499,
  tiers: [],
  includes: ['Water', 'Medal'],
  place_label: 'Lake Park',
  place_detail: 'Pune',
  club_id: '',
  club_name: 'Run Pune',
  city_id: '',
  city_name: 'Pune',
  category_names: ['Sports'],
  photo_urls: [],
  url: 'https://mweb.duncit.com/pod/x',
  venue: null,
  host: null,
  ...over,
});

describe('templateCopy', () => {
  const now = new Date('2026-11-10T00:00:00.000Z');
  it('prints the price in rupees and the link without its scheme', () => {
    const copy = templateCopy(pod(), t, { trackingUrl: 'https://duncit.com/aB3xY9Zq', now });
    expect(copy.price).toBe('₹1,499');
    expect(copy.link_text).toBe('duncit.com/aB3xY9Zq');
    expect(copy.kicker).toBe('Duncit presents');
    expect(copy.cta).toBe('Book now');
    expect(copy.place).toBe('Lake Park · Pune');
  });

  it('says Free for a free pod, and Save the date for one weeks away', () => {
    const copy = templateCopy(pod({ is_free: true, price: 0 }), t, { trackingUrl: 'https://duncit.com/x', now: new Date('2026-10-01T00:00:00.000Z') });
    expect(copy.price).toBe('Free');
    expect(copy.kicker).toBe('Save the date');
  });

  it('lists ticket tiers after the solo price, and honours a CTA override', () => {
    const copy = templateCopy(pod({ price: 500, tiers: [{ tickets: 2, each: 450 }] }), t, { trackingUrl: 'https://duncit.com/x', cta: 'Grab a spot', now });
    expect(copy.price_detail).toBe('₹500 solo · ₹450 each for 2');
    expect(copy.cta).toBe('Grab a spot');
  });

  it('applies an AI rewrite within limits and never invents included items', () => {
    const base = templateCopy(pod({ includes: [] }), t, { trackingUrl: 'https://duncit.com/x', now });
    const next = applyRewrite(base, { title: 'x'.repeat(200), includes: ['Free beer'], kicker: '  ', host_line: 'Hi' });
    expect([...next.title].length).toBe(60);
    expect(next.includes).toEqual([]);
    expect(next.kicker).toBe(base.kicker);
    expect(next.host_line).toBe('');
  });

  it('formats rupees and links', () => {
    expect(rupees(100000)).toBe('₹1,00,000');
    expect(linkText('https://duncit.com/abc/')).toBe('duncit.com/abc');
  });
});

describe('planSlides', () => {
  const ctx = (data: PodBannerData, size: 'PORTRAIT' | 'SQUARE' = 'PORTRAIT'): SlideContext => ({
    ...BANNER_DIMENSIONS[size],
    family: BANNER_FAMILIES.FESTIVE_BOLD,
    palette: BANNER_FAMILIES.FESTIVE_BOLD.palettes[0],
    copy: templateCopy(data, t, { trackingUrl: 'https://duncit.com/aB3xY9Zq' }),
    has: { photo: false, venue_photo: false, host_photo: false, brand_logo: true, venue_logo: false, host_logo: false },
  });
  const kit = readKit({});

  it('skips the host and venue slides when there is no host or venue', () => {
    expect(planSlides(ctx(pod())).map((plan) => plan.kind)).toEqual(['COVER', 'DETAILS', 'BOOK']);
  });

  it('includes them, in order, when both exist', () => {
    const data = pod({
      host: { name: 'Riya Sharma', line: 'Coach', address: '', photo_url: '', kit },
      venue: { name: 'Blue Cafe', line: '', address: 'Lane 5, Pune', photo_url: '', kit },
    });
    expect(planSlides(ctx(data, 'SQUARE')).map((plan) => plan.kind)).toEqual(['COVER', 'DETAILS', 'HOST', 'VENUE', 'BOOK']);
  });

  it('skips the details slide with nothing to say, and always carries the QR code on the booking slide', () => {
    const plans = planSlides(ctx(pod({ description: '', includes: [] })));
    expect(plans.map((plan) => plan.kind)).toEqual(['COVER', 'BOOK']);
    const book = plans[1];
    expect(book.images.some((slot) => slot.source === 'qr')).toBe(true);
    for (const plan of plans) {
      for (const slot of plan.images) {
        expect(slot.x + slot.w).toBeLessThanOrEqual(1080);
        expect(slot.y + slot.h).toBeLessThanOrEqual(1350);
      }
      expect(plan.svg.startsWith('<svg')).toBe(true);
    }
  });

  it('keeps the QR code between a scannable floor and a ceiling', () => {
    expect(qrSize(50)).toBe(200);
    expect(qrSize(300)).toBe(300);
    expect(qrSize(900)).toBe(360);
  });
});
