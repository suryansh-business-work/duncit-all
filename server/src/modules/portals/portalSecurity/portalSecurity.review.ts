import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext, AuthUser } from '@context';
import { requireRole } from '@middleware/rbac';
import { userDisplayOf } from '@modules/access/user/user.display';
import { logs } from '@observability/log';
import { validate } from '@utils/validate';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  EXCEPTION_VALID_HOURS,
  PORTAL_SECURITY_REVIEW_ROLES,
  type AccessAction,
} from './portalSecurity.constants';
import { hashIp, normalizeIp, openCoordinates, openField } from './portalSecurity.crypto';
import { employeeStanding } from './portalSecurity.employee';
import {
  PortalSecurityAccessLogModel,
  PortalSecurityExceptionModel,
  PortalSecurityVerificationModel,
  type PortalSecurityVerificationDoc,
} from './portalSecurity.model';
import { exceptionDecisionSchema } from './portalSecurity.validator';
import { requestFacts } from './portalSecurity.service';

/**
 * The reviewer's side: the verification log, a single row opened in full, and
 * the decision on an alternative-verification request.
 *
 * Location and address are the most sensitive things this module holds, so
 * every door here is `requireRole(PORTAL_SECURITY_REVIEW_ROLES)`, the list
 * never carries either (masked address, coarse place only), and OPENING a row
 * writes an access-trail entry BEFORE the sealed values are decrypted — if the
 * trail cannot be written, nothing is shown.
 */

type VerificationRow = PortalSecurityVerificationDoc & { _id: Types.ObjectId; created_at: Date };

