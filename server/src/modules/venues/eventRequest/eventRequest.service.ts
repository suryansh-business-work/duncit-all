import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import { hasRole } from '@middleware/rbac';
import { UserModel } from '@modules/access/user/user.model';
import { nameOf } from '@modules/pods/podHelp/podHelp.service';
import { consoleEditors } from '@modules/portals/console-access';
import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { trimTrailingSlash } from '@utils/url';
import {
  EVENT_REQUEST_NOTE_MAX,
  EventRequestModel,
  type EventRequestStatus,
  type EventRequestTarget,
  type IEventRequest,
} from './eventRequest.model';
import {
  assertTargetType,
  fail,
  loadTarget,
  NAME_FIELDS,
  ownedTargetIds,
  ownsTarget,
  parseObjectId,
  type EventRequestTargetFacts,
} from './eventRequest.target';

const LOG = 'event-request';

export interface RequestEventInput {
  target_type: string;
  target_id: string;
  note?: string | null;
}

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['target_name', 'requester_name', 'note'],
  sortFields: {
    target_name: 'target_name',
    requester_name: 'requester_name',
    status: 'status',
    created_at: 'created_at',
    closed_at: 'closed_at',
  },
  filterFields: {
    target_name: { type: 'string' },
    requester_name: { type: 'string' },
    status: { type: 'enum' },
    created_at: { type: 'date' },
  },
  // Newest first: the open asks are the ones a host or venue can still answer.
  defaultSort: { created_at: -1 },
};

const iso = (value: Date | null | undefined) => value?.toISOString?.() ?? null;

const toPub = (doc: IEventRequest) => ({
  id: String(doc._id),
  target_type: doc.target_type,
  target_id: String(doc.target_id),
  target_name: doc.target_name,
  requester_id: String(doc.requester_id),
  requester_name: doc.requester_name,
  note: doc.note ?? '',
  status: doc.status,
  fulfilled_pod_id: doc.fulfilled_pod_id ? String(doc.fulfilled_pod_id) : null,
  closed_at: iso(doc.closed_at),
  created_at: iso(doc.created_at) ?? '',
  response_note: doc.response_note ?? '',
  responded_at: iso(doc.responded_at),
  offer: doc.offer
    ? {
        start_at: iso(doc.offer.start_at) ?? '',
        end_at: iso(doc.offer.end_at) ?? '',
        pax: doc.offer.pax ?? 0,
        quote: doc.offer.quote ? { ...doc.offer.quote, confirmed_at: iso(doc.offer.quote.confirmed_at) } : null,
      }
    : null,
});

export const eventRequestToPub = toPub;

/** What the member's empty state shows: whether their ask is already in, and
 * whether this is their own venue / host page (nothing to ask then). */
const toState = (doc: Pick<IEventRequest, '_id' | 'created_at'> | null, isOwner = false) => ({
  is_owner: isOwner,
  requested: Boolean(doc),
  request_id: doc ? String(doc._id) : null,
  requested_at: doc ? iso(doc.created_at) : null,
});

const openRequest = (type: EventRequestTarget, targetId: Types.ObjectId, requesterId: string) =>
  EventRequestModel.findOne({
    target_type: type,
    target_id: targetId,
    requester_id: new Types.ObjectId(requesterId),
    status: 'OPEN',
  })
    .select('_id created_at')
    .lean<Pick<IEventRequest, '_id' | 'created_at'>>();

/** Best-effort in-app note to whoever answers the request. Never fails the ask. */
async function tellOwner(type: EventRequestTarget, target: EventRequestTargetFacts, requesterName: string) {
  try {
    const { partnersUrl } = await getUrlConfigs();
    const path = type === 'VENUE' ? '/venues/event-requests' : '/host/event-requests';
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({
      title: 'New event request',
      body:
        type === 'VENUE'
          ? `${requesterName} would like an event at ${target.name}.`
          : `${requesterName} would like you to host an event.`,
      image_url: null,
      link_url: `${trimTrailingSlash(partnersUrl)}${path}`,
      scope: 'USER',
      target_user_ids: [target.ownerId],
    });
  } catch (error) {
    logs.server.warn(LOG, 'tellOwner', { error, target_type: type, target_id: target.id.toHexString() });
  }
}

