import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { inRange } from '../entity/window';

/**
 * Business outcomes, read from the records that ARE the outcome — never from a
 * click. A tap on "Pay" is a client event; a payment is a Payment row with a
 * `paid_at`. Funnels and the user timeline show both, labelled apart.
 */
export type ProductOutcome =
  | 'SIGNED_UP'
  | 'POD_CREATED'
  | 'POD_JOINED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED';

export const PRODUCT_OUTCOMES: readonly ProductOutcome[] = [
  'SIGNED_UP',
  'POD_CREATED',
  'POD_JOINED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'PAYMENT_REFUNDED',
];

export interface OutcomeOccurrence {
  outcome: ProductOutcome;
  user: string;
  at: Date;
  /** The record behind it — a pod, a payment — for the timeline's id. */
  ref: string;
}

type Range = { from: Date; to: Date };
type Ids = readonly Types.ObjectId[] | null;

const within = (ids: Ids, field: string) => (ids ? { [field]: { $in: ids } } : {});
const occurrence = (outcome: ProductOutcome, user: unknown, at: Date, ref: unknown): OutcomeOccurrence => ({
  outcome,
  user: String(user),
  at,
  ref: String(ref),
});

async function signedUp({ from, to }: Range, ids: Ids) {
  const rows = await UserModel.find({ 'metadata.created_at': inRange(from, to), ...within(ids, '_id') })
    .select('metadata.created_at')
    .lean<Array<{ _id: Types.ObjectId; metadata: { created_at: Date } }>>();
  return rows.map((row) => occurrence('SIGNED_UP', row._id, row.metadata.created_at, row._id));
}

async function podsJoined({ from, to }: Range, ids: Ids) {
  const rows = await PodMemberModel.find({ joined_at: inRange(from, to), ...within(ids, 'user_id') })
    .select('user_id joined_at pod_id')
    .lean<Array<{ user_id: Types.ObjectId; joined_at: Date; pod_id: Types.ObjectId }>>();
  return rows.map((row) => occurrence('POD_JOINED', row.user_id, row.joined_at, row.pod_id));
}

async function podsCreated({ from, to }: Range, ids: Ids) {
  const rows = await PodModel.find({ created_at: inRange(from, to), ...within(ids, 'pod_hosts_id') })
    .select('pod_hosts_id created_at')
    .lean<Array<{ _id: Types.ObjectId; pod_hosts_id: Types.ObjectId[]; created_at: Date }>>();
  const wanted = ids ? new Set(ids.map(String)) : null;
  return rows.flatMap((row) =>
    (row.pod_hosts_id ?? [])
      .filter((host) => !wanted || wanted.has(String(host)))
      .map((host) => occurrence('POD_CREATED', host, row.created_at, row._id))
  );
}

interface PaymentRow {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  paid_at: Date | null;
  created_at: Date;
  metadata?: { refunded_at?: string | Date };
}

/** Payments by the moment that makes them the outcome: paid, failed (created) or refunded. */
async function payments(outcome: ProductOutcome, { from, to }: Range, ids: Ids) {
  const byOutcome: Record<string, { match: Record<string, unknown>; at: (row: PaymentRow) => Date | null }> = {
    PAYMENT_SUCCEEDED: { match: { paid_at: inRange(from, to) }, at: (row) => row.paid_at },
    PAYMENT_FAILED: { match: { status: 'FAILED', created_at: inRange(from, to) }, at: (row) => row.created_at },
    PAYMENT_REFUNDED: {
      match: { 'metadata.refunded_at': inRange(from, to) },
      at: (row) => (row.metadata?.refunded_at ? new Date(row.metadata.refunded_at) : null),
    },
  };
  const spec = byOutcome[outcome];
  const rows = await PaymentModel.find({ ...spec.match, user_id: ids ? { $in: ids } : { $ne: null } })
    .select('user_id paid_at created_at metadata.refunded_at')
    .lean<PaymentRow[]>();
  return rows.flatMap((row) => {
    const at = spec.at(row);
    return at ? [occurrence(outcome, row.user_id, at, row._id)] : [];
  });
}

/** Every occurrence of one outcome in the range — for everyone, or for the given members only. */
export function outcomeOccurrences(outcome: ProductOutcome, range: Range, ids: Ids = null): Promise<OutcomeOccurrence[]> {
  if (outcome === 'SIGNED_UP') return signedUp(range, ids);
  if (outcome === 'POD_JOINED') return podsJoined(range, ids);
  if (outcome === 'POD_CREATED') return podsCreated(range, ids);
  return payments(outcome, range, ids);
}

/** One member's outcomes of every kind in the range, newest first. */
export async function memberOutcomes(userId: Types.ObjectId, range: Range): Promise<OutcomeOccurrence[]> {
  const all = await Promise.all(PRODUCT_OUTCOMES.map((outcome) => outcomeOccurrences(outcome, range, [userId])));
  return all.flat().sort((a, b) => b.at.getTime() - a.at.getTime());
}
