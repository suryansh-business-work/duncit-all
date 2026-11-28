/**
 * The Duncit account behind an HR record, and the one role HR may hand out.
 *
 * Role grants are SUPER_ADMIN's (ROLE_ASSIGNERS). Hiring is the single
 * exception, and it is deliberately narrow: an HR hire grants EMPLOYEE — the
 * self-service console — and nothing else, and an exit takes exactly that role
 * away again. Both go through `replaceUserRoles`, the one door every role write
 * uses, so the session cache is dropped and the user change log records it.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { UserModel } from '@modules/access/user/user.model';
import { replaceUserRoles } from '@modules/access/user/user.roles';
import { numberHeldElsewhere } from '@modules/access/user/number-owner';
import { nextFreeUsername, registerDuplicateError, shapeUserDoc, welcomeNewAccount } from '@modules/access/user/user.accounts';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';

/** The only role an HR hire grants or an exit revokes. */
export const HR_GRANTED_ROLE = 'EMPLOYEE';

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

interface AccountDoc {
  _id: Types.ObjectId;
  auth?: { email?: string | null; phone?: { number?: string; extension?: string } | null };
  profile?: { first_name?: string; last_name?: string; assigned_city?: string | null };
  metadata?: { role_keys?: string[]; status?: string; assigned_zones?: string[] };
}

const ACCOUNT_FIELDS = 'auth.email auth.phone profile.first_name profile.last_name profile.assigned_city metadata.role_keys metadata.status metadata.assigned_zones';

export async function accountById(userId: string): Promise<AccountDoc> {
  if (!Types.ObjectId.isValid(userId)) fail('BAD_USER_INPUT', 'Invalid account id');
  const user = await UserModel.findById(userId).select(ACCOUNT_FIELDS).lean<AccountDoc>();
  if (!user) fail('NOT_FOUND', 'Account not found');
  return user as AccountDoc;
}

/** An existing account, refused when it is not active — a suspended account cannot be hired into. */
export async function existingAccount(userId: string): Promise<AccountDoc> {
  const user = await accountById(userId);
  if (user.metadata?.status && user.metadata.status !== 'ACTIVE') {
    fail('BAD_USER_INPUT', 'This account is not active. Reactivate it in the Admin console first.');
  }
  return user;
}

export interface NewAccountInput {
  email: string;
  phone_number: string | null;
  phone_extension: string | null;
  first_name: string;
  last_name: string;
}

/**
 * A fresh account for someone who has never used Duncit. No password is set:
 * they sign in to the Employee console with a one-time code or Google, so no
 * temporary password ever travels by chat or email.
 */
export async function createAccount(input: NewAccountInput, actorId: string): Promise<AccountDoc> {
  if (await UserModel.exists({ 'auth.email': input.email })) {
    fail('CONFLICT', 'An account already uses this email. Pick it under "Existing account" instead.');
  }
  if (input.phone_number && (await numberHeldElsewhere(input.phone_extension ?? '', input.phone_number))) {
    fail('CONFLICT', 'An account already uses this phone number. Pick it under "Existing account" instead.');
  }
  const username = await nextFreeUsername(input.first_name, input.last_name);
  const created = await UserModel.create(shapeUserDoc({ ...input, roles: ['USER'] }, { username })).catch((error: unknown) => {
    throw isDuplicateKeyError(error) ? registerDuplicateError(error) : error;
  });
  const userId = String(created._id);
  // A plain member until the HR record commits; the hire grants EMPLOYEE after
  // that, so a hire that fails half-way never leaves a console seat behind.
  await replaceUserRoles(userId, ['USER'], { assignedBy: actorId });
  await welcomeNewAccount(created, 'hr-hire');
  await userAuditService.recordCreate(userId, await UserModel.findById(created._id));
  logs.server.info('employee.account', 'created', { userId, actorId });
  return accountById(userId);
}

async function setRole(userId: string, actorId: string, grant: boolean): Promise<void> {
  const before = await UserModel.findById(userId);
  if (!before) return;
  const roles = new Set<string>(before.metadata?.role_keys ?? []);
  if (roles.has(HR_GRANTED_ROLE) === grant) return;
  if (grant) roles.add(HR_GRANTED_ROLE);
  else roles.delete(HR_GRANTED_ROLE);
  await replaceUserRoles(userId, [...roles], {
    assignedZones: before.metadata?.assigned_zones ?? [],
    assignedCity: before.profile?.assigned_city ?? null,
    assignedBy: actorId,
  });
  await userAuditService.record({ userId, before, after: await UserModel.findById(userId) });
  logs.server.info('employee.account', grant ? 'role-granted' : 'role-revoked', { userId, actorId });
}

export const grantEmployeeRole = (userId: string, actorId: string) => setRole(userId, actorId, true);
export const revokeEmployeeRole = (userId: string, actorId: string) => setRole(userId, actorId, false);
