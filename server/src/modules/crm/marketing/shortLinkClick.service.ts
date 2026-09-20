import crypto from 'node:crypto';
import { Types, type FilterQuery } from 'mongoose';
import {
  ShortLinkClickModel,
  type ConsentSignal,
  type IShortLinkClick,
} from './shortLinkClick.model';
import {
  clientIpFrom,
  geoFromIp,
  parseUserAgent,
  referrerHost,
  resolvePlatform,
} from './shortLink.analytics';
import { shortLinkPolicyService, type ShortLinkPrivacyRules } from './shortLinkPolicy.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/**
 * Addresses are hashed with a server-held salt on the way in and never stored
 * raw. The salt is what makes the hash a privacy measure rather than a
 * formality: IPv4 has fewer than 2^32 addresses, so an UNSALTED digest is
 * reversible by anyone who gets the database.
 */
const hashIp = (ip: string | null, salt: string) =>
  ip ? crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex') : null;

/** What a minimised click carries where a fingerprinting field would be. */
const NOT_RECORDED = 'Not recorded';

const CLICK_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['platform', 'country', 'city', 'browser', 'os', 'referrer_host'],
  sortFields: {
    clicked_at: 'clicked_at',
    platform: 'platform',
    country: 'country',
    city: 'city',
    device_type: 'device_type',
    os: 'os',
    browser: 'browser',
  },
  filterFields: {
    platform: { type: 'string' },
    device_type: { type: 'enum' },
    country: { type: 'string' },
    os: { type: 'string' },
    browser: { type: 'string' },
    clicked_at: { type: 'date' },
  },
  defaultSort: { clicked_at: -1 },
};

type ClickMatch = FilterQuery<IShortLinkClick>;

/**
 * The window a stats read covers. `days <= 0` means all time, and that is the
 * default: the lifetime numbers are what the link's own counter says, and a
 * range that silently narrowed them would make the two disagree.
 */
function matchFor(shortLinkId: Types.ObjectId, days: number): ClickMatch {
  if (days <= 0) return { short_link_id: shortLinkId };
  return {
    short_link_id: shortLinkId,
    clicked_at: { $gte: new Date(Date.now() - days * 86_400_000) },
  };
}

/** One breakdown list — the top values of a field, biggest first. */
async function breakdown(match: ClickMatch, field: string, limit = 12) {
  const rows = await ShortLinkClickModel.aggregate<{ _id: string | null; count: number }>([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]).exec();
  return rows.map((row) => ({ label: row._id ?? 'Unknown', count: row.count }));
}

export interface ClickInput {
  clickId: string;
  code: string;
  shortLinkId: string;
  referrer?: string | null;
  userAgent?: string | null;
  forwardedFor?: string | null;
  remoteAddress?: string | null;
  at?: Date;
  /** Set when the click is minted BY a landing page (the visitor is already
   * there), so the journey starts with LANDED rather than waiting for a
   * report that already happened. */
  landed?: boolean;
  /** The privacy signal the browser sent, if any. */
  consentSignal?: ConsentSignal | null;
}

/** Everything a click records about the visitor, before privacy is applied. */
function observe(input: ClickInput, rules: ShortLinkPrivacyRules) {
  const agent = parseUserAgent(input.userAgent);
  const ip = clientIpFrom(input.forwardedFor, input.remoteAddress);
  return {
    platform: resolvePlatform(input.referrer, input.userAgent),
    referrer_host: referrerHost(input.referrer),
    referrer_url: input.referrer || null,
    device_type: agent.device_type,
    os: agent.os,
    browser: agent.browser,
    ...geoFromIp(ip),
    ip_hash: hashIp(ip, rules.ip_hash_salt),
    user_agent: input.userAgent ?? null,
    consent_signal: null as ConsentSignal | null,
  };
}

/**
 * The same click as seen by a visitor who asked not to be tracked.
 *
 * What survives is what cannot single anybody out: that a click happened,
 * which platform sent it, whether it came from a phone, and the country. The
 * address hash, the city, the full referrer URL and the user agent — the
 * pieces that together make a fingerprint — are never written at all, rather
 * than written now and deleted later.
 */
function minimise(input: ClickInput, signal: ConsentSignal) {
  const agent = parseUserAgent(input.userAgent);
  const ip = clientIpFrom(input.forwardedFor, input.remoteAddress);
  return {
    platform: resolvePlatform(input.referrer, input.userAgent),
    referrer_host: referrerHost(input.referrer),
    referrer_url: null,
    device_type: agent.device_type,
    os: NOT_RECORDED,
    browser: NOT_RECORDED,
    // Derived in memory and never stored next to the address it came from. A
    // country is the whole of India or the whole of Germany; it singles out
    // nobody, and dropping it would make the geography breakdown a lie rather
    // than a protection.
    country: geoFromIp(ip).country,
    region: null,
    city: null,
    ip_hash: null,
    user_agent: null,
    consent_signal: signal,
  };
}

