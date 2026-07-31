import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { ShortLinkClickModel, type IShortLinkClick } from './shortLinkClick.model';
import {
  clientIpFrom,
  geoFromIp,
  parseUserAgent,
  referrerHost,
  resolvePlatform,
} from './shortLink.analytics';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/** Addresses are hashed on the way in and never stored raw — enough to count a
 * returning visitor, useless for identifying a person. */
const hashIp = (ip: string | null) =>
  ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

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

/** One breakdown list — the top values of a field, biggest first. */
async function breakdown(shortLinkId: Types.ObjectId, field: string, limit = 12) {
  const rows = await ShortLinkClickModel.aggregate<{ _id: string | null; count: number }>([
    { $match: { short_link_id: shortLinkId } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]).exec();
  return rows.map((row) => ({ label: row._id ?? 'Unknown', count: row.count }));
}

export const shortLinkClickService = {
  /**
   * Record a click. Called without awaiting from the redirect so a slow write
   * can never delay the visitor — the destination is already on its way.
   */
  async record(input: {
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
  }) {
    const agent = parseUserAgent(input.userAgent);
    const ip = clientIpFrom(input.forwardedFor, input.remoteAddress);
    const geo = geoFromIp(ip);
    const at = input.at ?? new Date();
    return ShortLinkClickModel.create({
      journey: input.landed ? [{ step: 'LANDED', at }] : [],
      click_id: input.clickId,
      code: input.code,
      short_link_id: new Types.ObjectId(input.shortLinkId),
      clicked_at: at,
      platform: resolvePlatform(input.referrer, input.userAgent),
      referrer_host: referrerHost(input.referrer),
      referrer_url: input.referrer || null,
      device_type: agent.device_type,
      os: agent.os,
      browser: agent.browser,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ip_hash: hashIp(ip),
      user_agent: input.userAgent ?? null,
    });
  },

  /** Everything the detail page charts: totals, breakdowns and a daily series. */
  async stats(shortLinkId: string, days = 30) {
    const id = new Types.ObjectId(shortLinkId);
    const since = new Date(Date.now() - days * 86_400_000);

    const [totals] = await ShortLinkClickModel.aggregate<{
      total: number;
      visitors: string[];
      countries: string[];
    }>([
      { $match: { short_link_id: id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          visitors: { $addToSet: '$ip_hash' },
          countries: { $addToSet: '$country' },
        },
      },
    ]).exec();

    const series = await ShortLinkClickModel.aggregate<{ _id: string; count: number }>([
      { $match: { short_link_id: id, clicked_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$clicked_at' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    const [platforms, devices, oses, browsers, countries, cities, referrers] = await Promise.all([
      breakdown(id, 'platform'),
      breakdown(id, 'device_type'),
      breakdown(id, 'os'),
      breakdown(id, 'browser'),
      breakdown(id, 'country'),
      breakdown(id, 'city'),
      breakdown(id, 'referrer_host'),
    ]);

    return {
      total_clicks: totals?.total ?? 0,
      // $addToSet keeps nulls, which are "we could not tell", not a visitor.
      unique_visitors: (totals?.visitors ?? []).filter(Boolean).length,
      countries_reached: (totals?.countries ?? []).filter(Boolean).length,
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
      })),
      total,
      page,
      page_size,
    };
  },
};
