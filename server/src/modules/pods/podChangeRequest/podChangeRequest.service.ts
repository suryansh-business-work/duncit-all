import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { accountHealthService } from '@modules/access/accountHealth/accountHealth.service';
import {
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import {
  PodChangeRequestModel,
  type IPodChangeRequest,
  type PodChangeRole,
} from './podChangeRequest.model';
import {
  appendEvent,
  assertRoleOnPod,
  changeRequestFail,
  contactName,
  loadLivePod,
  podAttendeeCount,
} from './podChangeRequest.common';
import { candidatesForRequest, slotsForVenue } from './podChangeRequest.candidates';
import { applyReplacement, assertOfferableSlot, logAssignFailure } from './podChangeRequest.assign';
import { hydrateRequests } from './podChangeRequest.rows';
import {
  notifyAdmins,
  notifyChangeOffer,
  notifyOfferPassed,
  notifyRequestFiled,
  notifyRequestResolved,
  roleWord,
} from './podChangeRequest.notify';

/**
 * Request Change — a partner asking Duncit to hand their place on ONE pod to
 * somebody else, and everything that happens after they ask.
 *
 * The whole flow in one place, because it is one decision passed between three
 * people: the partner files it (and pays for it in Account Health), an admin
 * either cancels the pod or offers the place to a matching partner, and that
 * partner approves it or passes.
 *
 * Two rules run through all of it:
 *  - a partner is charged ONCE. The unique partial index on
 *    `{pod_id, role} where is_open` is what makes a second tap impossible
 *    rather than merely discouraged, and the E11000 it raises is translated
 *    into the sentence the studio shows.
 *  - a Pass never touches the pod. The pod keeps the partner it has until a
 *    replacement actually says yes, so it can never end up live with nobody
 *    running it, at nobody's venue, or in a club with no admin.
 */

/** DUNCIT TABLE CONTRACT v1 allowlists. A column the client marks sortable or
 * filterable does nothing unless its field is named here. */
const ADMIN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['change_request_no', 'reason'],
  sortFields: {
    change_request_no: 'change_request_no',
    status: 'status',
    resolution: 'resolution',
    health_penalty: 'health_penalty',
    created_at: 'created_at',
    resolved_at: 'resolved_at',
  },
  filterFields: {
    status: { type: 'enum' },
    resolution: { type: 'enum' },
    role: { type: 'enum' },
    change_request_no: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** The one place a live request is recognised. */
const LIVE_STATUSES = ['OPEN', 'OFFERED'];

const DUPLICATE_MESSAGE =
  'You already have an open change request for this pod. Duncit is working on it.';

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number })?.code === 11000;
}

async function loadRequest(id: string): Promise<IPodChangeRequest> {
  if (!Types.ObjectId.isValid(id)) changeRequestFail('BAD_USER_INPUT', 'Invalid request id');
  const doc = await PodChangeRequestModel.findById(id);
  if (!doc) changeRequestFail('NOT_FOUND', 'Change request not found');
  return doc!;
}

async function actorName(userId: string | null): Promise<string> {
  if (!userId || !Types.ObjectId.isValid(userId)) return 'Duncit';
  const user = await UserModel.findById(userId)
    .select('profile.first_name profile.last_name')
    .lean();
  return contactName(user) || 'Duncit';
}

/** OPEN|OFFERED keep `is_open` true; everything else clears it, which is what
 * releases the unique index so the partner may ask again later. */
function setStatus(doc: IPodChangeRequest, status: IPodChangeRequest['status']) {
  doc.status = status;
  doc.is_open = LIVE_STATUSES.includes(status);
}

/**
 * Where the health penalty is charged: at FILING, not at resolution.
 *
 * The deduction is the price of asking. Charging it only on a successful
 * replacement would make an unanswerable request free, and charging it at
 * resolution would mean a partner cannot see what their ask cost until days
 * later. `applySystemPenalty` takes a POSITIVE magnitude and writes the
 * negative delta itself.
 */
async function chargeForRequest(
  role: PodChangeRole,
  pod: any,
  userId: string
): Promise<number> {
  const penalties = await settingsService.getChangeRequestHealthPenalties();
  const points = penalties[role] ?? 0;
  if (points <= 0) return 0;
  // A venue's health hangs off the VENUE, not its owner — the only role that
  // does. A host and a club admin are both scored as the person.
  const subject =
    role === 'VENUE'
      ? { subject_type: 'VENUE' as const, subject_id: String(pod.venue_id) }
      : { subject_type: 'USER' as const, subject_id: userId };
  await accountHealthService.applySystemPenalty({
    ...subject,
    points,
    remark: `Requested a change of ${roleWord(role)} for the pod "${pod.pod_title}"`,
  });
  return points;
}

