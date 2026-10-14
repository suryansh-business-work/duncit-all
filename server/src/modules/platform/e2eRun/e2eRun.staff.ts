import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { userService } from '@modules/access/user/user.service';
import { e2eOverrides } from './e2eRun.mute';
import { stampTime } from './e2eRun.identity';

/**
 * Staff roles for the e2e run account.
 *
 * A run files a problem, a ticket, a grievance and a pod idea as a member, then
 * follows each one into the portal that handles it — Support, Legal, Pods. No
 * staff password is kept for that: the suite grants the run account the one
 * role each portal admits, signs in again for a token that carries it, and the
 * purge at the end deletes the account with its roles.
 *
 * Only the portal roles below can be granted, only to an address carrying this
 * run's stamp, and only while "one-time codes for the run account" is on — the
 * switch that declares a database an e2e target.
 */

/**
 * What a run account may be given: the sign-in role of the Support, Legal and
 * Pods portals, and the limited staff and partner roles the access specs sign in
 * with to prove what each role is refused. Never SUPER_ADMIN, TECH_MANAGER
 * (it runs the e2e API itself) or FINANCE_MANAGER (it releases money): a run
 * account is driven by a script, and those are the roles a script must not hold.
 */
const GRANTABLE_ROLES: ReadonlySet<string> = new Set([
  'SUPPORT_MANAGER',
  'LEGAL_MANAGER',
  'ALL_PODS_ACCESS',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'SUPPORT_USER',
  'FINANCE_USER',
  'LOGS_MANAGER',
  'ONBOARDING_MANAGER',
  'ALL_VENUES_ACCESS',
  'ALL_HOSTS_ACCESS',
  'ALL_CLUBS_ACCESS',
  'ALL_CLUB_ADMINS_ACCESS',
  'ECOMM_MANAGER',
  'CRM_MANAGER',
  'COMMUNICATIONS_MANAGER',
  'ADS_MANAGER',
]);

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

export interface GrantE2eRunAccountRolesInput {
  stamp: string;
  email: string;
  roles: string[];
}

type RoleChange = 'grant-roles' | 'revoke-roles';

export const grantRunAccountRoles = (input: GrantE2eRunAccountRolesInput) => changeRunAccountRoles(input, 'grant-roles');

/**
 * Take granted roles away again, under the same checks, so a spec that signed
 * in with a role can hand the account back as a plain member to the next one.
 */
export const revokeRunAccountRoles = (input: GrantE2eRunAccountRolesInput) =>
  changeRunAccountRoles(input, 'revoke-roles');

async function changeRunAccountRoles(input: GrantE2eRunAccountRolesInput, change: RoleChange): Promise<string[]> {
  const stamp = String(input?.stamp ?? '').trim();
  if (!stampTime(stamp)) throw badInput('stamp must be the run’s ddMMyyyyHHmm identity stamp.');
  const email = String(input?.email ?? '').trim().toLowerCase();
  const roles = (input?.roles ?? []).map((role) => String(role).trim().toUpperCase());
  if (roles.length === 0 || roles.some((role) => !GRANTABLE_ROLES.has(role))) {
    throw badInput(`Only ${[...GRANTABLE_ROLES].join(', ')} can be granted to a run account.`);
  }

  const { otpBypass, account } = await e2eOverrides();
  if (!otpBypass) {
    throw new GraphQLError(
      'One-time codes for the run account are off in Tech > E2E Tests > Settings on this server.',
      { extensions: { code: 'FORBIDDEN' } }
    );
  }
  if (!email.includes(stamp) || !account?.email.test(email)) {
    throw badInput('That address is not this run’s account.');
  }

  const user = await UserModel.findOne({ 'auth.email': email }, { _id: 1 }).lean();
  if (!user) throw new GraphQLError('The run account does not exist.', { extensions: { code: 'NOT_FOUND' } });
  const userId = String(user._id);
  const apply = (role: string) =>
    change === 'grant-roles' ? userService.addRole(userId, role) : userService.removeRole(userId, role);
  // One role at a time: each write reads the account's roles first, so writes in
  // parallel would overwrite one another.
  const changed = await roles.reduce<Promise<{ roles?: string[] | null } | null>>(
    (previous, role) => previous.then(() => apply(role)),
    Promise.resolve(null)
  );
  logs.server.info('e2eRun', change, { stamp, roles });
  return changed?.roles ?? [];
}
