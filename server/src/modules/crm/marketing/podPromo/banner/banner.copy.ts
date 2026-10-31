import { appDate, appFormat, appTime } from '@utils/app-time';
import type { Copy } from '../podPromo.copy';
import type { PodBannerData } from '../podPromo.pod';

/**
 * The words on every slide. Facts — the date, the time, the price, the
 * place, the link — always come from the pod; only the wording around them
 * (the kicker, a shorter title, the pitch, the list of what is included and
 * the partners' one-liners) may be rewritten by Claude (banner.ai.ts), and a
 * rewrite is held to the same lengths as the template below.
 */
export interface SlideCopy {
  kicker: string;
  title: string;
  weekday: string;
  date: string;
  time: string;
  place: string;
  price: string;
  /** The price line with tiers, e.g. "₹499 solo · ₹449 each for 2". */
  price_detail: string;
  cta: string;
  about_heading: string;
  about: string;
  included_heading: string;
  includes: string[];
  host_heading: string;
  host_name: string;
  host_line: string;
  venue_heading: string;
  venue_name: string;
  venue_address: string;
  venue_line: string;
  book_heading: string;
  entry_label: string;
  scarcity: string;
  scan_label: string;
  link_text: string;
}

/** The longest each rewritable slot may be, in characters. */
export const COPY_LIMITS = {
  kicker: 28,
  title: 60,
  about: 260,
  include: 48,
  includes: 5,
  host_line: 110,
  venue_line: 110,
  scarcity: 40,
  cta: 18,
} as const;

/** Indian rupees with grouping and no paise, the way the apps print a ticket price. */
export const rupees = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

const clip = (value: string, max: number) => {
  const chars = [...value.trim()];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
};

function priceLines(data: PodBannerData, t: Copy): { price: string; detail: string } {
  if (data.is_free) return { price: t('free'), detail: t('free') };
  const solo = rupees(data.price);
  if (data.tiers.length === 0) return { price: solo, detail: solo };
  const tiers = data.tiers.map((tier) => t('priceTier', { price: rupees(tier.each), count: tier.tickets }));
  return { price: solo, detail: [t('priceSolo', { price: solo }), ...tiers].join(' · ') };
}

/** The link as printed: the address without its scheme. */
export const linkText = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Within two weeks a pod is announced; further out it is a date to save. */
const SOON_MS = 14 * 86_400_000;

export function templateCopy(data: PodBannerData, t: Copy, opts: { cta?: string; trackingUrl: string; now?: Date }): SlideCopy {
  const { price, detail } = priceLines(data, t);
  const now = opts.now ?? new Date();
  const time = data.end ? t('timeRange', { start: appTime(data.start), end: appTime(data.end) }) : appTime(data.start);
  return {
    kicker: data.start.getTime() - now.getTime() > SOON_MS ? t('kickerSoon') : t('kicker'),
    title: clip(data.title, COPY_LIMITS.title),
    weekday: appFormat(data.start, 'EEEE'),
    date: appDate(data.start),
    time,
    place: [data.place_label, data.place_detail].filter(Boolean).join(' · '),
    price,
    price_detail: detail,
    cta: clip(opts.cta?.trim() || t('cta'), COPY_LIMITS.cta),
    about_heading: t('aboutHeading'),
    about: clip(data.description, COPY_LIMITS.about),
    included_heading: t('includedHeading'),
    includes: data.includes.slice(0, COPY_LIMITS.includes).map((item) => clip(item, COPY_LIMITS.include)),
    host_heading: t('hostHeading'),
    host_name: data.host?.name ?? '',
    host_line: clip(data.host?.line ?? '', COPY_LIMITS.host_line),
    venue_heading: t('venueHeading'),
    venue_name: data.venue?.name ?? '',
    venue_address: data.venue?.address ?? '',
    venue_line: clip(data.venue?.line ?? '', COPY_LIMITS.venue_line),
    book_heading: t('bookHeading'),
    entry_label: t('entryFee'),
    scarcity: t('scarcity'),
    scan_label: t('scanToBook'),
    link_text: linkText(opts.trackingUrl),
  };
}

/** The rewritable slots Claude may change, each cut to its limit; anything else is ignored. */
export interface CopyRewrite {
  kicker?: string;
  title?: string;
  about?: string;
  includes?: string[];
  host_line?: string;
  venue_line?: string;
  scarcity?: string;
}

const pick = (value: string | undefined, max: number, fallback: string) => (value?.trim() ? clip(value, max) : fallback);

export function applyRewrite(base: SlideCopy, rewrite: CopyRewrite): SlideCopy {
  const includes = (rewrite.includes ?? []).map((item) => item.trim()).filter(Boolean);
  return {
    ...base,
    kicker: pick(rewrite.kicker, COPY_LIMITS.kicker, base.kicker),
    title: pick(rewrite.title, COPY_LIMITS.title, base.title),
    about: pick(rewrite.about, COPY_LIMITS.about, base.about),
    // A pod with nothing listed stays that way: the AI may reword items, never invent them.
    includes: base.includes.length > 0 && includes.length > 0 ? includes.slice(0, base.includes.length).map((item) => clip(item, COPY_LIMITS.include)) : base.includes,
    host_line: base.host_name ? pick(rewrite.host_line, COPY_LIMITS.host_line, base.host_line) : '',
    venue_line: base.venue_name ? pick(rewrite.venue_line, COPY_LIMITS.venue_line, base.venue_line) : '',
    scarcity: pick(rewrite.scarcity, COPY_LIMITS.scarcity, base.scarcity),
  };
}