const LOG_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['user_name', 'user_email', 'portal_key', 'ip_geo.city', 'ip_geo.region', 'ip_geo.country', 'employee.title'],
  sortFields: {
    created_at: 'created_at',
    user_name: 'user_name',
    portal_key: 'portal_key',
    result: 'result',
    is_employee: 'employee.is_employee',
    ip_country: 'ip_geo.country',
  },
  filterFields: {
    portal_key: { type: 'string' },
    result: { type: 'enum' },
    method: { type: 'enum' },
    is_employee: { type: 'boolean', path: 'employee.is_employee' },
    has_location: { type: 'boolean' },
    ip_country: { type: 'string', path: 'ip_geo.country' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const EXCEPTION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['user_name', 'portal_key', 'reason'],
  sortFields: { created_at: 'created_at', user_name: 'user_name', status: 'status', portal_key: 'portal_key' },
  filterFields: { status: { type: 'enum' }, portal_key: { type: 'string' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

/** Heavy and sealed fields a list page never needs, left out of the read itself. */
const LIST_PROJECTION = { ip_sealed: 0, location_sealed: 0, ip_hash: 0 } as const;

const iso = (value: Date | null | undefined) => (value ? new Date(value).toISOString() : null);

/** The columns of the log table. No address, no coordinates. */
function listRow(row: VerificationRow) {
  return {
    id: String(row._id),
    created_at: iso(row.created_at) as string,
    signed_in_at: iso(row.signed_in_at),
    user_id: String(row.user_id),
    user_name: row.user_name,
    user_email: row.user_email,
    roles: row.roles,
    portal_key: row.portal_key,
    result: row.result,
    method: row.method ?? null,
    is_employee: row.employee?.is_employee === true,
    employee_title: row.employee?.title ?? null,
    employee_department: row.employee?.department ?? null,
    employment_type: row.employee?.employment_type ?? null,
    ip_masked: row.ip_masked,
    ip_country: row.ip_geo?.country ?? null,
    ip_region: row.ip_geo?.region ?? null,
    ip_city: row.ip_geo?.city ?? null,
    has_location: row.has_location === true,
    accuracy_m: row.accuracy_m ?? null,
    browser: row.device?.browser ?? null,
    os: row.device?.os ?? null,
    device_type: row.device?.device_type ?? null,
    policy_version: row.policy_version,
  };
}

/** The reviewer as the trail names them: their name, else their address. */
async function reviewerName(actor: AuthUser): Promise<string> {
  const { name } = await userDisplayOf(actor.id);
  return name || (actor.email ?? '');
}

async function writeAccess(actor: AuthUser, ctx: GraphQLContext, action: AccessAction, recordId: string | null, summary: string | null) {
  await PortalSecurityAccessLogModel.create({
    actor_id: new Types.ObjectId(actor.id),
    actor_name: await reviewerName(actor),
    actor_roles: actor.roles,
    action,
    record_id: recordId ? new Types.ObjectId(recordId) : null,
    query_summary: summary,
    ip: requestFacts(ctx).ip,
  });
}

const summaryOf = (query?: TableQueryInput | null): string | null => {
  const parts = [query?.search ? `search="${query.search.slice(0, 80)}"` : '', ...(query?.filters ?? []).map((f) => `${f.field} ${f.op}`)];
  const text = parts.filter(Boolean).join('; ').slice(0, 300);
  return text || null;
};

async function logsTable(ctx: GraphQLContext, query?: TableQueryInput | null) {
  const actor = requireRole(ctx, PORTAL_SECURITY_REVIEW_ROLES);
  // An exact address in the search box is looked up by its keyed hash — the
  // stored value is sealed, so there is nothing to match a substring against.
  const ip = normalizeIp(query?.search);
  const searchByIp = ip ? hashIp(ip) : null;
  const effective: TableQueryInput | null | undefined = searchByIp ? { ...query, search: null } : query;
  const { docs, total, page, page_size } = await runTableQuery<VerificationRow>(
    PortalSecurityVerificationModel,
    searchByIp ? { ip_hash: searchByIp } : {},
    effective,
    LOG_TABLE_CONFIG,
    { projection: LIST_PROJECTION }
  );
  await writeAccess(actor, ctx, 'LIST', null, summaryOf(query));
  return { rows: docs.map(listRow), total, page, page_size };
}

/** What a reviewer sees when one row is opened: everything, with its time trail. */
async function logDetail(ctx: GraphQLContext, id: string) {
  const actor = requireRole(ctx, PORTAL_SECURITY_REVIEW_ROLES);
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Verification not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const row = await PortalSecurityVerificationModel.findById(id).lean<VerificationRow | null>();
  if (!row) throw new GraphQLError('Verification not found', { extensions: { code: 'NOT_FOUND' } });
  // The trail first: a read nobody can see happened is the thing this prevents.
  await writeAccess(actor, ctx, 'VIEW', id, null);

  const [current, related, accessed, exception] = await Promise.all([
    employeeStanding(String(row.user_id)),
    PortalSecurityVerificationModel.find({ user_id: row.user_id, _id: { $ne: row._id } })
      .sort({ created_at: -1 })
      .limit(10)
      .select(LIST_PROJECTION)
      .lean<VerificationRow[]>(),
    PortalSecurityAccessLogModel.find({ record_id: row._id }).sort({ created_at: -1 }).limit(20).lean(),
    row.exception_id ? PortalSecurityExceptionModel.findById(row.exception_id).lean() : null,
  ]);
  const coords = openCoordinates(row.location_sealed);
  return {
    ...listRow(row),
    ip: row.ip_sealed ? openField(row.ip_sealed) : null,
    // Spelled out so nothing downstream can present an address lookup as a position.
    ip_location_is_approximate: true,
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    location_error: row.location_error ?? null,
    notice_version: row.notice_version,
    consent: {
      authorized_person: row.consent?.authorized_person === true,
      credentials_not_shared: row.consent?.credentials_not_shared === true,
      policies_acknowledged: row.consent?.policies_acknowledged === true,
      location_consent: row.consent?.location_consent === true,
    },
    user_agent: row.device?.user_agent ?? null,
    duid: row.device?.duid ?? null,
    timezone: row.device?.timezone ?? null,
    language: row.device?.language ?? null,
    platform: row.device?.platform ?? null,
    // The HR portal's answer today, beside the one recorded at the time.
    current_is_employee: current.is_employee,
    current_employee_title: current.title,
    exception: exception
      ? {
          id: String(exception._id),
          status: exception.status,
          reason: exception.reason,
          decided_by_name: exception.decided_by_name ?? null,
          decided_at: iso(exception.decided_at),
          decision_note: exception.decision_note ?? null,
        }
      : null,
    related: related.map(listRow),
    access_history: accessed.map((entry) => ({
      id: String(entry._id),
      actor_name: entry.actor_name,
      action: entry.action,
      created_at: iso(entry.created_at) as string,
    })),
  };
}

const exceptionRow = (row: {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  user_name: string;
  portal_key: string;
  reason: string;
  location_error?: string | null;
  status: string;
  decided_by_name?: string | null;
  decided_at?: Date | null;
  decision_note?: string | null;
  expires_at?: Date | null;
  used_at?: Date | null;
  created_at: Date;
}) => ({
  id: String(row._id),
  user_id: String(row.user_id),
  user_name: row.user_name,
  portal_key: row.portal_key,
  reason: row.reason,
  location_error: row.location_error ?? null,
  status: row.status,
  decided_by_name: row.decided_by_name ?? null,
  decided_at: iso(row.decided_at),
  decision_note: row.decision_note ?? null,
  expires_at: iso(row.expires_at),
  used_at: iso(row.used_at),
  created_at: iso(row.created_at) as string,
});

async function exceptionsTable(ctx: GraphQLContext, query?: TableQueryInput | null) {
  requireRole(ctx, PORTAL_SECURITY_REVIEW_ROLES);
  const { docs, total, page, page_size } = await runTableQuery<Parameters<typeof exceptionRow>[0]>(
    PortalSecurityExceptionModel,
    {},
    query,
    EXCEPTION_TABLE_CONFIG
  );
  return { rows: docs.map(exceptionRow), total, page, page_size };
}

/** Approve or reject an alternative-verification request. Decided once. */
async function decideException(ctx: GraphQLContext, rawInput: unknown) {
  const actor = requireRole(ctx, PORTAL_SECURITY_REVIEW_ROLES);
  const input = await validate(exceptionDecisionSchema, rawInput);
  const request = await PortalSecurityExceptionModel.findById(input.id);
  if (!request) throw new GraphQLError('Request not found', { extensions: { code: 'NOT_FOUND' } });
  // Nobody approves their own request: the point is a second pair of eyes.
  if (String(request.user_id) === actor.id) {
    throw new GraphQLError('You cannot decide your own request', { extensions: { code: 'FORBIDDEN' } });
  }
  const decidedByName = await reviewerName(actor);
  const decided = await PortalSecurityExceptionModel.findOneAndUpdate(
    // Only a request still waiting can be decided — a second click, or two
    // reviewers at once, changes nothing the first one did.
    { _id: request._id, status: 'PENDING' },
    {
      $set: {
        status: input.approve ? 'APPROVED' : 'REJECTED',
        decided_by: new Types.ObjectId(actor.id),
        decided_by_name: decidedByName,
        decided_at: new Date(),
        decision_note: input.note,
        expires_at: input.approve ? new Date(Date.now() + EXCEPTION_VALID_HOURS * 3_600_000) : null,
      },
    },
    { new: true }
  );
  if (!decided) {
    throw new GraphQLError('This request has already been decided', { extensions: { code: 'CONFLICT' } });
  }
  logs.server.info('portal-security', 'exception-decided', {
    user_id: actor.id,
    request_id: String(decided._id),
    approved: input.approve,
    msg: 'alternative verification decided',
  });
  return exceptionRow(decided);
}

export const portalSecurityReview = { logsTable, logDetail, exceptionsTable, decideException };