export const podChangeRequestService = {
  /** What a partner is about to be charged, so the confirm dialog can say it. */
  async penalties() {
    return settingsService.getChangeRequestHealthPenalties();
  },

  /**
   * File one. Authorised on the pod itself: only the venue the pod is booked
   * at, a host of the pod, or an admin of the pod's club may ask.
   */
  async file(podDocId: string, userId: string, role: PodChangeRole, reason: string) {
    const pod = await loadLivePod(podDocId);
    if (pod.deleted_at) {
      changeRequestFail('BAD_REQUEST', 'This pod is already cancelled');
    }
    await assertRoleOnPod(pod, role, userId);

    const trimmed = String(reason ?? '').trim().slice(0, 500);
    const attendees = podAttendeeCount(pod);

    let doc: IPodChangeRequest;
    try {
      doc = new PodChangeRequestModel({
        pod_id: pod._id,
        role,
        requested_by: new Types.ObjectId(userId),
        from_venue_id: role === 'VENUE' ? pod.venue_id ?? null : null,
        from_venue_slot_id: role === 'VENUE' ? pod.venue_slot_id ?? null : null,
        from_club_id: role === 'CLUB_ADMIN' ? pod.club_id ?? null : null,
        reason: trimmed,
        attendees_at_request: attendees,
        is_open: true,
      });
      appendEvent(doc, 'FILED', userId, await actorName(userId), trimmed);
      await doc.save();
    } catch (error) {
      if (isDuplicateKey(error)) changeRequestFail('CONFLICT', DUPLICATE_MESSAGE);
      throw error;
    }

    // The charge lands AFTER the row exists, so a lost duplicate race can never
    // deduct points for a request that was never filed.
    //
    // And it can never take the filing down with it: a venue whose court just
    // flooded must be able to tell Duncit even if the health ledger is having a
    // bad day. A failure leaves the request standing with health_penalty 0 and
    // is loud in the logs rather than silent — the alternative is an orphaned
    // OPEN row holding the per-pod lock that the partner cannot retry past.
    try {
      const points = await chargeForRequest(role, pod, userId);
      if (points > 0) {
        doc.health_penalty = points;
        await doc.save();
      }
    } catch (error) {
      logs.server.error('podChangeRequest', 'chargeForRequest', {
        error,
        request_id: String(doc._id),
        role,
      });
    }

    await notifyRequestFiled(doc, pod.pod_title);
    await notifyAdmins(
      'Change Request filed',
      `${doc.change_request_no}: the ${roleWord(role)} of "${pod.pod_title}" asked to be changed. ${attendees} attendee(s).`
    );
    const [row] = await hydrateRequests([doc]);
    return row;
  },

  /** The requester pulling it back — only before anybody has been offered it. */
  async withdraw(requestId: string, userId: string) {
    const doc = await loadRequest(requestId);
    if (String(doc.requested_by) !== userId) {
      changeRequestFail('FORBIDDEN', 'This is not your change request');
    }
    if (doc.status !== 'OPEN') {
      changeRequestFail(
        'BAD_REQUEST',
        'Duncit has already offered this pod to someone. Contact support to stop it.'
      );
    }
    setStatus(doc, 'WITHDRAWN');
    doc.resolved_at = new Date();
    appendEvent(doc, 'WITHDRAWN', userId, await actorName(userId));
    await doc.save();
    const [row] = await hydrateRequests([doc]);
    return row;
  },

  /**
   * The partner studios' Change Requests section: what I have asked for, and
   * what is waiting on me.
   *
   * Both lists in one answer because they are one screen, and a second query
   * would be a second place for "is this mine" to be decided.
   */
  async board(userId: string) {
    const actor = new Types.ObjectId(userId);
    const [mine, incoming] = await Promise.all([
      PodChangeRequestModel.find({ requested_by: actor }).sort({ created_at: -1 }).limit(50),
      PodChangeRequestModel.find({
        'offer.user_id': actor,
        'offer.status': 'PENDING',
        status: 'OFFERED',
      })
        .sort({ created_at: -1 })
        .limit(50),
    ]);
    const [mineRows, incomingRows, penalties] = await Promise.all([
      hydrateRequests(mine),
      hydrateRequests(incoming),
      settingsService.getChangeRequestHealthPenalties(),
    ]);
    return {
      mine: mineRows,
      incoming: incomingRows,
      venue_penalty: penalties.VENUE,
      host_penalty: penalties.HOST,
      club_admin_penalty: penalties.CLUB_ADMIN,
    };
  },

  /**
   * Approve or Pass, by the partner the place was offered to.
   *
   * APPROVE swaps them onto the pod and closes the request.
   * PASS closes only the OFFER and puts the request back in the admin queue —
   * the pod keeps the partner it has. See the class comment.
   */
  async respond(
    requestId: string,
    userId: string,
    decision: 'APPROVE' | 'PASS',
    passReason: string
  ) {
    const doc = await loadRequest(requestId);
    if (doc.status !== 'OFFERED' || !doc.offer || doc.offer.status !== 'PENDING') {
      changeRequestFail('BAD_REQUEST', 'This request is no longer waiting on you');
    }
    if (String(doc.offer!.user_id) !== userId) {
      changeRequestFail('FORBIDDEN', 'This offer was not made to you');
    }
    const name = await actorName(userId);

    if (decision === 'PASS') {
      doc.offer!.status = 'PASSED';
      doc.offer!.responded_at = new Date();
      doc.offer!.pass_reason = String(passReason ?? '').trim().slice(0, 500);
      doc.offer_history.push(doc.offer! as any);
      doc.offer = null;
      setStatus(doc, 'OPEN');
      appendEvent(doc, 'PASSED', userId, name, doc.offer_history.at(-1)?.pass_reason ?? '');
      await doc.save();
      const pod = await PodModel.findById(doc.pod_id)
        .setOptions({ includeDeleted: true })
        .select('pod_title')
        .lean();
      await notifyOfferPassed(doc, (pod as any)?.pod_title ?? '', name);
      const [row] = await hydrateRequests([doc]);
      return row;
    }

    const pod = await loadLivePod(String(doc.pod_id));
    if (pod.deleted_at) changeRequestFail('BAD_REQUEST', 'This pod has been cancelled');

    let outcome;
    try {
      outcome = await applyReplacement(doc, pod, doc.offer!);
    } catch (error) {
      logAssignFailure(doc, error);
      throw error;
    }

    doc.offer!.status = 'APPROVED';
    doc.offer!.responded_at = new Date();
    doc.offer_history.push(doc.offer! as any);
    setStatus(doc, 'RESOLVED');
    doc.resolution = 'REPLACED';
    doc.resolved_at = new Date();
    appendEvent(doc, 'APPROVED', userId, name, outcome.summary);
    await doc.save();

    await notifyRequestResolved(doc, pod.pod_title, outcome.summary);
    await notifyAdmins(
      'Change Request resolved',
      `${doc.change_request_no}: ${outcome.summary}`
    );
    const [row] = await hydrateRequests([doc]);
    return row;
  },

  // ---------------------------------------------------------------- admin ---

  /** Admin > Pods > Change Requests, one tab per role. */
  async adminTable(role: PodChangeRole, input?: TableQueryInput | null) {
    const page = await runTableQuery<IPodChangeRequest>(
      PodChangeRequestModel as any,
      { role },
      input,
      ADMIN_TABLE_CONFIG
    );
    return {
      total: page.total,
      page: page.page,
      page_size: page.page_size,
      rows: await hydrateRequests(page.docs),
    };
  },

  /** One request, for the drawer's header. */
  async adminOne(requestId: string) {
    const doc = await loadRequest(requestId);
    const [row] = await hydrateRequests([doc]);
    return row;
  },

  /**
   * Who this request may be offered to.
   *
   * Everybody who has already passed is excluded along with the incumbent —
   * offering the same person the same pod twice is the one row that is never
   * useful, and an admin working a stale list would do it by accident.
   */
  async candidates(requestId: string) {
    const doc = await loadRequest(requestId);
    const pod = await PodModel.findById(doc.pod_id).setOptions({ includeDeleted: true });
    if (!pod) changeRequestFail('NOT_FOUND', 'Pod not found');
    const passed = (doc.offer_history ?? [])
      .filter((offer) => offer.status === 'PASSED')
      .map((offer) => String(offer.user_id));
    const incumbents =
      doc.role === 'HOST'
        ? (pod!.pod_hosts_id ?? []).map(String)
        : [String(doc.requested_by)];
    return candidatesForRequest(pod, doc.role, {
      venueId: doc.from_venue_id ? String(doc.from_venue_id) : null,
      userIds: [...passed, ...incumbents],
    });
  },

  /** Free slots at one candidate venue — the second half of a VENUE offer. */
  async venueSlots(requestId: string, venueId: string) {
    const doc = await loadRequest(requestId);
    if (doc.role !== 'VENUE') changeRequestFail('BAD_REQUEST', 'Only a venue request picks a slot');
    return slotsForVenue(venueId);
  },

  /**
   * Offer the place to one candidate. Nothing on the pod moves yet.
   *
   * The slot is CHECKED here and BOOKED only when the venue approves — see
   * `assertOfferableSlot`. So an admin learns immediately that a slot went
   * while they were choosing, and a venue that ignores the offer never has a
   * slot quietly held off their calendar.
   */
  async offer(
    requestId: string,
    adminId: string,
    input: Readonly<{ user_id: string; venue_id?: string | null; venue_slot_id?: string | null }>
  ) {
    const doc = await loadRequest(requestId);
    if (doc.status !== 'OPEN') {
      changeRequestFail(
        'BAD_REQUEST',
        doc.status === 'OFFERED'
          ? 'This pod is already offered to someone. Wait for their answer first.'
          : 'This request is already closed.'
      );
    }
    if (!Types.ObjectId.isValid(input.user_id)) {
      changeRequestFail('BAD_USER_INPUT', 'Pick somebody to offer it to');
    }
    const pod = await loadLivePod(String(doc.pod_id));
    if (pod.deleted_at) changeRequestFail('BAD_REQUEST', 'This pod has been cancelled');

    let slotStart: Date | null = null;
    if (doc.role === 'VENUE') {
      if (!input.venue_id || !input.venue_slot_id) {
        changeRequestFail('BAD_USER_INPUT', 'Pick a venue and one of its slots');
      }
      const slot = await assertOfferableSlot(String(input.venue_id), String(input.venue_slot_id));
      slotStart = new Date(slot.start_at);
    }

    const candidate = await UserModel.findById(input.user_id)
      .select('profile.first_name profile.last_name auth.email')
      .lean();
    if (!candidate) changeRequestFail('NOT_FOUND', 'That partner no longer has an account');

    doc.offer = {
      user_id: new Types.ObjectId(input.user_id),
      venue_id: input.venue_id ? new Types.ObjectId(input.venue_id) : null,
      venue_slot_id: input.venue_slot_id ? new Types.ObjectId(input.venue_slot_id) : null,
      club_id: doc.role === 'CLUB_ADMIN' ? doc.from_club_id ?? pod.club_id ?? null : null,
      display_name: contactName(candidate) || String((candidate as any)?.auth?.email ?? ''),
      status: 'PENDING',
      offered_by: new Types.ObjectId(adminId),
      offered_at: new Date(),
      responded_at: null,
      pass_reason: '',
    } as any;
    setStatus(doc, 'OFFERED');
    appendEvent(
      doc,
      'OFFERED',
      adminId,
      await actorName(adminId),
      `Offered to ${doc.offer!.display_name}`
    );
    await doc.save();

    await notifyChangeOffer(doc, pod, String(input.user_id), slotStart);
    const [row] = await hydrateRequests([doc]);
    return row;
  },

  /**
   * The other admin action: cancel the pod outright and refund every attendee.
   *
   * `podService.remove` with an ADMIN source IS the platform's cancel-and-refund
   * path — it flips every SUCCESS payment to REFUNDED, mails the audience,
   * releases the venue slot and closes any in-flight backouts. There is no
   * second one, and this must never grow one.
   */
  async cancelPod(requestId: string, adminId: string, reason: string) {
    const doc = await loadRequest(requestId);
    if (!doc.is_open) changeRequestFail('BAD_REQUEST', 'This request is already closed');
    const note = String(reason ?? '').trim().slice(0, 500);
    if (note.length < 5) {
      changeRequestFail('BAD_USER_INPUT', 'Say why the pod is being cancelled');
    }

    const { podService } = await import('@modules/pods/pod/pod.service');
    await podService.remove(String(doc.pod_id), {
      actorUserId: adminId,
      source: 'ADMIN',
      note,
    });

    // `remove` closes every open change request on the pod through
    // `closeAllForPod` below, so re-read rather than saving a stale copy over it.
    const fresh = await loadRequest(requestId);
    const [row] = await hydrateRequests([fresh]);
    return row;
  },

  /**
   * Every live request on a pod that just went away.
   *
   * Called from the ONE cancellation path (`refundAndNotifyCancellation`), in
   * the same place open Backout requests are force-closed, so a cancelled pod
   * can never leave a request sitting in the admin queue for a pod that no
   * longer exists — or leave its unique index held against a future pod.
   */
  async closeAllForPod(podDocId: string, note: string) {
    if (!Types.ObjectId.isValid(podDocId)) return;
    try {
      const docs = await PodChangeRequestModel.find({
        pod_id: new Types.ObjectId(podDocId),
        is_open: true,
      });
      for (const doc of docs) {
        setStatus(doc, 'RESOLVED');
        doc.resolution = 'POD_CANCELLED';
        doc.resolved_at = new Date();
        if (doc.offer) {
          doc.offer.status = 'PASSED';
          doc.offer.responded_at = new Date();
          doc.offer_history.push(doc.offer as any);
          doc.offer = null;
        }
        appendEvent(doc, 'POD_CANCELLED', null, 'Duncit', note);
        await doc.save();
      }
    } catch (error) {
      logs.server.error('podChangeRequest', 'closeAllForPod', { error, pod_id: podDocId });
    }
  },
};
