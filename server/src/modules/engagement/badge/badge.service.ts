import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  BadgeModel,
  UserBadgeModel,
  type BadgeConditionType,
  type IBadge,
  type IUserBadge,
} from './badge.model';
import {
  DEFAULT_BADGES,
  PACK_CHAMPION_BADGE_ID,
  PACK_CHAMPION_CATEGORY_SLUG,
} from './badge.seed';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { UserModel } from '@modules/access/user/user.model';
import { settingsService } from '@modules/platform/settings/settings.service';

export type BadgeEvent = 'POD_JOIN' | 'POD_HOST' | 'CLUB_JOIN' | 'POD_REFERRAL';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const toBadge = (b: IBadge) => ({
  id: String(b._id),
  badge_id: b.badge_id,
  title: b.title,
  description: b.description ?? '',
  image_url: b.image_url ?? '',
  condition_type: b.condition_type,
  threshold: b.threshold,
  category_id: b.category_id ? String(b.category_id) : null,
  role_key: b.role_key ?? '',
  sort_order: b.sort_order ?? 0,
  is_active: !!b.is_active,
  created_at: b.created_at?.toISOString?.() ?? '',
  updated_at: b.updated_at?.toISOString?.() ?? '',
});

const toUserBadge = (u: IUserBadge & { _badge?: IBadge | null }) => ({
  id: String(u._id),
  user_id: String(u.user_id),
  badge_id: String(u.badge_id),
  badge: u._badge ? toBadge(u._badge) : null,
  awarded_at: u.awarded_at?.toISOString?.() ?? '',
  awarded_reason: u.awarded_reason ?? '',
});

/* -------------------------------------------------------------------------- */
/* Metrics                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The pods this member actually turned up to.
 *
 * Attendance is a ticket the host marked present (rule 41) — NOT a booking —
 * because that is what the platform already treats as having shown up, and what
 * the host is paid on. One id per pod, so a two-seat booking is still one pod.
 */
async function attendedPodIds(uid: Types.ObjectId): Promise<Types.ObjectId[]> {
  const rows = await TicketModel.find({ user_id: uid, status: 'CHECKED_IN' })
    .select('pod_id')
    .lean();
  const seen = new Map<string, Types.ObjectId>();
  for (const row of rows) seen.set(String(row.pod_id), row.pod_id);
  return [...seen.values()];
}

/** Pods a member attended that sit under one category, at either level. */
async function categoryAttendCount(
  uid: Types.ObjectId,
  categoryId: Types.ObjectId | null
): Promise<number> {
  if (!categoryId) return 0;
  const podIds = await attendedPodIds(uid);
  if (podIds.length === 0) return 0;
  // A club carries the pod's activity, and an admin may point the badge at
  // either the super category ("Pets") or the category under it, so both count.
  const clubIds = await ClubModel.distinct('_id', {
    $or: [{ category_id: categoryId }, { super_category_id: categoryId }],
  });
  if (clubIds.length === 0) return 0;
  return PodModel.countDocuments({ _id: { $in: podIds }, club_id: { $in: clubIds } });
}

/** How many different categories a member has attended pods in. */
async function distinctCategoryCount(uid: Types.ObjectId): Promise<number> {
  const podIds = await attendedPodIds(uid);
  if (podIds.length === 0) return 0;
  const clubIds = await PodModel.distinct('club_id', { _id: { $in: podIds } });
  if (clubIds.length === 0) return 0;
  const categoryIds = await ClubModel.distinct('category_id', { _id: { $in: clubIds } });
  return categoryIds.filter(Boolean).length;
}

/**
 * The busiest calendar month this member has had, counted in pods attended.
 *
 * Grouped in the platform's configured timezone rather than UTC: a 12:30am pod
 * in Kolkata falls inside the previous UTC month, and the member would be told
 * they were one short of a month they had already finished.
 */
