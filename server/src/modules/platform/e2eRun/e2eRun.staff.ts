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

/** The role each portal's sign-in admits (server/src/modules/access/portal/portal.constants.ts). */
const GRANTABLE_ROLES: ReadonlySet<string> = new Set(['SUPPORT_MANAGER', 'LEGAL_MANAGER', 'ALL_PODS_ACCESS']);

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

export interface GrantE2eRunAccountRolesInput {
  stamp: string;
  email: string;
  roles: string[];
}

export async function grantRunAccountRoles(input: GrantE2eRunAccountRolesInput): Promise<string[]> {
  const stamp = String(input?.stamp ?? '').trim();
  if (!stampTime(stamp)) throw badInput('stamp must be the run’s ddMMyyyyHHmm identity stamp.');
  const email = String(input?.email ?? '').trim().toLowerCase();
  const roles = (input?.roles ?? []).map((role) => String(role).trim().toUpperCase());
  const refusedRole = roles.find((role) => !GRANTABLE_ROLES.has(role));
  if (roles.length === 0 || refusedRole) {
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
  let granted: { roles?: string[] | null } | null = null;
  for (const role of roles) {
    granted = await userService.addRole(String(user._id), role);
  }
  logs.server.info('e2eRun', 'grant-roles', { stamp, roles });
  return granted?.roles ?? [];
}
