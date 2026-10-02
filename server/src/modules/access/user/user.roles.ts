/**
 * `userService` — role assignment, admin grants and the onboarding/notification
 * sync that follows a role change. Composed into `userService` in user.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import { UserRoleModel } from './relations';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import {
  sendAdminAccessGrantedEmail,
  sendAdminAccessRevokedEmail,
  sendPartnerAccessGrantedEmail,
} from '@services/email/email.service';
import { logs } from '@observability/log';
import { toPublic } from './user.public';

// Privileged role keys that require phone-verified + 2FA for elevated session.
const PRIVILEGED_ROLE_KEYS = [
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'ECOMM_MANAGER',
  'FINANCE_USER',
  'ADS_MANAGER',
  'CRM_MANAGER',
  'FINANCE_MANAGER',
  'TECH_MANAGER',
] as const;

// Onboarding roles that mirror an approved Host / Venue / Brand. Removing one
// must downgrade the corresponding entity so the onboarding status reflects it.
const ONBOARDING_REVOKE_ROLES = new Set(['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN']);

// The role that opens every Duncit console. Its own mail on the way in and out.
const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

// Partner-portal roles: granting one (from ANY path — admin grant or an
// onboarding approval) emails the user their Partners-account link + login
// guidance and sends a push notification.
export const PARTNER_ROLE_LABELS: Record<string, string> = {
  HOST: 'Host',
  VENUE_OWNER: 'Venue Partner',
  ECOMM_MANAGER: 'Product Seller',
  CLUB_ADMIN: 'Club Admin',
};

/** Best-effort partner-access mail + push for freshly granted partner roles —
 * never blocks the role write. */
async function notifyPartnerAccessGranted(userId: string, addedRoles: string[]) {
  const partnerRoles = addedRoles.filter((r) => PARTNER_ROLE_LABELS[r]);
  if (partnerRoles.length === 0) return;
  try {
    const target = await UserModel.findById(userId).select('auth.email profile.first_name');
    if (!target) return;
    const { getUrlConfigs } = await import('../../../config/url-configs');
    const { partnersUrl } = await getUrlConfigs();
    const name = target.profile?.first_name || 'there';
    const email = target.auth?.email ?? '';
    for (const role of partnerRoles) {
      const label = PARTNER_ROLE_LABELS[role];
      // No `if (email)`: the send records a FAILED row for a missing address,
      // and "we granted them partner access and never told them" is exactly
      // the kind of silence the email log exists to break.
      sendPartnerAccessGrantedEmail({ to: email, name, partner_type: label, portal_url: partnersUrl }).catch(
        (e) => logs.server.error('user.roles', 'notifyPartnerAccessGranted', { error: e, msg: 'partner access email failed', userId, role })
      );
      const { notificationService } = await import('@modules/engagement/notification/notification.service');
      await notificationService.create({
        title: `You're now a Duncit ${label} 🎉`,
        body: 'Your Partners account is live — open it to get started.',
        scope: 'USER',
        target_user_ids: [userId],
        silent: false,
      });
    }
  } catch (err) {
    logs.server.error('user.roles', 'notifyPartnerAccessGranted', { error: err, msg: 'partner access notify failed', userId });
  }
}

/**
 * Admin access, granted or removed, told to the person it happened to.
 *
 * This used to live in `grantAdmin`/`revokeAdmin`, which is only ONE of the two
 * doors: the Roles page's Super Admins card goes through those, but the user
 * detail page's Roles dialog has an Admin Panel switch that writes SUPER_ADMIN
 * through `assignUserRoles` — and that path sent nothing at all. Hooked onto
 * the role write itself, so no third door can miss it either.
 *
 * Best-effort — the roles are already committed and a mail must not undo them.
 */
async function notifyAdminAccessChange(userId: string, added: string[], removed: string[]) {
  const granted = added.includes(SUPER_ADMIN_ROLE);
  if (!granted && !removed.includes(SUPER_ADMIN_ROLE)) return;
  try {
    const target = await UserModel.findById(userId).select('auth.email profile.first_name');
    if (!target) return;
    const send = granted ? sendAdminAccessGrantedEmail : sendAdminAccessRevokedEmail;
    // No `if (email)`: the send records a FAILED row for a missing address, and
    // "we made them an admin and never told them" is exactly the kind of
    // silence the email log exists to break.
    await send({
      to: target.auth?.email ?? '',
      name: target.profile?.first_name || 'there',
    });
  } catch (err) {
    logs.server.error('user.roles', 'notifyAdminAccessChange', {
      error: err,
      msg: 'admin access email failed',
      userId,
    });
  }
}

