import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { displayFrom, userDisplayMap } from '@modules/access/user/user.display';
import { alertStaff } from '@services/notify/staffAlert';
import { HealthAdjustmentModel } from './accountHealth.model';
import { resolveSubject } from './accountHealth.service';
import {
  HEALTH_APPEAL_REASONS,
  HealthAppealModel,
  type HealthAppealReason,
  type IHealthAppeal,
} from './healthAppeal.model';
import { notifyHealthAppealDecided } from './healthAppeal.notify';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const MESSAGE_MAX = 1000;
const NOTE_MAX = 1000;

/** MongoServerError 11000 — the unique index on `adjustment_id` refused a second appeal. */
const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

/**
 * Allowlists for the shared table engine (healthAppealsTable — DUNCIT TABLE
 * CONTRACT v1). The handle leads because it is what Legal quotes back.
 */
const APPEAL_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['appeal_no', 'subject_label', 'remark', 'message'],
  sortFields: {
    appeal_no: 'appeal_no',
    subject_type: 'subject_type',
    subject_label: 'subject_label',
    delta: 'delta',
    reason: 'reason',
    status: 'status',
    created_at: 'created_at',
    decided_at: 'decided_at',
  },
  filterFields: {
    appeal_no: { type: 'string' },
    subject_type: { type: 'enum' },
    subject_label: { type: 'string' },
    delta: { type: 'number' },
    reason: { type: 'enum' },
    status: { type: 'enum' },
    created_at: { type: 'date' },
    decided_at: { type: 'date' },
  },
  // Newest first: an appeal is about points the person is missing right now.
  defaultSort: { created_at: -1 },
};

const toPub = (a: IHealthAppeal, names: Awaited<ReturnType<typeof userDisplayMap>>) => ({
  id: String(a._id),
  appeal_no: a.appeal_no ?? '',
  adjustment_id: String(a.adjustment_id),
  subject_type: a.subject_type,
  subject_id: String(a.subject_id),
  subject_label: a.subject_label,
  appellant_name: displayFrom(names, a.appellant_id).name,
  delta: a.delta,
  remark: a.remark,
  adjusted_at: a.adjusted_at.toISOString(),
  reason: a.reason,
  message: a.message,
  status: a.status,
  decision_note: a.decision_note,
  decided_by_name: a.decided_by ? displayFrom(names, a.decided_by).name : '',
  decided_at: a.decided_at ? a.decided_at.toISOString() : null,
  created_at: a.created_at.toISOString(),
});

/** Every person a page of appeals names, in one query. */
async function pubMany(docs: readonly IHealthAppeal[]) {
  const ids = docs.flatMap((d) => [String(d.appellant_id), d.decided_by ? String(d.decided_by) : '']);
  const names = await userDisplayMap(ids);
  return docs.map((d) => toPub(d, names));
}

function cleanNote(value: string | null | undefined): string {
  const note = (value ?? '').trim();
  if (note.length > NOTE_MAX) fail('BAD_USER_INPUT', 'Please keep the note under 1000 characters');
  return note;
}

/**
 * Move a PENDING appeal to its verdict, atomically.
 *
 * The status is the guard: two reviewers deciding the same appeal at once both
 * send the update, and only the one that still finds it PENDING wins.
 */
async function claimDecision(
  id: string,
  handlerId: string,
  status: 'ACCEPTED' | 'DENIED',
  note: string
): Promise<IHealthAppeal> {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid appeal id');
  const claimed = await HealthAppealModel.findOneAndUpdate(
    { _id: id, status: 'PENDING' },
    {
      $set: {
        status,
        decision_note: note,
        decided_by: new Types.ObjectId(handlerId),
        decided_at: new Date(),
      },
    },
    { new: true }
  );
  if (claimed) return claimed;
  const exists = await HealthAppealModel.exists({ _id: id });
  if (!exists) fail('NOT_FOUND', 'Appeal not found');
  fail('CONFLICT', 'This appeal has already been decided');
}

/** Send the decision without holding up the reviewer. It never undoes the verdict. */
function tellAppellant(appeal: IHealthAppeal) {
  notifyHealthAppealDecided(appeal).catch((error: unknown) => {
    logs.server.error('healthAppeal.service', 'notify-failed', { appeal_no: appeal.appeal_no, error });
  });
}