async function bestMonthAttendCount(uid: Types.ObjectId): Promise<number> {
  const { time_zone: timezone } = await settingsService.getPublicAppSettings();
  const rows = await TicketModel.aggregate<{ total: number }>([
    { $match: { user_id: uid, status: 'CHECKED_IN', checked_in_at: { $ne: null } } },
    {
      $group: {
        _id: {
          year: { $year: { date: '$checked_in_at', timezone } },
          month: { $month: { date: '$checked_in_at', timezone } },
        },
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ]);
  return rows[0]?.total ?? 0;
}

/** Clubs the member has joined a pod in. */
async function clubJoinCount(uid: Types.ObjectId): Promise<number> {
  const memberPods = await PodMemberModel.find({ user_id: uid, status: 'JOINED' })
    .select('pod_id')
    .lean();
  if (memberPods.length === 0) return 0;
  const podIds = memberPods.map((m) => m.pod_id);
  const distinct = await PodModel.distinct('club_id', { _id: { $in: podIds } });
  return distinct.length;
}

type AutoBadgeCondition = Exclude<BadgeConditionType, 'MANUAL'>;
type MetricResolver = (uid: Types.ObjectId, badge: IBadge) => Promise<number>;

/**
 * One resolver per automatic condition. A map rather than a switch, so adding a
 * condition is a single entry and the compiler names the one that is missing.
 * MANUAL is absent on purpose — nothing is counted for it.
 */
const METRICS: Record<AutoBadgeCondition, MetricResolver> = {
  POD_JOIN_COUNT: (uid) => PodMemberModel.countDocuments({ user_id: uid, status: 'JOINED' }),
  POD_HOST_COUNT: (uid) => PodModel.countDocuments({ pod_hosts_id: uid }),
  CLUB_JOIN_COUNT: (uid) => clubJoinCount(uid),
  POD_REFERRAL_COUNT: (uid) =>
    PodMemberModel.countDocuments({ referred_by: uid, status: 'JOINED' }),
  POD_ATTEND_COUNT: (uid) => TicketModel.countDocuments({ user_id: uid, status: 'CHECKED_IN' }),
  CATEGORY_POD_ATTEND_COUNT: (uid, badge) => categoryAttendCount(uid, badge.category_id),
  // A ticket admitting more than one seat IS the +1 — the extra seats are what
  // the member brought along.
  PLUS_ONE_POD_COUNT: (uid) =>
    TicketModel.countDocuments({ user_id: uid, status: 'CHECKED_IN', seats: { $gt: 1 } }),
  DISTINCT_CATEGORY_COUNT: (uid) => distinctCategoryCount(uid),
  MONTHLY_POD_ATTEND_COUNT: (uid) => bestMonthAttendCount(uid),
  ROLE_GRANTED: async (uid, badge) => {
    if (!badge.role_key) return 0;
    const holder = await UserModel.exists({ _id: uid, 'metadata.role_keys': badge.role_key });
    return holder ? 1 : 0;
  },
};

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

export interface BadgeProgressRow {
  badge: ReturnType<typeof toBadge>;
  current: number;
  target: number;
  achieved: boolean;
  achieved_at: string | null;
}

/**
 * Records WHEN a badge was first earned. Eligibility itself stays live, so this
 * row never decides whether the member holds the badge — only the date under
 * it, which a later recount can no longer recover.
 */
async function stampAward(
  uid: Types.ObjectId,
  badge: IBadge,
  reason: string
): Promise<IUserBadge> {
  const doc = await UserBadgeModel.findOneAndUpdate(
    { user_id: uid, badge_id: badge._id },
    {
      $setOnInsert: {
        user_id: uid,
        badge_id: badge._id,
        awarded_at: new Date(),
        awarded_reason: reason,
      },
    },
    { upsert: true, new: true }
  );
  return doc as IUserBadge;
}

/** A MANUAL badge is earned exactly when an admin has awarded it. */
async function manualProgress(uid: Types.ObjectId, badge: IBadge): Promise<BadgeProgressRow> {
  const awarded = await UserBadgeModel.findOne({ user_id: uid, badge_id: badge._id }).lean();
  return {
    badge: toBadge(badge),
    current: awarded ? 1 : 0,
    target: 1,
    achieved: !!awarded,
    achieved_at: awarded?.awarded_at?.toISOString?.() ?? null,
  };
}

/** A counted badge is earned the moment its metric reaches the threshold. */
async function countedProgress(uid: Types.ObjectId, badge: IBadge): Promise<BadgeProgressRow> {
  const target = Math.max(1, badge.threshold ?? 1);
  const current = await METRICS[badge.condition_type as AutoBadgeCondition](uid, badge);
  if (current < target) {
    return { badge: toBadge(badge), current, target, achieved: false, achieved_at: null };
  }
  const awarded = await stampAward(uid, badge, `${badge.condition_type} ${current}/${target}`);
  return {
    badge: toBadge(badge),
    current,
    target,
    achieved: true,
    achieved_at: awarded.awarded_at?.toISOString?.() ?? null,
  };
}

/**
 * Badges are computed on the fly from raw activity rather than awarded by an
 * event, so a member's page always reflects where they actually stand — and a
 * condition that stops holding (a cancelled ticket) stops reading as met.
 *
 * Kept as a no-op so the pod / payment call sites that used to trigger an
 * evaluation keep compiling without edits scattered across the codebase.
 */
export async function evaluateBadgesForUser(_userId: string, _event?: BadgeEvent) {
  /* no-op: badges are computed live in badgeService.progressForUser */
}

export const badgeService = {
  async list(filter?: { is_active?: boolean }) {
    const q: Record<string, unknown> = {};
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    const docs = await BadgeModel.find(q).sort({ sort_order: 1, created_at: 1 });
    return docs.map(toBadge);
  },

  async getById(id: string) {
    const d = await BadgeModel.findById(id);
    return d ? toBadge(d) : null;
  },

  async create(input: Record<string, any>) {
    const badge_id = input.badge_id?.trim() || `${slugify(input.title)}-${Date.now().toString(36)}`;
    const dupe = await BadgeModel.findOne({ badge_id });
    if (dupe) {
      throw new GraphQLError('Badge ID already exists', { extensions: { code: 'CONFLICT' } });
    }
    const doc = await BadgeModel.create({
      badge_id,
      title: input.title.trim(),
      description: input.description ?? '',
      image_url: input.image_url ?? '',
      condition_type: input.condition_type,
      threshold: input.threshold ?? 1,
      category_id: input.category_id ?? null,
      role_key: input.role_key ?? '',
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    });
    return toBadge(doc);
  },

  async update(id: string, input: Record<string, any>) {
    const doc = await BadgeModel.findById(id);
    if (!doc) throw new GraphQLError('Badge not found', { extensions: { code: 'NOT_FOUND' } });
    const fields = [
      'title',
      'description',
      'image_url',
      'condition_type',
      'threshold',
      'category_id',
      'role_key',
      'sort_order',
      'is_active',
    ] as const;
    for (const k of fields) {
      if (input[k] !== undefined) (doc as any)[k] = input[k];
    }
    await doc.save();
    return toBadge(doc);
  },

  async remove(id: string) {
    const doc = await BadgeModel.findById(id);
    if (!doc) throw new GraphQLError('Badge not found', { extensions: { code: 'NOT_FOUND' } });
    await doc.deleteOne();
    await UserBadgeModel.deleteMany({ badge_id: doc._id });
    return true;
  },

  /**
   * Every active badge with this member's standing against it — the whole
   * catalogue, locked ones included, because the Badges section exists to show
   * what is still to be won, not only what already has been.
   */
  async progressForUser(userId: string): Promise<BadgeProgressRow[]> {
    const badges = await BadgeModel.find({ is_active: true }).sort({
      sort_order: 1,
      created_at: 1,
    });
    const uid = new Types.ObjectId(userId);
    const rows: BadgeProgressRow[] = [];
    for (const badge of badges) {
      if (badge.condition_type === 'MANUAL') {
        rows.push(await manualProgress(uid, badge));
      } else {
        rows.push(await countedProgress(uid, badge));
      }
    }
    return rows;
  },

  /** The badges this member has earned — what a profile page shows. */
  async listForUser(userId: string) {
    const progress = await badgeService.progressForUser(userId);
    return progress
      .filter((row) => row.achieved)
      .map((row) => ({
        id: `${row.badge.id}-${userId}`,
        user_id: userId,
        badge_id: row.badge.id,
        badge: row.badge,
        awarded_at: row.achieved_at ?? '',
        awarded_reason: `${row.current}/${row.target}`,
      }));
  },

  async awardManually(userId: string, badgeId: string, reason?: string) {
    const badge = await BadgeModel.findById(badgeId);
    if (!badge) throw new GraphQLError('Badge not found', { extensions: { code: 'NOT_FOUND' } });
    const uid = new Types.ObjectId(userId);
    const upd = await stampAward(uid, badge, reason || 'manual');
    return toUserBadge({ ...(upd.toObject() as any), _badge: badge });
  },

  async revoke(userId: string, badgeId: string) {
    await UserBadgeModel.deleteOne({
      user_id: new Types.ObjectId(userId),
      badge_id: new Types.ObjectId(badgeId),
    });
    return true;
  },

  /**
   * The shipped badge catalogue. `$setOnInsert` only, so a title, threshold or
   * artwork an admin has edited survives every redeploy.
   */
  async seedDefaults() {
    for (const seed of DEFAULT_BADGES) {
      await BadgeModel.updateOne(
        { badge_id: seed.badge_id },
        { $setOnInsert: { ...seed, image_url: '', category_id: null, is_active: true } },
        { upsert: true }
      );
    }
    // Categories are admin-managed, so Pack Champion ships unlinked and picks
    // up the pet category on the first boot after somebody creates it. Scoped
    // to `category_id: null` so an admin who pointed it elsewhere keeps it.
    const pet = await CategoryModel.findOne({ slug: PACK_CHAMPION_CATEGORY_SLUG })
      .select('_id')
      .lean();
    if (!pet) return;
    await BadgeModel.updateOne(
      { badge_id: PACK_CHAMPION_BADGE_ID, category_id: null },
      { $set: { category_id: pet._id } }
    );
  },
};