/** Downgrade a user's APPROVED onboarding entity when its role is revoked.
 * Best-effort + dynamic imports (the venue services import userService back). */
async function syncRevokedOnboarding(userId: string, removedRoles: string[]) {
  for (const role of removedRoles) {
    if (!ONBOARDING_REVOKE_ROLES.has(role)) continue;
    try {
      if (role === 'HOST') {
        const { hostService } = await import('@modules/venues/host/host.service');
        await hostService.revokeApprovalForUser(userId);
      } else if (role === 'VENUE_OWNER') {
        const { venueService } = await import('@modules/venues/venue/venue.service');
        await venueService.revokeApprovalForUser(userId);
      } else if (role === 'ECOMM_MANAGER') {
        const { ecommBrandService } = await import('@modules/venues/ecommBrand/ecommBrand.service');
        await ecommBrandService.revokeApprovalForUser(userId);
      } else if (role === 'CLUB_ADMIN') {
        const { clubService } = await import('@modules/clubs/club/club.service');
        await clubService.revokeAdminForUser(userId);
      }
    } catch (err) {
      logs.server.error('user.replaceUserRoles', 'syncRevokedOnboarding', { error: err, msg: 'onboarding revoke sync failed', userId, role });
    }
  }
}

/**
 * Give a freshly granted onboarding role the record that role is supposed to
 * have.
 *
 * Club Admin is the only one that needs it: Host, Venue Partner and E-Commerce
 * Brand each draft their entity when somebody APPLIES, so by the time the role
 * is granted the record already exists. A Club Admin has no application —
 * granting the role from the Admin portal IS the appointment — so without this
 * the person holds the role, opens the Partners console and works, while the
 * Onboarded Club Admins table and every picker built on that record show
 * nobody. This is the half that was missing.
 *
 * Best-effort and idempotent, exactly like the revoke side: a role write must
 * not fail because a downstream record could not be drafted.
 */
async function syncGrantedOnboarding(userId: string, addedRoles: string[]) {
  if (!addedRoles.includes('CLUB_ADMIN')) return;
  try {
    const { clubAdminProfileService } = await import(
      '@modules/clubs/clubAdminProfile/clubAdminProfile.service'
    );
    await clubAdminProfileService.ensureForUser(userId);
  } catch (err) {
    logs.server.error('user.replaceUserRoles', 'syncGrantedOnboarding', {
      error: err,
      msg: 'club admin record could not be drafted',
      userId,
    });
  }
}