export const healthAppealService = {
  /**
   * File an appeal against one deduction on the caller's own account or venue.
   *
   * Only the person the deduction hit may appeal it, only a deduction (never a
   * bonus), only while it still counts, and only once: a denied appeal is final.
   * Someone else's deduction answers NOT_FOUND rather than FORBIDDEN, so the
   * endpoint cannot be used to probe which ids exist.
   */
  async submit(
    userId: string,
    input: { adjustment_id: string; reason: string; message: string }
  ) {
    if (!Types.ObjectId.isValid(input.adjustment_id)) fail('BAD_USER_INPUT', 'Invalid adjustment id');
    const reason = String(input.reason ?? '').toUpperCase() as HealthAppealReason;
    if (!HEALTH_APPEAL_REASONS.includes(reason)) fail('BAD_USER_INPUT', 'Pick a reason for the appeal');
    const message = String(input.message ?? '').trim();
    if (!message) fail('BAD_USER_INPUT', 'Tell us why in a few words');
    if (message.length > MESSAGE_MAX) fail('BAD_USER_INPUT', 'Please keep it under 1000 characters');

    const adjustment = await HealthAdjustmentModel.findById(input.adjustment_id);
    if (!adjustment || String(adjustment.subject_user_id) !== userId) {
      fail('NOT_FOUND', 'Deduction not found');
    }
    if (adjustment.delta >= 0) fail('BAD_USER_INPUT', 'Only a deduction can be appealed');
    if (adjustment.waived_at) fail('CONFLICT', 'These points have already been given back');

    const { subjectLabel } = await resolveSubject(adjustment.subject_type, String(adjustment.subject_id));
    let appeal: IHealthAppeal;
    try {
      appeal = await HealthAppealModel.create({
        adjustment_id: adjustment._id,
        subject_type: adjustment.subject_type,
        subject_id: adjustment.subject_id,
        subject_label: subjectLabel,
        appellant_id: new Types.ObjectId(userId),
        delta: adjustment.delta,
        remark: adjustment.remark,
        adjusted_at: adjustment.created_at,
        reason,
        message,
      });
    } catch (error) {
      if (isDuplicate(error)) fail('CONFLICT', 'You have already appealed this deduction');
      throw error;
    }
    logs.server.info('healthAppeal.service', 'submit', {
      appeal_no: appeal.appeal_no,
      subject_type: appeal.subject_type,
      reason,
    });
    // The Legal desk is told now, not when someone next opens the queue.
    alertStaff({
      desk: 'LEGAL',
      title: `New account health appeal: ${appeal.appeal_no ?? ''}`,
      lines: [`${appeal.subject_label}: ${appeal.delta} points`, `Reason: ${reason}`],
    }).catch((error: unknown) => {
      logs.server.error('healthAppeal.service', 'staff-alert-failed', { appeal_no: appeal.appeal_no, error });
    });
    return { id: String(appeal._id), appeal_no: appeal.appeal_no ?? '', status: appeal.status };
  },

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IHealthAppeal>(
      HealthAppealModel,
      {},
      input,
      APPEAL_TABLE_CONFIG
    );
    return { rows: await pubMany(docs), total, page, page_size };
  },

  /**
   * Accept: lift the deduction and tell the person their health is back up.
   *
   * The appeal is claimed first, then the deduction waived. If the waive write
   * fails the claim is handed back, so an appeal never reads "accepted" while
   * the points are still missing. A deduction an admin has since deleted needs
   * no waive — the points are already back — and a waive that finds it already
   * waived changes nothing.
   */
  async accept(handlerId: string, id: string, note?: string | null) {
    const appeal = await claimDecision(id, handlerId, 'ACCEPTED', cleanNote(note));
    try {
      await HealthAdjustmentModel.updateOne(
        { _id: appeal.adjustment_id, waived_at: null, delta: { $lt: 0 } },
        { $set: { waived_at: appeal.decided_at, waived_by: appeal.decided_by } }
      );
    } catch (error) {
      await HealthAppealModel.updateOne(
        { _id: appeal._id, status: 'ACCEPTED' },
        { $set: { status: 'PENDING', decision_note: '', decided_by: null, decided_at: null } }
      );
      throw error;
    }
    logs.server.info('healthAppeal.service', 'accept', { appeal_no: appeal.appeal_no });
    tellAppellant(appeal);
    return (await pubMany([appeal]))[0];
  },

  /**
   * Deny: the deduction stays, and the person is told so with Legal's note.
   * The note is required here — "no" without the reason is not an answer.
   */
  async deny(handlerId: string, id: string, note?: string | null) {
    const reason = cleanNote(note);
    if (!reason) fail('BAD_USER_INPUT', 'Say why the appeal is denied');
    const appeal = await claimDecision(id, handlerId, 'DENIED', reason);
    logs.server.info('healthAppeal.service', 'deny', { appeal_no: appeal.appeal_no });
    tellAppellant(appeal);
    return (await pubMany([appeal]))[0];
  },
};
