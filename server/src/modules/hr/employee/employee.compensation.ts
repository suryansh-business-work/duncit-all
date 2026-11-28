/**
 * Effective-dated pay. Totals are derived here from the lines — a client never
 * sends a CTC — and a revision is never edited: a correction is a new revision,
 * and only a revision that has not started yet may be withdrawn.
 */
import type { ClientSession, Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrCompensationModel, type IHrCompensation } from './compensation.model';
import type { IHrActor } from './employee.model';
import { actorOf, recordEvent, todayKey } from './employee.events';
import { toCompensation } from './employee.mapper';
import { fail, loadEmployee, objectId } from './employee.store';
import {
  compensationSchema,
  compensationTotals,
  effectiveOn,
  isEditable,
  toPaise,
  toRupees,
  type CompensationInput,
  type PayLine,
} from './employee.rules';

const duplicateDay = (): never =>
  fail('CONFLICT', 'There is already a pay revision starting that day. Pick another effective date.');

export function linesOf(input: CompensationInput): PayLine[] {
  return input.components.map((line) => ({
    label: line.label,
    type: line.type,
    monthly_paise: toPaise(line.monthly_amount),
    target_linked: line.target_linked,
  }));
}

/** Insert one revision (inside the caller's transaction when it has one). */
export async function insertCompensation(
  employeeId: Types.ObjectId,
  input: CompensationInput,
  actor: IHrActor,
  session?: ClientSession
): Promise<IHrCompensation> {
  const components = linesOf(input);
  try {
    const [doc] = await HrCompensationModel.create(
      [
        {
          employee_id: employeeId,
          currency: input.currency,
          effective_from: input.effective_from,
          reason: input.reason,
          note: input.note,
          components,
          totals: compensationTotals(components),
          created_by: actor,
        },
      ],
      { session }
    );
    return doc.toObject() as IHrCompensation;
  } catch (error) {
    if (isDuplicateKeyError(error)) duplicateDay();
    throw error;
  }
}

export async function revisionsOf(employeeId: Types.ObjectId): Promise<IHrCompensation[]> {
  return HrCompensationModel.find({ employee_id: employeeId }).sort({ effective_from: -1 }).lean<IHrCompensation[]>();
}

/** Every revision, newest first, with the one in force today marked. */
export async function compensationView(employeeId: Types.ObjectId) {
  const today = todayKey();
  const revisions = await revisionsOf(employeeId);
  const current = effectiveOn(revisions, today);
  const currentId = current ? String(current._id) : null;
  return {
    revisions: revisions.map((r) => toCompensation(r, today, currentId)),
    current: current ? toCompensation(current, today, currentId) : null,
  };
}

const moneyText = (c: IHrCompensation) => `${c.currency} ${toRupees(c.totals.annual_ctc_paise).toFixed(2)} CTC`;

export const compensationService = {
  async add(employeeId: string, raw: unknown, user: AuthUser) {
    const employee = await loadEmployee(employeeId);
    if (!isEditable(employee.status)) fail('BAD_USER_INPUT', 'This employee has left. Rehire them to change their pay.');
    const input = parseInput(compensationSchema, raw);
    if (input.reason === 'HIRE') fail('BAD_USER_INPUT', 'The hire revision is written by the hire itself. Choose Revision, Promotion or Correction.');
    const actor = await actorOf(user);
    const previous = effectiveOn(await revisionsOf(employee._id), input.effective_from);
    const doc = await insertCompensation(employee._id, input, actor);
    await recordEvent({
      employeeId: employee._id,
      kind: 'COMPENSATION_ADDED',
      effectiveDate: input.effective_from,
      actor,
      note: input.note,
      changes: [{ field: 'compensation', from: previous ? moneyText(previous) : null, to: moneyText(doc) }],
    });
    logs.server.info('employee.compensation', 'added', { employeeId, userId: user.id, effective_from: input.effective_from });
    const today = todayKey();
    const current = effectiveOn(await revisionsOf(employee._id), today);
    return toCompensation(doc, today, current ? String(current._id) : null);
  },

  /** Withdraw a revision that has not taken effect yet. Anything already in force is history. */
  async remove(compensationId: string, user: AuthUser) {
    const doc = await HrCompensationModel.findById(objectId(compensationId, 'pay revision')).lean<IHrCompensation>();
    if (!doc) fail('NOT_FOUND', 'Pay revision not found');
    if (doc.effective_from <= todayKey()) fail('BAD_USER_INPUT', 'This revision is already in force. Add a correction instead.');
    const removed = await HrCompensationModel.deleteOne({ _id: doc._id, effective_from: { $gt: todayKey() } });
    if (removed.deletedCount !== 1) fail('CONFLICT', 'This revision could not be withdrawn. Reload and try again.');
    await recordEvent({
      employeeId: doc.employee_id,
      kind: 'COMPENSATION_REMOVED',
      effectiveDate: doc.effective_from,
      actor: await actorOf(user),
      changes: [{ field: 'compensation', from: moneyText(doc), to: null }],
    });
    logs.server.info('employee.compensation', 'removed', { compensationId, userId: user.id });
    return true;
  },
};
