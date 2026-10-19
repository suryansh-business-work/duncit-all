import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { validate } from '@utils/validate';
import { logs } from '@observability/log';
import { FREELANCER_ROLE, FreelancerProfileModel, GigCategoryModel, type IFreelancerProfile } from './gigJob.model';
import { freelancerProfileInputSchema } from './gigJob.validator';

const fail = (code: string, message: string) => new GraphQLError(message, { extensions: { code } });

const toFreelancerProfile = (doc: IFreelancerProfile) => ({
  id: String(doc._id),
  display_name: doc.display_name ?? '',
  category_ids: (doc.category_ids ?? []).map(String),
  skills: doc.skills ?? [],
  city: doc.city ?? '',
  bio: doc.bio ?? '',
  portfolio_url: doc.portfolio_url ?? '',
  experience_years: doc.experience_years ?? 0,
  contact_phone: doc.contact_phone ?? '',
  contact_email: doc.contact_email ?? '',
  is_available: doc.is_available !== false,
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

/**
 * Hands the account the FREELANCER role — what turns the Earn with Duncit card
 * to "Already enabled". `assignRoles` replaces the whole set, so it is built
 * from the roles the user really holds, never from the drift-prone cache.
 */
async function grantFreelancerRole(userId: string) {
  const roles = new Set<string>(await effectiveRoleKeys(userId));
  if (roles.has(FREELANCER_ROLE)) return;
  roles.add('USER');
  roles.add(FREELANCER_ROLE);
  const { userService } = await import('@modules/access/user/user.service');
  await userService.assignRoles(userId, Array.from(roles));
  logs.server.info('gigJob', 'grantFreelancerRole', { userId });
}

export const freelancerService = {
  async mine(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await FreelancerProfileModel.findOne({ user_id: new Types.ObjectId(userId) });
    return doc ? toFreelancerProfile(doc) : null;
  },

  /** Self-serve — no meeting, no approval: saving the profile is joining. */
  async save(userId: string, raw: unknown) {
    const input = await validate(freelancerProfileInputSchema, raw);
    const ids = Array.from(new Set(input.category_ids)).filter((id) => Types.ObjectId.isValid(id));
    const active = await GigCategoryModel.countDocuments({ _id: { $in: ids }, is_active: true });
    if (ids.length === 0 || active !== ids.length) throw fail('BAD_USER_INPUT', 'Pick categories from the list');
    const doc = await FreelancerProfileModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId) },
      { $set: { ...input, category_ids: ids.map((id) => new Types.ObjectId(id)) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await grantFreelancerRole(userId);
    return toFreelancerProfile(doc);
  },
};
