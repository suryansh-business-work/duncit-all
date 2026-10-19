import { Types } from 'mongoose';
import { clientIpFrom, geoFromIp, parseUserAgent } from '@modules/crm/marketing/shortLink.analytics';
import { LOGIN_ACTIVITY_RETENTION_DAYS, LoginActivityModel, type LoginActivityDoc } from './loginActivity.model';

/** Where a sign-in came from — read off the request by the auth resolver. */
export interface LoginActivityContext {
  userAgent?: string | null;
  /** The raw `x-forwarded-for` header. */
  forwardedFor?: string | null;
  remoteAddress?: string | null;
  surface?: string | null;
  origin?: string | null;
}

export interface LoginActivityPub {
  id: string;
  signed_in_at: string;
  provider: string | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  surface: string | null;
  origin_host: string | null;
}

export interface LoginActivityHistoryPub {
  retention_days: number;
  entries: LoginActivityPub[];
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const hostOf = (origin?: string | null): string | null => {
  if (!origin) return null;
  try {
    return new URL(origin).host || null;
  } catch {
    return null;
  }
};

const clamp = (limit?: number | null): number =>
  Math.min(Math.max(Math.trunc(limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);

const toPub = (row: LoginActivityDoc & { _id: unknown }): LoginActivityPub => ({
  id: String(row._id),
  signed_in_at: new Date(row.signed_in_at).toISOString(),
  provider: row.provider ?? null,
  ip: row.ip ?? null,
  city: row.city ?? null,
  region: row.region ?? null,
  country: row.country ?? null,
  browser: row.browser ?? null,
  os: row.os ?? null,
  device_type: row.device_type ?? null,
  surface: row.surface ?? null,
  origin_host: row.origin_host ?? null,
});

export const loginActivityService = {
  /** Append one sign-in. The caller logs a failure; it must never fail a login. */
  async record(userId: string, provider: string | null, context: LoginActivityContext): Promise<void> {
    const ip = clientIpFrom(context.forwardedFor, context.remoteAddress);
    const agent = parseUserAgent(context.userAgent);
    const geo = geoFromIp(ip);
    await LoginActivityModel.create({
      user_id: new Types.ObjectId(userId),
      signed_in_at: new Date(),
      provider,
      ip,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      browser: agent.browser,
      os: agent.os,
      device_type: agent.device_type,
      surface: context.surface?.trim().slice(0, 40) || null,
      origin_host: hostOf(context.origin),
    });
  },

  /** The member's own sign-ins, newest first, within the retention window. */
  async listMine(userId: string, limit?: number | null): Promise<LoginActivityHistoryPub> {
    const rows = await LoginActivityModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ signed_in_at: -1 })
      .limit(clamp(limit))
      .lean();
    return { retention_days: LOGIN_ACTIVITY_RETENTION_DAYS, entries: rows.map(toPub) };
  },
};
