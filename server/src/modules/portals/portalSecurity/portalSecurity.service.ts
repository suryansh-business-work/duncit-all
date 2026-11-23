import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext, PendingPortalSession } from '@context';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import { UserModel } from '@modules/access/user/user.model';
import { authPayload } from '@modules/access/user/user.public';
import { geoFromIp, parseUserAgent } from '@modules/crm/marketing/shortLink.analytics';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { assertPortalLogin } from '../portal.gate';
import { setCurrentPolicyVersion, verifiedClaim } from './portalSecurity.claims';
import {
  PORTAL_SECURITY_NOTICE_VERSION,
  PORTAL_SECURITY_RETENTION_DAYS,
  type VerificationMethod,
  type VerificationResult,
} from './portalSecurity.constants';
import { hashIp, maskIp, normalizeIp, sealCoordinates, sealField } from './portalSecurity.crypto';
import { employeeStanding } from './portalSecurity.employee';
import { PortalSecurityExceptionModel, PortalSecurityVerificationModel } from './portalSecurity.model';
import { computePolicyVersion, linkedPolicyLinks, noticeSections } from './portalSecurity.policy';
import {
  exceptionRequestSchema,
  verificationInputSchema,
  type ExceptionRequestInput,
  type VerificationInput,
} from './portalSecurity.validator';
import { validate } from '@utils/validate';

/** What the server itself can see of the request — nothing here comes from the screen. */
export interface RequestFacts {
  ip: string | null;
  userAgent: string | null;
  duid: string | null;
}

export function requestFacts(ctx: GraphQLContext): RequestFacts {
  // `req.ip` is the address the first trusted proxy (nginx) saw — Express's
  // `trust proxy` setting — not a header the caller can write.
  return {
    ip: normalizeIp(ctx.req?.ip),
    userAgent: String(ctx.req?.headers?.['user-agent'] ?? '').slice(0, 300) || null,
    duid: ctx.device_id,
  };
}

/** The pending session a verification operation is for, or the standard refusal. */
export function requirePendingSession(ctx: GraphQLContext): PendingPortalSession {
  if (ctx.portalSecurity) return ctx.portalSecurity;
  throw new GraphQLError('No security verification is waiting for this session', {
    extensions: { code: ctx.user ? 'BAD_REQUEST' : 'UNAUTHENTICATED' },
  });
}

/** The account behind a pending session — fresh, never trusted from the token. */
async function activeAccount(userId: string) {
  if (!Types.ObjectId.isValid(userId) || isAccountLocked(userId)) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  const user = await UserModel.findById(userId);
  if (user?.metadata?.status !== 'ACTIVE') {
    throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
  }
  return user;
}

