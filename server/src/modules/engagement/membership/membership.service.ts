import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';
import {
  MembershipBenefitModel,
  MembershipNewsSubscriberModel,
  MembershipPlanModel,
  type IMembershipBenefit,
  type IMembershipNewsSubscriber,
  type IMembershipPlan,
} from './membership.model';
import { DEFAULT_MEMBERSHIP_BENEFITS, DEFAULT_MEMBERSHIP_PLANS } from './membership.seed';
import { isFeatureEnabled } from '@modules/platform/settings/featureFlag.gate';

/** Mongo's duplicate-key error — the unique user index rejecting a repeat. */
const DUPLICATE_KEY = 11000;

/** The feature flag that shows Membership in the apps (Admin > Feature flags). */
export const MEMBERSHIP_FLAG = 'membership';

export const planPub = (d: IMembershipPlan) => ({
  id: String(d._id),
  key: d.key,
  name: d.name,
  tagline: d.tagline ?? '',
  price_label: d.price_label ?? '',
  price_note: d.price_note ?? '',
  badge_label: d.badge_label ?? '',
  accent_color: d.accent_color ?? '',
  cta_label: d.cta_label ?? '',
  sort_order: d.sort_order ?? 0,
  is_active: !!d.is_active,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

export const benefitPub = (d: IMembershipBenefit) => ({
  id: String(d._id),
  group: d.group,
  label: d.label,
  values: (d.values ?? []).map((v) => ({ plan_key: v.plan_key, value: v.value ?? '' })),
  sort_order: d.sort_order ?? 0,
  is_active: !!d.is_active,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

export const subscriberPub = (d: IMembershipNewsSubscriber) => ({
  id: String(d._id),
  user_id: String(d.user_id),
  email: d.email,
  name: d.name ?? '',
  created_at: d.created_at?.toISOString?.() ?? '',
});

export const membershipService = {
  /**
   * The whole pricing screen in one round trip: the tiers, the comparison rows
   * and whether the caller already asked to be notified.
   *
   * `is_subscribed` makes this answer viewer-dependent, which is exactly why the
   * query stays OFF the Redis response-cache whitelist — a cached copy would
   * hand one member's subscribed state to everybody else.
   */
  async pricing(userId?: string | null) {
    /*
      With the `membership` flag off, no tier or price leaves the server. The
      flag already hides the menu row, but a deep link — or a build already in
      the store — still opens the page, and the App Store reads any price shown
      in the iOS app as a paid membership sold outside In-App Purchase (3.1.1).
      Empty lists render the clients' own "announced soon" state.
    */
    if (!(await isFeatureEnabled(MEMBERSHIP_FLAG))) {
      return { plans: [], benefits: [], is_subscribed: await this.isSubscribed(userId) };
    }
    const [plans, benefits, subscribed] = await Promise.all([
      MembershipPlanModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 }),
      MembershipBenefitModel.find({ is_active: true }).sort({ sort_order: 1, label: 1 }),
      this.isSubscribed(userId),
    ]);
    return {
      plans: plans.map(planPub),
      benefits: benefits.map(benefitPub),
      is_subscribed: subscribed,
    };
  },

  async isSubscribed(userId?: string | null): Promise<boolean> {
    if (!userId || !Types.ObjectId.isValid(userId)) return false;
    const doc = await MembershipNewsSubscriberModel.exists({
      user_id: new Types.ObjectId(userId),
    });
    return !!doc;
  },

  /**
   * Add the caller to the notify-me list.
   *
   * The address is READ FROM THE PROFILE, never taken from the request: a
   * client-supplied email would let a signed-in account subscribe somebody
   * else's inbox. Idempotent — a second tap returns the existing row rather
   * than failing, so the button never has to explain a duplicate.
   */
  async subscribe(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const user = await UserModel.findById(userId).select('auth.email profile.first_name profile.last_name');
    const email = String(user?.auth?.email ?? '').trim().toLowerCase();
    if (!email) {
      throw new GraphQLError('Add an email address to your profile first', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const name = [user?.profile?.first_name, user?.profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    const objectId = new Types.ObjectId(userId);
    try {
      const doc = await MembershipNewsSubscriberModel.create({ user_id: objectId, email, name });
      return subscriberPub(doc);
    } catch (e) {
      if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
      // Already on the list — the unique index is the guard, so the retry just
      // reads back what is already there.
      const existing = await MembershipNewsSubscriberModel.findOne({ user_id: objectId });
      if (!existing) throw e;
      return subscriberPub(existing);
    }
  },

  /**
   * Put the shipped catalogue in an empty database. `$setOnInsert` throughout,
   * so a tier or a row that Admin has since edited is never reset by a deploy.
   */
  async seedDefaults() {
    for (const plan of DEFAULT_MEMBERSHIP_PLANS) {
      await MembershipPlanModel.updateOne({ key: plan.key }, { $setOnInsert: plan }, { upsert: true });
    }
    for (const benefit of DEFAULT_MEMBERSHIP_BENEFITS) {
      await MembershipBenefitModel.updateOne(
        { group: benefit.group, label: benefit.label },
        { $setOnInsert: benefit },
        { upsert: true }
      );
    }
  },
};
