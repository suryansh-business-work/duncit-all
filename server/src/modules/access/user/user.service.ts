import bcrypt from 'bcryptjs';
import { UserModel } from './user.model';
import { UserRoleModel } from './relations';
import { sendAdminCredentialsEmail } from '@services/email/email.service';
import { logs } from '@observability/log';
import { nextFreeUsername } from './user.accounts';
import { replaceUserRoles, userRoleMethods } from './user.roles';
import { userAuthMethods } from './user.auth';
import { userCredentialMethods } from './user.credentials';
import { userProfileMethods } from './user.profile';
import { userSavedPodMethods } from './user.saved';
import { userFollowMethods } from './user.follows';
import { userContactMethods } from './user.contact';
import { userAdminMethods } from './user.admin';

export { signToken } from './user.public';

/**
 * The user service. Each area lives in its own `user.<area>.ts` sibling and is
 * spread in here, so `userService` stays ONE object: methods that call a
 * sibling through `this` / `userService` resolve it on this object at call
 * time, exactly as when they were written in one literal.
 */
export const userService = {
  ...userRoleMethods,
  ...userAuthMethods,
  ...userCredentialMethods,
  ...userProfileMethods,
  ...userSavedPodMethods,
  ...userFollowMethods,
  ...userContactMethods,
  ...userAdminMethods,

  // Boot-time variant: creates the root super admin only when it is missing
  // (fresh database, e.g. a brand-new staging replica). No-ops — and sends no
  // credentials email — when the account already exists, so restarts never
  // spam the inbox. The manual seedSuperAdmin mutation below stays unchanged.
  async ensureSuperAdmin(): Promise<void> {
    const DEFAULT_EMAIL = process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@duncit.com';
    const existing = await UserModel.findOne({ 'auth.email': DEFAULT_EMAIL }).select('_id').lean();
    if (existing) return;
    await userService.seedSuperAdmin();
  },

  async seedSuperAdmin(): Promise<{ created: boolean; emailed: boolean; email: string }> {
    const DEFAULT_EMAIL = process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@duncit.com';
    const DEFAULT_PASSWORD = process.env.DEFAULT_SUPER_ADMIN_PASSWORD || '12345678';

    const existing = await UserModel.findOne({ 'auth.email': DEFAULT_EMAIL });
    let created = false;

    if (existing) {
      const hasSuper = (existing.metadata?.role_keys ?? []).includes('SUPER_ADMIN');
      if (!hasSuper) {
        await replaceUserRoles(
          String(existing._id),
          [...(existing.metadata?.role_keys ?? []), 'SUPER_ADMIN'],
          {
            assignedZones: existing.metadata?.assigned_zones ?? [],
            assignedCity: existing.profile?.assigned_city ?? null,
          }
        );
      }
    } else {
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      // Seed uses sentinel phone 0000000000 / +91 by design — these rows are
      // the only place that bypasses the placeholder-phone validator. Mark
      // them as already migrated so the migration script skips them.
      const doc = await UserModel.create({
        auth: {
          email: DEFAULT_EMAIL,
          is_email_verified: true,
          password: hashed,
          phone: { number: '0000000000', extension: '+91', is_verified: false },
        },
        profile: {
          first_name: 'Super',
          last_name: 'Admin',
          dob: new Date('1990-01-01'),
          country: 'India',
          username: await nextFreeUsername('Super', 'Admin'),
        },
        metadata: {
          status: 'ACTIVE',
          is_first_time_user: false,
          role_keys: ['SUPER_ADMIN'],
        },
      });
      await UserRoleModel.create({
        user_id: doc._id,
        role: 'SUPER_ADMIN',
        scope: { city: null, zone: null },
      });
      created = true;
    }

    let emailed = false;
    try {
      await sendAdminCredentialsEmail({
        to: DEFAULT_EMAIL,
        name: 'Super Admin',
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
      });
      emailed = true;
    } catch (e) {
      logs.server.error('user.service', 'seedSuperAdmin', { error: e, msg: 'Admin credentials email failed' });
    }

    return { created, emailed, email: DEFAULT_EMAIL };
  },
};
