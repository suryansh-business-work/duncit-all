import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { computePolicyVersion } from '../../portalSecurity.policy';

/** What the Security Verification integration suites share: tokens, accounts, documents and inputs. */

export const secret = () => process.env.JWT_SECRET as string;

export interface Psv {
  portal: string;
  verified: boolean;
  policy?: string;
}

/** A console token as the server mints it, with or without the verification claim. */
export function tokenFor(
  id: string,
  roles: string[],
  psv?: Psv,
  signWith = secret(),
  email: string | null = 'person@duncit.com'
): string {
  return jwt.sign(
    { id, email, roles, assigned_city: null, assigned_zones: [], ...(psv ? { psv } : {}) },
    signWith
  );
}

/**
 * An active account. `named: false` leaves the profile without a name, `withEmail: false` the sign-in
 * without an address, `withRoleKeys: false` the account without its role cache.
 */
export async function account(
  email: string,
  roles: string[],
  first = 'Asha',
  options: { named?: boolean; status?: string; withEmail?: boolean; withRoleKeys?: boolean } = {}
): Promise<string> {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({
    _id,
    auth: options.withEmail === false ? {} : { email },
    profile: options.named === false ? {} : { first_name: first, last_name: 'Rao' },
    metadata: {
      status: options.status ?? 'ACTIVE',
      ...(options.withRoleKeys === false ? {} : { role_keys: roles }),
      created_at: new Date(),
      updated_at: new Date(),
    },
  } as never);
  return _id.toHexString();
}

export const pending = (id: string, portal = 'finance') =>
  tokenFor(id, ['USER', 'FINANCE_MANAGER'], { portal, verified: false });

interface GqlFailure {
  response?: { errors?: Array<{ message: string; extensions?: { code?: string; errors?: string[] } }> };
}

/** The first GraphQL error of a call that is expected to fail. */
export async function failure(call: Promise<unknown>) {
  try {
    await call;
  } catch (error) {
    const first = (error as GqlFailure).response?.errors?.[0];
    if (!first) throw error;
    return first;
  }
  throw new Error('the call was expected to fail');
}

export const CHALLENGE = `query { portalSecurityChallenge { portal_key reverify policy_version retention_days user_name
  sections { key } links { title policy_type url } detected { ip ip_location_is_approximate browser os } exception { status } } }`;
export const SUBMIT = `mutation($input: PortalSecurityVerificationInput!) {
  submitPortalSecurityVerification(input: $input) { token verified_at policy_version record_id } }`;
export const REQUEST_EXCEPTION = `mutation($input: PortalSecurityExceptionRequestInput!) {
  requestPortalSecurityException(input: $input) { id status reason } }`;
export const DECIDE = `mutation($input: PortalSecurityExceptionDecisionInput!) {
  decidePortalSecurityException(input: $input) { id status decided_by_name expires_at } }`;
export const EXCEPTION_STATUS = `query { portalSecurityException { id status reason } }`;

export const consent = {
  authorized_person: true,
  credentials_not_shared: true,
  policies_acknowledged: true,
  location_consent: true,
};
export const FIX = { latitude: 12.9716, longitude: 77.5946, accuracy_meters: 18.5 };

export async function submitInput(over: Record<string, unknown> = {}) {
  return {
    policy_version: await computePolicyVersion(),
    consent,
    location: FIX,
    client: { timezone: 'Asia/Kolkata', language: 'en-IN' },
    ...over,
  };
}
