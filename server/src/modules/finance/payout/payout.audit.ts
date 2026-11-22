import { Types, type ClientSession } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { PayoutEventModel, type PayoutAction, type PayoutSubjectKind } from './payout.model';

/**
 * The money-out audit trail: one append-only row per action on a withdrawal or a
 * Send Money transfer — who, what, how much, why, and what the bank said.
 *
 * Rows can only be added (the model refuses every update and delete), and each
 * carries a `dedupe_key`, so a redelivered webhook or a retried request writes
 * nothing twice. The actor's NAME is stored with the id: the log must keep
 * reading the same after a Finance Manager is renamed or removed.
 */

/** Who did it. `id` is null for the system (a Razorpay webhook). */
export interface PayoutActor {
  id: string | null;
  name: string;
  role: string;
}

export const SYSTEM_ACTOR: PayoutActor = { id: null, name: 'Razorpay', role: 'SYSTEM' };

/** The actor's role as the log shows it: the most specific Finance role they hold. */
const ROLE_ORDER = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'CITY_ADMIN'];

export async function actorFor(user: { id: string; roles: string[] }): Promise<PayoutActor> {
  const row = Types.ObjectId.isValid(user.id)
    ? await UserModel.findById(user.id).select('profile.first_name profile.last_name auth.email').lean<{
        profile?: { first_name?: string; last_name?: string };
        auth?: { email?: string };
      }>()
    : null;
  const name = [row?.profile?.first_name, row?.profile?.last_name].filter(Boolean).join(' ').trim();
  return {
    id: user.id,
    name: name || row?.auth?.email || 'Finance',
    role: ROLE_ORDER.find((role) => user.roles.includes(role)) ?? user.roles[0] ?? '',
  };
}

export interface PayoutEventInput {
  kind: PayoutSubjectKind;
  subjectId: string;
  action: PayoutAction;
  userId: string | Types.ObjectId;
  userName: string;
  requestedAmount: number;
  approvedAmount?: number | null;
  reason?: string;
  actor: PayoutActor;
  paymentStatus?: string;
  razorpayPayoutId?: string;
  utr?: string;
  /** Unique per logical event; a duplicate is silently ignored. */
  dedupeKey: string;
}

const isDuplicate = (error: unknown) => (error as { code?: number } | null)?.code === 11000;

/** Append one audit row. A second call with the same dedupe key is a no-op. */
export async function recordPayoutEvent(input: PayoutEventInput, session?: ClientSession): Promise<void> {
  try {
    await PayoutEventModel.create(
      [
        {
          subject_kind: input.kind,
          subject_id: input.subjectId,
          action: input.action,
          user_id: new Types.ObjectId(String(input.userId)),
          user_name: input.userName.slice(0, 160),
          requested_amount: input.requestedAmount,
          approved_amount: input.approvedAmount ?? null,
          reason: (input.reason ?? '').slice(0, 500),
          actor_id: input.actor.id ? new Types.ObjectId(input.actor.id) : null,
          actor_name: input.actor.name,
          actor_role: input.actor.role,
          payment_status: input.paymentStatus ?? '',
          razorpay_payout_id: input.razorpayPayoutId ?? '',
          utr: input.utr ?? '',
          dedupe_key: input.dedupeKey,
        },
      ],
      { session }
    );
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
}
