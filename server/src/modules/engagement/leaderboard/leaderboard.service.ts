import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  LEADERBOARD_CATEGORIES,
  LeaderboardPointModel,
  getLeaderboardSettings,
  type ILeaderboardReward,
  type ILeaderboardSettings,
  type LeaderboardCategory,
  type LeaderboardSourceType,
} from './leaderboard.model';

/** Mongo's duplicate-key error — the unique event index rejecting a repeat. */
const DUPLICATE_KEY = 11000;

/** How many rows a board returns. Rank still counts everyone. */
const BOARD_LIMIT = 100;

export type LeaderboardPeriod = 'MONTH' | 'YEAR' | 'ALL';

/** Which settings field prices each board's action. */
const POINTS_FIELD: Record<LeaderboardCategory, keyof ILeaderboardSettings> = {
  USER: 'points_per_join',
  HOST: 'points_per_host',
  CLUB_ADMIN: 'points_per_club_pod',
  VENUE: 'points_per_venue_pod',
  BRAND: 'points_per_product_sale',
};

function pointsFor(settings: ILeaderboardSettings, category: LeaderboardCategory): number {
  const value = Number(settings[POINTS_FIELD[category]]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Start of the current window, UTC, or null for the all-time board. */
function periodStart(period: LeaderboardPeriod): Date | null {
  const now = new Date();
  if (period === 'MONTH') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (period === 'YEAR') return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return null;
}

function boardMatch(category: LeaderboardCategory, period: LeaderboardPeriod) {
  const since = periodStart(period);
  return since ? { category, created_at: { $gte: since } } : { category };
}

const rewardPub = (r: ILeaderboardReward) => ({
  category: r.category,
  period: r.period,
  rank_from: r.rank_from,
  rank_to: r.rank_to,
  title: r.title,
  description: r.description ?? '',
  is_active: r.is_active !== false,
  sort_order: r.sort_order ?? 0,
});

/** Active rewards in display order: monthly before yearly, then by rank. */
function sortedRewards(rewards: ILeaderboardReward[]): ILeaderboardReward[] {
  return [...rewards].sort(
    (a, b) =>
      a.period.localeCompare(b.period) ||
      a.sort_order - b.sort_order ||
      a.rank_from - b.rank_from
  );
}

const settingsPub = (s: ILeaderboardSettings) => ({
  points_per_join: s.points_per_join,
  points_per_host: s.points_per_host,
  points_per_club_pod: s.points_per_club_pod,
  points_per_venue_pod: s.points_per_venue_pod,
  points_per_product_sale: s.points_per_product_sale,
  rewards: sortedRewards(s.rewards ?? []).map(rewardPub),
  updated_at: s.updated_at?.toISOString?.() ?? null,
});

// 0 is legal (turns the action's points off), so no `|| DEFAULT` here.
const cleanPoints = (value: unknown) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(100000, Math.max(0, n)) : 10;
};

export const leaderboardService = {
  /**
   * Write one points row. Best-effort by contract: every caller sits on a
   * money/booking path that already succeeded, so a points failure is logged
   * and swallowed — it must never fail the operation that earned it.
   * Idempotent per (category, user, source_type, source_id) via the unique
   * index, not a read-then-write check.
   */
  async award(opts: {
    category: LeaderboardCategory;
    userId: string;
    sourceType: LeaderboardSourceType;
    sourceId: string;
    podId?: string | null;
  }): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(opts.userId) || !opts.sourceId) return;
      const settings = await getLeaderboardSettings();
      const points = pointsFor(settings, opts.category);
      // A 0-point action is the admin turning that reward off — write nothing.
      if (points <= 0) return;
      await LeaderboardPointModel.create({
        category: opts.category,
        user_id: new Types.ObjectId(opts.userId),
        points,
        source_type: opts.sourceType,
        source_id: opts.sourceId,
        pod_id: opts.podId && Types.ObjectId.isValid(opts.podId) ? new Types.ObjectId(opts.podId) : null,
      });
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) return;
      logs.server.warn('leaderboard', 'award', {
        error: e,
        msg: `Leaderboard award failed (${opts.category}/${opts.sourceType})`,
      });
    }
  },

  /** A member successfully joined a pod — paid, free, referral or rejoin. */
  async awardPodJoin(userId: string, podDocId: string): Promise<void> {
    await this.award({
      category: 'USER',
      userId,
      sourceType: 'POD_JOIN',
      sourceId: podDocId,
      podId: podDocId,
    });
  },

  /**
   * A pod completed: the host, the venue owner and the club admin each earn
   * their board's points. The venue owner and club admin are resolved here
   * (email-independent, unlike the payout beneficiaries — points do not need
   * an inbox), and every leg is individually best-effort.
   */
  async awardForCompletedPod(pod: any, hostUserId?: string | null): Promise<void> {
    const podDocId = String(pod._id);
    const hostId = hostUserId ?? (pod.pod_hosts_id?.[0] ? String(pod.pod_hosts_id[0]) : null);
    if (hostId) {
      await this.award({
        category: 'HOST',
        userId: hostId,
        sourceType: 'POD_HOSTED',
        sourceId: podDocId,
        podId: podDocId,
      });
    }

    if (pod.venue_id) {
      try {
        const { VenueModel } = await import('@modules/venues/venue/venue.model');
        const venue = await VenueModel.findById(pod.venue_id).select('owner_user_id');
        if (venue?.owner_user_id) {
          await this.award({
            category: 'VENUE',
            userId: String(venue.owner_user_id),
            sourceType: 'VENUE_POD_COMPLETED',
            sourceId: podDocId,
            podId: podDocId,
          });
        }
      } catch (e) {
        logs.server.warn('leaderboard', 'awardForCompletedPod', {
          error: e,
          msg: 'Venue points skipped — venue lookup failed',
        });
      }
    }

    if (pod.club_id) {
      try {
        const { ClubModel } = await import('@modules/clubs/club/club.model');
        const club = await ClubModel.findById(pod.club_id).select('admin_user_ids');
        const adminId = club?.admin_user_ids?.[0];
        if (adminId) {
          await this.award({
            category: 'CLUB_ADMIN',
            userId: String(adminId),
            sourceType: 'CLUB_POD_COMPLETED',
            sourceId: podDocId,
            podId: podDocId,
          });
        }
      } catch (e) {
        logs.server.warn('leaderboard', 'awardForCompletedPod', {
          error: e,
          msg: 'Club-admin points skipped — club lookup failed',
        });
      }
    }
  },

  /**
   * A product order was created from a successful payment: every BRAND-owned
   * line pays its brand's owner. Keyed per (order, product, variant) so a
   * replayed finalize re-inserts nothing, while a brand selling three products
   * in one order earns three times.
   */
  async awardProductSales(order: any): Promise<void> {
    const lines: any[] = Array.isArray(order?.line_items) ? order.line_items : [];
    const brandLines = lines.filter((l) => l.ownership === 'BRAND' && l.brand_id);
    if (brandLines.length === 0) return;
    try {
      const { EcommBrandModel } = await import('@modules/venues/ecommBrand/ecommBrand.model');
      const brandIds = [...new Set(brandLines.map((l) => String(l.brand_id)))];
      const brands = await EcommBrandModel.find({ _id: { $in: brandIds } }).select('owner_user_id');
      const ownerByBrand = new Map(brands.map((b: any) => [String(b._id), b.owner_user_id ? String(b.owner_user_id) : null]));
      for (const line of brandLines) {
        const ownerId = ownerByBrand.get(String(line.brand_id));
        if (!ownerId) continue;
        await this.award({
          category: 'BRAND',
          userId: ownerId,
          sourceType: 'PRODUCT_SALE',
          sourceId: `${String(order._id)}:${String(line.product_id)}:${line.variant_id ?? ''}`,
          podId: order.pod_id ? String(order.pod_id) : null,
        });
      }
    } catch (e) {
      logs.server.warn('leaderboard', 'awardProductSales', {
        error: e,
        msg: 'Brand points skipped — brand lookup failed',
      });
    }
  },

  /**
   * One ranked board with the caller's own position. Rank is standard
   * competition ranking over ALL participants in the window, not just the
   * returned page, so "your rank" is honest even from page one.
   */
  async board(viewerId: string, category: LeaderboardCategory, period: LeaderboardPeriod) {
    const match = boardMatch(category, period);
    const top = await LeaderboardPointModel.aggregate([
      { $match: match },
      { $group: { _id: '$user_id', points: { $sum: '$points' } } },
      { $sort: { points: -1, _id: 1 } },
      { $limit: BOARD_LIMIT },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          points: 1,
          first_name: '$user.profile.first_name',
          last_name: '$user.profile.last_name',
          avatar: '$user.profile.profile_photo',
        },
      },
    ]);

    const viewerValid = Types.ObjectId.isValid(viewerId);
    const viewerObjId = viewerValid ? new Types.ObjectId(viewerId) : null;
    const mineAgg = viewerValid
      ? await LeaderboardPointModel.aggregate([
          { $match: { ...match, user_id: viewerObjId } },
          { $group: { _id: null, points: { $sum: '$points' } } },
        ])
      : [];
    const myPoints = mineAgg[0]?.points ?? 0;

    const [participantsAgg, aheadAgg] = await Promise.all([
      LeaderboardPointModel.aggregate([
        { $match: match },
        { $group: { _id: '$user_id' } },
        { $count: 'n' },
      ]),
      myPoints > 0
        ? LeaderboardPointModel.aggregate([
            { $match: match },
            { $group: { _id: '$user_id', points: { $sum: '$points' } } },
            { $match: { points: { $gt: myPoints } } },
            { $count: 'n' },
          ])
        : Promise.resolve([] as { n: number }[]),
    ]);

    return {
      category,
      period,
      rows: top.map((row: any, index: number) => ({
        rank: index + 1,
        user_id: String(row._id),
        name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
        avatar_url: row.avatar ?? '',
        points: row.points ?? 0,
        is_me: viewerValid && String(row._id) === viewerId,
      })),
      my_points: myPoints,
      my_rank: myPoints > 0 ? (aheadAgg[0]?.n ?? 0) + 1 : null,
      participants: participantsAgg[0]?.n ?? 0,
    };
  },

  /** Points-per-action and the ACTIVE rewards — what the apps render. */
  async getConfig() {
    const settings = await getLeaderboardSettings();
    const pub = settingsPub(settings);
    return { ...pub, rewards: pub.rewards.filter((r) => r.is_active) };
  },

  /** The admin view: everything, inactive rewards included. */
  async getSettings() {
    return settingsPub(await getLeaderboardSettings());
  },

  /**
   * Update the economics. Numbers are clamped like every AppSettings scalar;
   * a present `rewards` array replaces the whole list (the occasional-icons
   * contract), with unusable rows dropped rather than stored half-formed.
   */
  async updateSettings(input: Record<string, unknown>) {
    const settings = await getLeaderboardSettings();
    for (const field of Object.values(POINTS_FIELD)) {
      if (input[field] !== undefined) {
        (settings as any)[field] = cleanPoints(input[field]);
      }
    }
    if (Array.isArray(input.rewards)) {
      settings.rewards = (input.rewards as Record<string, unknown>[])
        .map((row, index) => ({
          category: String(row.category ?? '') as LeaderboardCategory,
          period: row.period === 'YEARLY' ? ('YEARLY' as const) : ('MONTHLY' as const),
          rank_from: Math.max(1, Math.floor(Number(row.rank_from) || 1)),
          rank_to: Math.max(1, Math.floor(Number(row.rank_to) || 1)),
          title: String(row.title ?? '').trim(),
          description: String(row.description ?? '').trim(),
          is_active: row.is_active !== false,
          sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index,
        }))
        .filter(
          (row) =>
            row.title !== '' &&
            LEADERBOARD_CATEGORIES.includes(row.category) &&
            row.rank_to >= row.rank_from
        );
    }
    await settings.save();
    return settingsPub(settings);
  },
};