/** A person's name as it reads in the log: their name, else their address, else nothing. */
export const displayName = (user: { first_name?: string | null; last_name?: string | null; email?: string | null }) =>
  [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || '';

/** The latest alternative-verification request of this person for this console. */
async function latestException(userId: string, portal: string) {
  const row = await PortalSecurityExceptionModel.findOne({
    user_id: new Types.ObjectId(userId),
    portal_key: portal,
  }).sort({ created_at: -1 });
  if (row?.status === 'APPROVED' && row.expires_at && row.expires_at.getTime() <= Date.now()) {
    row.status = 'EXPIRED';
    await row.save();
  }
  return row;
}

const exceptionPub = (row: Awaited<ReturnType<typeof latestException>>) =>
  row
    ? {
        id: String(row._id),
        status: row.status,
        reason: row.reason,
        decision_note: row.decision_note ?? null,
        created_at: row.created_at.toISOString(),
        decided_at: row.decided_at ? row.decided_at.toISOString() : null,
        expires_at: row.expires_at ? row.expires_at.toISOString() : null,
      }
    : null;

/** What the screen needs to render: the wording, what we detect, and where an exception stands. */
async function challenge(ctx: GraphQLContext) {
  const pending = requirePendingSession(ctx);
  const facts = requestFacts(ctx);
  const [user, version, urls, links, exception] = await Promise.all([
    activeAccount(pending.userId),
    computePolicyVersion(),
    getUrlConfigs(),
    linkedPolicyLinks(),
    latestException(pending.userId, pending.portal),
  ]);
  const agent = parseUserAgent(facts.userAgent);
  const geo = geoFromIp(facts.ip);
  return {
    portal_key: pending.portal,
    reverify: pending.reverify,
    policy_version: version,
    notice_version: PORTAL_SECURITY_NOTICE_VERSION,
    retention_days: PORTAL_SECURITY_RETENTION_DAYS,
    user_name: displayName({
      first_name: user.profile?.first_name,
      last_name: user.profile?.last_name,
      email: user.auth?.email,
    }),
    sections: noticeSections(urls.supportEmail),
    links,
    detected: {
      ip: facts.ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      // Always true. An address maps to a provider's region, not to a person's
      // position; the screen must never present it as a GPS fix.
      ip_location_is_approximate: true,
      browser: agent.browser,
      os: agent.os,
      device_type: agent.device_type,
      user_agent: facts.userAgent,
      server_time: new Date().toISOString(),
    },
    exception: exceptionPub(exception),
  };
}

interface RecordArgs {
  pending: PendingPortalSession;
  name: string;
  email: string;
  roles: string[];
  policyVersion: string;
  result: VerificationResult;
  method: VerificationMethod | null;
  facts: RequestFacts;
  input: Partial<VerificationInput> & { client?: VerificationInput['client'] };
  locationError?: string | null;
  exceptionId?: string | null;
}

/** Write one verification row — shared by a verification and by a recorded refusal. */
async function writeRecord(args: RecordArgs) {
  const { pending, facts, input } = args;
  const agent = parseUserAgent(facts.userAgent);
  const geo = geoFromIp(facts.ip);
  const location = input.location ?? null;
  const consent = input.consent;
  const standing = await employeeStanding(pending.userId);
  return PortalSecurityVerificationModel.create({
    user_id: new Types.ObjectId(pending.userId),
    user_name: args.name,
    user_email: args.email,
    roles: args.roles,
    employee: standing,
    portal_key: pending.portal,
    result: args.result,
    method: args.method,
    policy_version: args.policyVersion,
    notice_version: PORTAL_SECURITY_NOTICE_VERSION,
    consent: {
      authorized_person: consent?.authorized_person === true,
      credentials_not_shared: consent?.credentials_not_shared === true,
      policies_acknowledged: consent?.policies_acknowledged === true,
      location_consent: consent?.location_consent === true,
    },
    ip_sealed: facts.ip ? sealField(facts.ip) : null,
    ip_hash: facts.ip ? hashIp(facts.ip) : null,
    ip_masked: facts.ip ? maskIp(facts.ip) : null,
    ip_geo: { country: geo.country, region: geo.region, city: geo.city },
    location_sealed: location ? sealCoordinates({ lat: location.latitude, lng: location.longitude }) : null,
    has_location: location !== null,
    accuracy_m: location ? location.accuracy_meters : null,
    location_error: args.locationError ?? null,
    device: {
      browser: agent.browser,
      os: agent.os,
      device_type: agent.device_type,
      user_agent: facts.userAgent,
      duid: facts.duid,
      timezone: input.client?.timezone ?? null,
      language: input.client?.language ?? null,
      platform: input.client?.platform ?? null,
    },
    exception_id: args.exceptionId ? new Types.ObjectId(args.exceptionId) : null,
    signed_in_at: pending.issuedAt ? new Date(pending.issuedAt * 1000) : null,
  });
}

/**
 * Spend an approved alternative verification — once. The status flip is one
 * atomic update, so two tabs cannot both use the same approval.
 */
async function consumeException(id: string, pending: PendingPortalSession) {
  const spent = await PortalSecurityExceptionModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(pending.userId),
      portal_key: pending.portal,
      status: 'APPROVED',
      expires_at: { $gt: new Date() },
    },
    { $set: { status: 'USED', used_at: new Date() } },
    { new: true }
  );
  if (!spent) {
    throw new GraphQLError('This approval is no longer valid. Ask an administrator again.', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return spent;
}

async function submit(ctx: GraphQLContext, rawInput: unknown) {
  const pending = requirePendingSession(ctx);
  const input = await validate(verificationInputSchema, rawInput);
  const facts = requestFacts(ctx);
  // Without an address the record would prove nothing: refuse rather than log a blank.
  if (!facts.ip) {
    throw new GraphQLError('We could not read your network address, so this sign-in cannot be verified', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  const version = await computePolicyVersion();
  if (input.policy_version !== version) {
    throw new GraphQLError('The terms changed while you were reading them. Reload and review them again.', {
      extensions: { code: 'POLICY_CHANGED', policy_version: version },
    });
  }

  // The version this process checks sessions against moves with the consent just
  // given, so the token minted below is not read as stale for the minute the
  // periodic refresh would otherwise take to catch up.
  setCurrentPolicyVersion(version);
  const user = await activeAccount(pending.userId);
  const claim = verifiedClaim(pending.portal, version);
  const session = await authPayload(user, claim);
  // Roles can be revoked while the screen is open; this is the moment that grants the session.
  assertPortalLogin(pending.portal, session.user.roles);

  const usingException = Boolean(input.exception_id);
  if (input.exception_id) await consumeException(input.exception_id, pending);

  let record;
  try {
    record = await writeRecord({
      pending,
      name: displayName(session.user),
      email: session.user.email ?? '',
      roles: session.user.roles,
      policyVersion: version,
      result: usingException ? 'EXCEPTION_APPROVED' : 'VERIFIED',
      method: usingException ? 'ADMIN_EXCEPTION' : 'GPS',
      facts,
      // An approved alternative replaces the location, so none is kept with it.
      input: usingException ? { ...input, location: null } : input,
      exceptionId: input.exception_id ?? null,
    });
  } catch (error) {
    if (input.exception_id) {
      await PortalSecurityExceptionModel.updateOne(
        { _id: new Types.ObjectId(input.exception_id), status: 'USED' },
        { $set: { status: 'APPROVED', used_at: null } }
      );
    }
    throw error;
  }

  logs.server.info('portal-security', 'verified', {
    user_id: pending.userId,
    portal: pending.portal,
    result: record.result,
    msg: 'console sign-in verified',
  });
  return {
    token: session.token,
    verified_at: record.created_at.toISOString(),
    policy_version: version,
    record_id: String(record._id),
  };
}

/**
 * "I cannot or will not share my location."
 *
 * Declining is a legitimate answer, and it is recorded — the log shows a
 * refusal as a refusal. It never opens the console: an administrator decides
 * whether another way of verifying is acceptable.
 */
async function requestException(ctx: GraphQLContext, rawInput: unknown) {
  const pending = requirePendingSession(ctx);
  const input: ExceptionRequestInput = await validate(exceptionRequestSchema, rawInput);
  const user = await activeAccount(pending.userId);
  const standing = await latestException(pending.userId, pending.portal);
  // One request at a time: asking again while one waits returns the one that waits.
  if (standing && (standing.status === 'PENDING' || standing.status === 'APPROVED')) return exceptionPub(standing);

  const facts = requestFacts(ctx);
  const name = displayName({
    first_name: user.profile?.first_name,
    last_name: user.profile?.last_name,
    email: user.auth?.email,
  });
  const created = await PortalSecurityExceptionModel.create({
    user_id: new Types.ObjectId(pending.userId),
    user_name: name,
    portal_key: pending.portal,
    reason: input.reason,
    location_error: input.location_error ?? null,
  });
  await writeRecord({
    pending,
    name,
    email: user.auth?.email ?? '',
    // The schema gives every account at least the member role, so this is never empty-handed.
    roles: user.metadata.role_keys,
    policyVersion: await computePolicyVersion(),
    result: 'LOCATION_DENIED',
    method: null,
    facts,
    input: {},
    locationError: input.location_error ?? null,
    exceptionId: String(created._id),
  });
  logs.server.warn('portal-security', 'exception-requested', {
    user_id: pending.userId,
    portal: pending.portal,
    msg: 'alternative verification requested',
  });
  return exceptionPub(created);
}

async function exceptionStatus(ctx: GraphQLContext) {
  const pending = requirePendingSession(ctx);
  return exceptionPub(await latestException(pending.userId, pending.portal));
}

export const portalSecurityService = {
  challenge,
  submit,
  requestException,
  exceptionStatus,
};