const countsOf = async (match: Record<string, unknown>) => {
  const rows: { _id: EventRequestStatus; n: number }[] = await EventRequestModel.aggregate([
    { $match: match },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const by = (status: EventRequestStatus) => rows.find((row) => row._id === status)?.n ?? 0;
  const open = by('OPEN');
  const accepted = by('ACCEPTED');
  const countered = by('COUNTERED');
  const rejected = by('REJECTED');
  const fulfilled = by('FULFILLED');
  const dismissed = by('DISMISSED');
  return {
    open,
    accepted,
    countered,
    rejected,
    fulfilled,
    dismissed,
    total: open + accepted + countered + rejected + fulfilled + dismissed,
  };
};

const page = async (base: Record<string, unknown>, input?: TableQueryInput | null) => {
  const { docs, total, page: current, page_size } = await runTableQuery<IEventRequest>(
    EventRequestModel,
    base,
    input,
    TABLE_CONFIG
  );
  return { rows: docs.map(toPub), total, page: current, page_size };
};

const ownerScope = async (type: EventRequestTarget, userId: string) => ({
  target_type: type,
  target_id: { $in: await ownedTargetIds(type, userId) },
});

const consoleEntity = (type: EventRequestTarget) => (type === 'VENUE' ? 'VENUE' : 'HOST');

export const eventRequestService = {
  /** The signed-in member's open ask for this host/venue, if any. */
  async myState(callerId: string, targetType: string, targetId: string) {
    const type = assertTargetType(targetType);
    const id = parseObjectId(targetId, 'target id');
    const [doc, isOwner] = await Promise.all([openRequest(type, id, callerId), ownsTarget(type, id, callerId)]);
    return toState(doc, isOwner);
  },

  /**
   * Ask a host or venue for an event. Idempotent: a member with an open ask
   * gets that ask back, and the partial unique index settles two taps racing.
   */
  async request(callerId: string, input: RequestEventInput) {
    const type = assertTargetType(input.target_type);
    const targetId = parseObjectId(input.target_id, 'target id');
    const note = (input.note ?? '').trim();
    if (note.length > EVENT_REQUEST_NOTE_MAX) throw fail('BAD_USER_INPUT', 'Note is too long');

    const existing = await openRequest(type, targetId, callerId);
    if (existing) return toState(existing);

    const target = await loadTarget(type, targetId);
    if (!target) throw fail('NOT_FOUND', 'Not found');
    if (target.ownerId === callerId) throw fail('BAD_USER_INPUT', 'You cannot request an event from yourself');

    const requester = await UserModel.findById(callerId).select(NAME_FIELDS).lean();
    const requesterName = nameOf(requester) || 'A member';
    let created: IEventRequest;
    try {
      created = await EventRequestModel.create({
        target_type: type,
        target_id: targetId,
        target_name: target.name,
        requester_id: new Types.ObjectId(callerId),
        requester_name: requesterName,
        note,
      });
    } catch (error) {
      // A second tap won the race: its row is the member's one open request.
      if (isDuplicateKeyError(error)) return toState(await openRequest(type, targetId, callerId));
      throw error;
    }
    logs.server.info(LOG, 'request', { target_type: type, target_id: targetId.toHexString() });
    await tellOwner(type, target, requesterName);
    return toState(created);
  },

  /** Requests addressed to the caller — the venues they own, or themself as host. */
  async ownerTable(callerId: string, targetType: string, input?: TableQueryInput | null) {
    return page(await ownerScope(assertTargetType(targetType), callerId), input);
  },

  async ownerCounts(callerId: string, targetType: string) {
    return countsOf(await ownerScope(assertTargetType(targetType), callerId));
  },

  /** Every request of one kind — the Venues / Hosts console. The resolver checks the role. */
  async consoleTable(targetType: string, input?: TableQueryInput | null) {
    return page({ target_type: assertTargetType(targetType) }, input);
  },

  async consoleCounts(targetType: string) {
    return countsOf({ target_type: assertTargetType(targetType) });
  },

  /**
   * Close an open request — by whoever answers for its target, or by the
   * console's editors. Only OPEN moves; repeating the same close is a no-op.
   */
  async updateStatus(user: AuthUser, id: string, status: string) {
    if (status !== 'FULFILLED' && status !== 'DISMISSED') throw fail('BAD_USER_INPUT', 'Invalid status');
    const doc = await EventRequestModel.findById(parseObjectId(id, 'request id'));
    if (!doc) throw fail('NOT_FOUND', 'Request not found');
    const staff = hasRole(user, consoleEditors(consoleEntity(doc.target_type)));
    if (!staff && !(await ownsTarget(doc.target_type, doc.target_id, user.id))) {
      throw fail('FORBIDDEN', 'Access Denied');
    }
    if (doc.status === status) return toPub(doc);
    const updated = await EventRequestModel.findOneAndUpdate(
      { _id: doc._id, status: 'OPEN' },
      { $set: { status, closed_at: new Date(), closed_by_id: new Types.ObjectId(user.id) } },
      { new: true }
    );
    if (!updated) throw fail('CONFLICT', 'This request is already closed');
    logs.server.info(LOG, 'updateStatus', { id, status, by_staff: staff });
    return toPub(updated);
  },
};
