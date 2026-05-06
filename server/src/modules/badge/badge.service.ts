import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { BadgeModel, UserBadgeModel, type IBadge, type IUserBadge } from './badge.model';
import { PodMemberModel } from '../podMember/podMember.model';
import { PodModel } from '../pod/pod.model';

export type BadgeEvent =
  | 'POD_JOIN'
  | 'POD_HOST'
  | 'CLUB_JOIN'
  | 'POD_REFERRAL';

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

async function getMetric(
  userId: string,
  conditionType: IBadge['condition_type']
): Promise<number> {
  const uid = new Types.ObjectId(userId);
  switch (conditionType) {
    case 'POD_JOIN_COUNT':
      return PodMemberModel.countDocuments({ user_id: uid, status: 'JOINED' });
    case 'POD_HOST_COUNT':
      return PodModel.countDocuments({ pod_hosts_id: uid });
    case 'CLUB_JOIN_COUNT': {
      // Count distinct clubs the user has joined a pod in.
      const memberPods = await PodMemberModel.find({ user_id: uid, status: 'JOINED' })
        .select('pod_id')
        .lean();
      if (!memberPods.length) return 0;
      const podIds = memberPods.map((m) => m.pod_id);
      const distinct = await PodModel.distinct('club_id', { _id: { $in: podIds } });
      return distinct.length;
    }
    case 'POD_REFERRAL_COUNT':
      return PodMemberModel.countDocuments({ referred_by: uid, status: 'JOINED' });
    default:
      return 0;
  }
}

/**
 * Badges are now computed on-the-fly from raw activity counts. We no longer
 * persist UserBadge documents on event triggers — eligibility is re-derived
 * every time `myBadges` or `userBadges` is queried so the UI always reflects
 * the user's current state and is automatically revoked if a condition no
 * longer holds (e.g. the user leaves a pod).
 *
 * This function is kept as a no-op so existing call sites in pod / payment
 * flows keep compiling without scattering edits across the codebase.
 */
export async function evaluateBadgesForUser(_userId: string, _event?: BadgeEvent) {
  /* no-op: badges are computed live in badgeService.listForUser */
}

export const badgeService = {
  async list(filter?: { is_active?: boolean }) {
    const q: any = {};
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    const docs = await BadgeModel.find(q).sort({ created_at: -1 });
    return docs.map(toBadge);
  },

  async getById(id: string) {
    const d = await BadgeModel.findById(id);
    return d ? toBadge(d) : null;
  },

  async create(input: any) {
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
      is_active: input.is_active ?? true,
    });
    return toBadge(doc);
  },

  async update(id: string, input: any) {
    const doc = await BadgeModel.findById(id);
    if (!doc) throw new GraphQLError('Badge not found', { extensions: { code: 'NOT_FOUND' } });
    for (const k of ['title', 'description', 'image_url', 'condition_type', 'threshold', 'is_active'] as const) {
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

  async listForUser(userId: string) {
    // Compute live: for each active condition badge, check the user's metric.
    // Manual badges remain in UserBadgeModel for back-compat (not displayed
    // here unless still present); they are not auto-revoked.
    const badges = await BadgeModel.find({ is_active: true });
    if (!badges.length) return [];
    const out: ReturnType<typeof toUserBadge>[] = [];
    const uid = new Types.ObjectId(userId);
    for (const b of badges) {
      if (b.condition_type === 'MANUAL') {
        const manual = await UserBadgeModel.findOne({ user_id: uid, badge_id: b._id }).lean();
        if (!manual) continue;
        out.push(toUserBadge({ ...(manual as any), _badge: b }));
        continue;
      }
      const metric = await getMetric(userId, b.condition_type);
      if (metric < b.threshold) continue;
      out.push(
        toUserBadge({
          _id: `${b._id}-${userId}` as any,
          user_id: uid,
          badge_id: b._id,
          awarded_at: new Date(),
          awarded_reason: `${b.condition_type} ${metric}/${b.threshold}`,
          _badge: b,
        } as any)
      );
    }
    return out;
  },

  async awardManually(userId: string, badgeId: string, reason?: string) {
    const badge = await BadgeModel.findById(badgeId);
    if (!badge) throw new GraphQLError('Badge not found', { extensions: { code: 'NOT_FOUND' } });
    const uid = new Types.ObjectId(userId);
    const upd = await UserBadgeModel.findOneAndUpdate(
      { user_id: uid, badge_id: badge._id },
      {
        $setOnInsert: {
          user_id: uid,
          badge_id: badge._id,
          awarded_at: new Date(),
          awarded_reason: reason || 'manual',
        },
      },
      { upsert: true, new: true }
    );
    return toUserBadge({ ...(upd!.toObject() as any), _badge: badge });
  },

  async revoke(userId: string, badgeId: string) {
    await UserBadgeModel.deleteOne({
      user_id: new Types.ObjectId(userId),
      badge_id: new Types.ObjectId(badgeId),
    });
    return true;
  },
};
