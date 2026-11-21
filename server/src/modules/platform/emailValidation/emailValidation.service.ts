import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import type { AuthUser } from '@context';
import { checkAndRecord } from '@modules/crm/emailVerification/emailVerification.check';
import {
  EmailVerificationModel,
  LEGACY_PORTAL,
  type EmailVerificationDoc,
} from '@modules/crm/emailVerification/emailVerification.model';
import { hasPortalAccess } from '@modules/portals/portal.gate';
import { PORTAL_GATE_EXEMPT_KEYS } from '@modules/portals/portal.constants';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { checksOf, verdictOf } from './emailValidation.checks';
import { splitLogFilters } from './emailValidation.filters';

/**
 * Email validation for every console: run a check from wherever an address is
 * shown, keep every check as a log row, re-run one from Admin. The verifier,
 * the record and the history are the CRM Email Verifier's — one engine, so a
 * check run in Finance and one run in the CRM land in the same log.
 */

/** Admin › Email Validations re-runs checks; a re-run is logged as Admin's. */
export const REVALIDATION_PORTAL = 'admin';

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
const forbidden = (message: string) => new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });

const LOG_TABLE: TableEntityConfig = {
  searchFields: ['email', 'checked_by.email', 'portal'],
  sortFields: {
    email: 'email',
    verdict: 'status',
    status: 'status',
    portal: 'portal',
    source: 'source',
    created_at: 'created_at',
  },
  // `verdict` and `portal` are handled by splitLogFilters before the engine sees the input.
  filterFields: {
    email: { type: 'string' },
    status: { type: 'enum' },
    source: { type: 'enum' },
    checked_by: { type: 'string', path: 'checked_by.email' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export function toValidation(doc: EmailVerificationDoc) {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    verdict: verdictOf(doc.status),
    status: doc.status,
    checks: checksOf(doc),
    suggestion: doc.suggestion ?? '',
    portal: doc.portal ?? LEGACY_PORTAL,
    source: doc.source,
    revalidated_from: doc.revalidated_from ?? null,
    checked_by: doc.checked_by?.email ?? '',
    created_at: doc.created_at.toISOString(),
  };
}

const actorOf = (user: AuthUser) => ({ id: user.id, email: user.email ?? '' });

/**
 * The console a check claims to run from, if this person can open it.
 *
 * The key is what the console sends, so it is checked against the same portal
 * gate its login uses. The member and partner apps are refused: a check is a
 * staff tool, and those surfaces pass the gate for every account.
 */
function portalFor(user: AuthUser, rawPortal: string): string {
  const portal = rawPortal.trim().toLowerCase();
  if (!portal || PORTAL_GATE_EXEMPT_KEYS.has(portal) || !hasPortalAccess(portal, user.roles)) {
    throw forbidden('You cannot validate emails from this console');
  }
  return portal;
}

export const emailValidationService = {
  /** Check one address now, from the console named, and log it. */
  async validate(user: AuthUser, email: string, rawPortal: string) {
    const portal = portalFor(user, rawPortal);
    if (!email.trim()) throw badInput('Enter an email address');
    const doc = await checkAndRecord(email, actorOf(user), 'SINGLE', null, { portal });
    return toValidation(doc.toObject<EmailVerificationDoc>());
  },

  /** Check a logged address again. The earlier row stays; the new one points back at it. */
  async revalidate(user: AuthUser, id: string) {
    const previous = isValidObjectId(id)
      ? await EmailVerificationModel.findById(id).select('email').lean<{ email: string }>()
      : null;
    if (!previous) throw new GraphQLError('That validation no longer exists', { extensions: { code: 'NOT_FOUND' } });
    const doc = await checkAndRecord(previous.email, actorOf(user), 'SINGLE', null, {
      portal: REVALIDATION_PORTAL,
      revalidatedFrom: id,
    });
    return toValidation(doc.toObject<EmailVerificationDoc>());
  },

  /** Every check every console ran — Admin › Email Validations › Logs. */
  async table(rawInput?: TableQueryInput | null) {
    const { input, base } = splitLogFilters(rawInput);
    const { docs, total, page, page_size } = await runTableQuery<EmailVerificationDoc>(
      EmailVerificationModel,
      base,
      input,
      LOG_TABLE
    );
    return { rows: docs.map(toValidation), total, page, page_size };
  },
};
