import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PaymentEventModel } from './paymentEvent.model';
import type { ActorSnapshot, PaymentEventSource, PaymentEventType } from './failedPayment.types';

/**
 * Writing a payment's audit trail.
 *
 * Every write is BEST-EFFORT: the trail describes the payment, it is never part
 * of it, so a failed insert is logged and the payment flow carries on. A repeat
 * of a fact that carries a `dedupe_key` (a client retry, a webhook redelivery)
 * is absorbed by the unique index and is not an error.
 */

type EventValue = string | number | boolean | null;

/** Keys that never reach the trail, whatever the caller passes. */
const FORBIDDEN_KEY = /card|cvv|vpa|email|contact|phone|token|secret|signature|password|otp|bank_account/i;
const MAX_TEXT = 500;
const MAX_KEYS = 30;

/** Only flat, short, non-sensitive values survive. Pure, for tests. */
export function sanitizeEventData(data: Record<string, unknown> | undefined): Record<string, EventValue> {
  const out: Record<string, EventValue> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    if (FORBIDDEN_KEY.test(key) || value === undefined) continue;
    if (value === null || typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, MAX_TEXT);
    else if (value instanceof Date) out[key] = value.toISOString();
    else if (value instanceof Types.ObjectId) out[key] = String(value);
  }
  return out;
}

export interface PaymentEventInput {
  paymentDocId: unknown;
  caseId?: unknown;
  type: PaymentEventType;
  source: PaymentEventSource;
  actor?: ActorSnapshot | null;
  data?: Record<string, unknown>;
  dedupeKey?: string | null;
}

const isDuplicateKey = (error: unknown): boolean => (error as { code?: number } | null)?.code === 11000;

const toObjectId = (value: unknown): Types.ObjectId | null => {
  const id = value ? String(value) : '';
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
};

/** Append one event. Never throws; answers whether a NEW row was written. */
export async function recordPaymentEvent(input: PaymentEventInput): Promise<boolean> {
  const paymentDocId = toObjectId(input.paymentDocId);
  if (!paymentDocId) return false;
  try {
    await PaymentEventModel.create({
      payment_doc_id: paymentDocId,
      case_id: toObjectId(input.caseId),
      type: input.type,
      source: input.source,
      actor: input.actor ?? null,
      data: sanitizeEventData(input.data),
      dedupe_key: input.dedupeKey ?? null,
    });
    return true;
  } catch (error) {
    if (isDuplicateKey(error)) return false;
    logs.server.warn('failedPayment', 'recordPaymentEvent', { error, type: input.type, payment_doc_id: String(paymentDocId) });
    return false;
  }
}

/** Whether a deduped fact was already recorded — how a retried request finds its first answer. */
export async function paymentEventExists(dedupeKey: string): Promise<boolean> {
  return !!(await PaymentEventModel.exists({ dedupe_key: dedupeKey }));
}

/** Stamp a case id onto a payment's earlier events once its case exists. Best-effort. */
export async function attachEventsToCase(paymentDocId: unknown, caseId: unknown): Promise<void> {
  const payment = toObjectId(paymentDocId);
  const kase = toObjectId(caseId);
  if (!payment || !kase) return;
  await PaymentEventModel.updateMany({ payment_doc_id: payment, case_id: null }, { $set: { case_id: kase } }).catch(
    (error: unknown) => logs.server.warn('failedPayment', 'attachEventsToCase', { error, payment_doc_id: String(payment) })
  );
}

/** One payment's events, oldest first, bounded. */
export function listPaymentEvents(paymentDocId: unknown, limit = 500) {
  const payment = toObjectId(paymentDocId);
  if (!payment) return Promise.resolve([]);
  return PaymentEventModel.find({ payment_doc_id: payment }).sort({ created_at: 1, _id: 1 }).limit(limit).lean();
}
