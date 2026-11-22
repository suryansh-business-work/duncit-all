import { Types, type PipelineStage } from 'mongoose';
import { logs } from '@observability/log';
import { getAppTimeZone } from '@utils/app-time';
import { AiPromptModel } from './prompt.model';
import {
  AiPromptEventModel,
  PROMPT_EVENT_TYPES,
  PROMPT_PLATFORMS,
  type PromptDevice,
  type PromptEventType,
  type PromptPlatform,
  type PromptSurface,
} from './prompt.analytics.model';

export interface PromptEventInput {
  promptId: string;
  type: PromptEventType;
  surface: PromptSurface;
  platform?: string | null;
  /** utm_source, when the link that brought the visitor carried one. */
  source?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  visitor?: string | null;
  userId?: string | null;
}

const MAX_SOURCE = 60;
const MAX_HOST = 120;
const MAX_VISITOR = 64;

export const isPromptEventType = (value: unknown): value is PromptEventType =>
  typeof value === 'string' && (PROMPT_EVENT_TYPES as readonly string[]).includes(value);

const platformOf = (value: unknown): PromptPlatform | null =>
  typeof value === 'string' && (PROMPT_PLATFORMS as readonly string[]).includes(value) ? (value as PromptPlatform) : null;

/** Plain substring tests — no backtracking pattern ever sees a user agent. */
export function deviceOf(userAgent: string | null | undefined): PromptDevice {
  const ua = (userAgent ?? '').toLowerCase();
  if (!ua) return 'unknown';
  if (['bot', 'crawler', 'spider', 'preview'].some((word) => ua.includes(word))) return 'bot';
  if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
  if (['mobi', 'android', 'iphone'].some((word) => ua.includes(word))) return 'mobile';
  return 'desktop';
}

/** The referrer's host alone; a full URL can carry search terms or tokens. */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host ? host.slice(0, MAX_HOST) : null;
  } catch {
    return null;
  }
}

/** A campaign name, reduced to characters that cannot smuggle markup into a chart label. */
export function cleanSource(raw: string | null | undefined): string | null {
  const cleaned = Array.from((raw ?? '').toLowerCase())
    .filter((ch) => /[a-z0-9._-]/.test(ch))
    .join('')
    .slice(0, MAX_SOURCE);
  return cleaned || null;
}

const cleanVisitor = (raw: string | null | undefined): string | null => {
  const value = cleanSource(raw);
  return value ? value.slice(0, MAX_VISITOR) : null;
};

function sourceFor(input: PromptEventInput, referrerHost: string | null): string {
  if (input.surface === 'PORTAL') return 'portal';
  return cleanSource(input.source) ?? referrerHost ?? 'direct';
}

/**
 * Record one interaction and bump the prompt's running hit count.
 *
 * Never throws: analytics is a side effect of someone using the prompt, and a
 * failed write must not turn a copy or a page view into an error.
 */
export async function recordPromptEvent(input: PromptEventInput): Promise<boolean> {
  if (!Types.ObjectId.isValid(input.promptId) || !isPromptEventType(input.type)) return false;
  const promptId = new Types.ObjectId(input.promptId);
  const referrerHost = hostOf(input.referrer);
  try {
    await AiPromptEventModel.create({
      prompt_id: promptId,
      type: input.type,
      surface: input.surface,
      platform: platformOf(input.platform),
      source: sourceFor(input, referrerHost),
      referrer_host: referrerHost,
      device: deviceOf(input.userAgent),
      visitor: cleanVisitor(input.visitor),
      user_id: input.userId && Types.ObjectId.isValid(input.userId) ? new Types.ObjectId(input.userId) : null,
    });
    // The raw driver, not the model: a hit is not an edit, so it must not reach
    // the change-log plugin or the version history.
    await AiPromptModel.collection.updateOne(
      { _id: promptId },
      { $inc: { 'stats.total_hits': 1 }, $set: { 'stats.last_hit_at': new Date() } }
    );
    return true;
  } catch (error) {
    logs.server.warn('aiPrompt', 'event', { msg: 'could not record prompt event', type: input.type, error });
    return false;
  }
}

export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 365;

export const clampRange = (days: number | null | undefined): number =>
  Math.min(MAX_RANGE_DAYS, Math.max(1, Math.trunc(days ?? DEFAULT_RANGE_DAYS) || DEFAULT_RANGE_DAYS));

interface Bucket {
  _id: string | null;
  count: number;
}

const counted = (rows: Bucket[]) =>
  rows.filter((row) => row._id !== null && row._id !== '').map((row) => ({ key: String(row._id), count: row.count }));

const groupBy = (field: string, limit?: number): PipelineStage.FacetPipelineStage[] => [
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  ...(limit ? [{ $limit: limit }] : []),
];

/** Every number the Analytics tab shows, in one round trip. */
export async function promptAnalytics(promptId: string, rangeDays?: number | null) {
  const range = clampRange(rangeDays);
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
  const empty = { range_days: range, total_hits: 0, unique_visitors: 0, by_type: [], by_platform: [], by_source: [], by_device: [], by_day: [] };
  if (!Types.ObjectId.isValid(promptId)) return empty;
  const [facets] = await AiPromptEventModel.aggregate<Record<string, Bucket[]>>([
    { $match: { prompt_id: new Types.ObjectId(promptId), created_at: { $gte: since } } },
    {
      $facet: {
        total: [{ $count: 'count' }, { $project: { _id: null, count: 1 } }],
        visitors: [
          { $group: { _id: { $ifNull: ['$visitor', { $toString: '$user_id' }] } } },
          { $match: { _id: { $ne: null } } },
          { $count: 'count' },
          { $project: { _id: null, count: 1 } },
        ],
        by_type: groupBy('type'),
        by_platform: groupBy('platform'),
        by_source: groupBy('source', 10),
        by_device: groupBy('device'),
        by_day: [
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: getAppTimeZone() } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);
  return {
    range_days: range,
    total_hits: facets?.total?.[0]?.count ?? 0,
    unique_visitors: facets?.visitors?.[0]?.count ?? 0,
    by_type: counted(facets?.by_type ?? []),
    by_platform: counted(facets?.by_platform ?? []),
    by_source: counted(facets?.by_source ?? []),
    by_device: counted(facets?.by_device ?? []),
    by_day: (facets?.by_day ?? []).map((row) => ({ day: String(row._id), count: row.count })),
  };
}