/** The facts to store for one click, with the privacy rules already applied. */
function factsFor(input: ClickInput, rules: ShortLinkPrivacyRules) {
  const signal = input.consentSignal ?? null;
  if (signal && rules.honour_consent_signals) return minimise(input, signal);
  return observe(input, rules);
}

export const shortLinkClickService = {
  /**
   * Record a click. Called without awaiting from the redirect so a slow write
   * can never delay the visitor — the destination is already on its way.
   */
  async record(input: ClickInput) {
    const rules = await shortLinkPolicyService.rules();
    const at = input.at ?? new Date();
    return ShortLinkClickModel.create({
      journey: input.landed ? [{ step: 'LANDED', at }] : [],
      click_id: input.clickId,
      code: input.code,
      short_link_id: new Types.ObjectId(input.shortLinkId),
      clicked_at: at,
      ...factsFor(input, rules),
    });
  },

  /**
   * Everything the detail page charts: totals, breakdowns and a daily series.
   *
   * `days` narrows every number together — a range that moved the chart but
   * not the totals beside it would read as a contradiction.
   */
  async stats(shortLinkId: string, days = 0) {
    const id = new Types.ObjectId(shortLinkId);
    const match = matchFor(id, days);

    const [totals] = await ShortLinkClickModel.aggregate<{
      total: number;
      visitors: string[];
      countries: string[];
      minimised: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          visitors: { $addToSet: '$ip_hash' },
          countries: { $addToSet: '$country' },
          minimised: { $sum: { $cond: [{ $ifNull: ['$consent_signal', false] }, 1, 0] } },
        },
      },
    ]).exec();

    // The chart always spans a window, even when the numbers above it do not:
    // an all-time daily series on a two-year-old link is unreadable.
    const seriesDays = days > 0 ? days : 30;
    const series = await ShortLinkClickModel.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          short_link_id: id,
          clicked_at: { $gte: new Date(Date.now() - seriesDays * 86_400_000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$clicked_at' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    const [platforms, devices, oses, browsers, countries, cities, referrers] = await Promise.all([
      breakdown(match, 'platform'),
      breakdown(match, 'device_type'),
      breakdown(match, 'os'),
      breakdown(match, 'browser'),
      breakdown(match, 'country'),
      breakdown(match, 'city'),
      breakdown(match, 'referrer_host'),
    ]);

    return {
      total_clicks: totals?.total ?? 0,
      // $addToSet keeps nulls, which are "we could not tell", not a visitor.
      unique_visitors: (totals?.visitors ?? []).filter(Boolean).length,
      countries_reached: (totals?.countries ?? []).filter(Boolean).length,
      consent_minimised: totals?.minimised ?? 0,
      daily: series.map((point) => ({ date: point._id, count: point.count })),
      platforms,
      devices,
      oses,
      browsers,
      countries,
      cities,
      referrers,
    };
  },

  async table(shortLinkId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IShortLinkClick>(
      ShortLinkClickModel,
      { short_link_id: new Types.ObjectId(shortLinkId) },
      input,
      CLICK_TABLE_CONFIG
    );
    return {
      rows: docs.map((doc) => ({
        id: doc._id.toHexString(),
        click_id: doc.click_id,
        clicked_at: doc.clicked_at.toISOString(),
        platform: doc.platform,
        referrer_host: doc.referrer_host ?? null,
        device_type: doc.device_type,
        os: doc.os,
        browser: doc.browser,
        country: doc.country ?? null,
        region: doc.region ?? null,
        city: doc.city ?? null,
        consent_signal: doc.consent_signal ?? null,
      })),
      total,
      page,
      page_size,
    };
  },

  /**
   * Erase every click recorded for one link — an erasure request answered in
   * one action, because a click row is the only place a short link holds
   * anything about a visitor.
   *
   * The link's own lifetime counter is left alone: how many times a link was
   * followed is a fact about the LINK, not about anyone who followed it.
   */
  async erase(shortLinkId: string) {
    const result = await ShortLinkClickModel.deleteMany({
      short_link_id: new Types.ObjectId(shortLinkId),
    }).exec();
    return result.deletedCount ?? 0;
  },
};