// Replace the entire role set for a user. Authoritative writes go to
// user_roles; the role_keys + assigned_zones cache on the user doc is updated
// in the same transaction so JWT issuance and hot reads stay correct.
export async function replaceUserRoles(
  userId: string,
  roleKeys: string[],
  opts?: { assignedZones?: string[]; assignedCity?: string | null; assignedBy?: string | null }
) {
  const normalized = Array.from(
    new Set(roleKeys.map((k) => String(k || '').toUpperCase()).filter(Boolean))
  );
  const assignedZones = opts?.assignedZones ?? [];
  const assignedCity = opts?.assignedCity ?? null;
  const oid = new Types.ObjectId(userId);
  const assignedBy = opts?.assignedBy ? new Types.ObjectId(opts.assignedBy) : null;

  // Snapshot the current roles so we can detect onboarding roles being removed.
  const beforeDoc = await UserModel.findById(oid).select('metadata.role_keys').lean();
  const oldRoles = ((beforeDoc as any)?.metadata?.role_keys ?? []) as string[];

  const session = await UserModel.db.startSession();
  try {
    await session.withTransaction(async () => {
      await UserRoleModel.deleteMany({ user_id: oid }, { session });
      const rows: any[] = [];
      for (const role of normalized) {
        if (role === 'ZONAL_ADMIN' && assignedZones.length) {
          for (const zone of assignedZones) {
            rows.push({
              user_id: oid,
              role,
              scope: { zone, city: null },
              assigned_by: assignedBy,
            });
          }
        } else if (role === 'CITY_ADMIN' && assignedCity) {
          rows.push({
            user_id: oid,
            role,
            scope: { zone: null, city: assignedCity },
            assigned_by: assignedBy,
          });
        } else {
          rows.push({
            user_id: oid,
            role,
            scope: { zone: null, city: null },
            assigned_by: assignedBy,
          });
        }
      }
      if (rows.length) await UserRoleModel.insertMany(rows, { session });
      await UserModel.updateOne(
        { _id: oid },
        {
          $set: {
            'metadata.role_keys': normalized,
            'metadata.assigned_zones': assignedZones,
            'profile.assigned_city': assignedCity,
          },
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // After the role write commits, sync any revoked onboarding roles back to
  // the Host/Venue/Brand status (e.g. revoking HOST un-approves the host).
  const removed = oldRoles.filter((r) => !normalized.includes(r));
  if (removed.length) await syncRevokedOnboarding(userId, removed);
  // …and welcome freshly granted partner roles (mail + push, best-effort).
  const added = normalized.filter((r) => !oldRoles.includes(r));
  // The record first, so the welcome mail never arrives before the console it
  // points at has anything to show.
  if (added.length) await syncGrantedOnboarding(userId, added);
  if (added.length) await notifyPartnerAccessGranted(userId, added);
  // Admin access is a role too, and it changes from more than one screen.
  await notifyAdminAccessChange(userId, added, removed);
}

export const userRoleMethods = {
  async assignRoles(user_id: string, role_keys: string[]) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    await replaceUserRoles(user_id, role_keys, {
      assignedZones: target.metadata?.assigned_zones ?? [],
      assignedCity: target.profile?.assigned_city ?? null,
    });
    const fresh = await UserModel.findById(user_id);
    await userAuditService.record({ userId: user_id, before: target, after: fresh });
    return toPublic(fresh);
  },

  async addRole(user_id: string, role_key: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    current.add(String(role_key).toUpperCase());
    await replaceUserRoles(user_id, Array.from(current), {
      assignedZones: target.metadata?.assigned_zones ?? [],
      assignedCity: target.profile?.assigned_city ?? null,
    });
    const fresh = await UserModel.findById(user_id);
    await userAuditService.record({ userId: user_id, before: target, after: fresh });
    return toPublic(fresh);
  },

  async removeRole(user_id: string, role_key: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    current.delete(String(role_key).toUpperCase());
    await replaceUserRoles(user_id, Array.from(current), {
      assignedZones: target.metadata?.assigned_zones ?? [],
      assignedCity: target.profile?.assigned_city ?? null,
    });
    const fresh = await UserModel.findById(user_id);
    await userAuditService.record({ userId: user_id, before: target, after: fresh });
    return toPublic(fresh);
  },

  // Grant SUPER_ADMIN ("admin") access to a user. The welcome mail rides the
  // role write itself (notifyAdminAccessChange) so the Roles dialog's Admin
  // Panel switch sends the same one. Idempotent: re-granting sends nothing.
  async grantAdmin(user_id: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    if (!current.has('SUPER_ADMIN')) {
      current.add('SUPER_ADMIN');
      await replaceUserRoles(user_id, Array.from(current), {
        assignedZones: target.metadata?.assigned_zones ?? [],
        assignedCity: target.profile?.assigned_city ?? null,
      });
    }
    const fresh = await UserModel.findById(user_id);
    await userAuditService.record({ userId: user_id, before: target, after: fresh });
    return toPublic(fresh);
  },

  // Revoke SUPER_ADMIN access + email the user. The seeded root admin
  // (DEFAULT_SUPER_ADMIN_EMAIL) is protected and cannot be revoked.
  async revokeAdmin(user_id: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const rootEmail = (process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@duncit.com').toLowerCase();
    if ((target.auth?.email ?? '').toLowerCase() === rootEmail) {
      throw new GraphQLError('The root super admin cannot be revoked', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    if (current.has('SUPER_ADMIN')) {
      current.delete('SUPER_ADMIN');
      await replaceUserRoles(user_id, Array.from(current), {
        assignedZones: target.metadata?.assigned_zones ?? [],
        assignedCity: target.profile?.assigned_city ?? null,
      });
    }
    const fresh = await UserModel.findById(user_id);
    await userAuditService.record({ userId: user_id, before: target, after: fresh });
    return toPublic(fresh);
  },

  // Privileged-role gate. Call from any path issuing an elevated session.
  // Today this is permissive (warn only) so existing flows do not break, but
  // the helper is wired so future enablement is a one-line flip.
  isPrivileged(roleKeys: readonly string[]): boolean {
    return roleKeys.some((r) => (PRIVILEGED_ROLE_KEYS as readonly string[]).includes(r));
  },
};
