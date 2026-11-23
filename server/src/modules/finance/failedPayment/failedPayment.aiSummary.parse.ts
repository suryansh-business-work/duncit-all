import type { PaymentSource } from '@modules/finance/payment/payment.source';
import type { IFailedPaymentCase } from './failedPaymentCase.model';
import type { RefundPreview } from './failedPayment.refundPreview';
import { AI_RECOMMENDATIONS, type AiRecommendation } from './failedPayment.types';

/**
 * The two pure halves of the AI refund note: the facts the model is shown, and
 * reading its answer back. Kept apart from the service so both are tested
 * without OpenAI.
 *
 * The facts carry NO personal data: no name, email, phone, address or
 * evidence file, and no host-written text such as the pod title. Only what
 * Razorpay, the checkout and Finance recorded about the money.
 */

export interface BookingFacts {
  exists: boolean;
  payment_status: string;
  finalize_state: string;
  needs_refund: boolean;
}

export interface SummaryInput {
  kase: Pick<
    IFailedPaymentCase,
    | 'amount'
    | 'currency_symbol'
    | 'sources'
    | 'latest_error'
    | 'attempts'
    | 'retry_shown'
    | 'claims'
    | 'verification'
    | 'review'
    | 'refund'
    | 'resolution'
    | 'created_at'
  >;
  source: PaymentSource | null;
  booking: BookingFacts | null;
  preview: RefundPreview;
}

/** What the model reads, as one JSON object. Pure, for tests. */
export function summaryFacts({ kase, source, booking, preview }: SummaryInput) {
  const error = kase.latest_error;
  return {
    checkout: source ?? 'UNKNOWN',
    amount: `${kase.currency_symbol}${kase.amount.toFixed(2)}`,
    case_opened_by: kase.sources,
    case_opened_at: kase.created_at.toISOString(),
    razorpay_error: error ? { code: error.code, description: error.description, reason: error.reason, step: error.step } : null,
    failed_attempts: kase.attempts,
    retry_offered: kase.retry_shown,
    evidence: {
      claims: kase.claims?.length ?? 0,
      types: (kase.claims ?? []).map((c) => c.evidence_type),
    },
    verification: {
      status: kase.verification.status,
      notes: kase.verification.notes,
      razorpay_status: kase.verification.razorpay_status,
      matched_on: kase.verification.matched_fields ?? [],
    },
    review: kase.review?.decision ?? null,
    refund: { status: kase.refund.status || 'NONE', attempts: kase.refund.attempts, last_error: kase.refund.error },
    resolution: kase.resolution.state,
    booking,
    live_razorpay_check: preview.refundable
      ? { refundable: true, amount: `${kase.currency_symbol}${(preview.amount ?? 0).toFixed(2)}` }
      : { refundable: false, reason: preview.reason },
  };
}

export interface ParsedSummary {
  recommendation: AiRecommendation;
  summary: string;
  reasons: string[];
}

const MAX_SUMMARY = 600;
const MAX_REASONS = 5;
const MAX_REASON = 200;

const isRecommendation = (value: unknown): value is AiRecommendation =>
  typeof value === 'string' && (AI_RECOMMENDATIONS as readonly string[]).includes(value);

/** The model's JSON, read defensively; null when it is not a usable note. Pure, for tests. */
export function parseAiSummary(content: string): ParsedSummary | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const { recommendation, summary, reasons } = raw as Record<string, unknown>;
  if (!isRecommendation(recommendation) || typeof summary !== 'string' || !summary.trim()) return null;
  const list = Array.isArray(reasons) ? reasons : [];
  return {
    recommendation,
    summary: summary.trim().slice(0, MAX_SUMMARY),
    reasons: list
      .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      .slice(0, MAX_REASONS)
      .map((r) => r.trim().slice(0, MAX_REASON)),
  };
}

/**
 * The code has the last word: the model may never suggest a refund that
 * Razorpay's live check just refused. Such an answer is turned into
 * NEEDS_REVIEW, so the note can never push Finance towards a refund that would
 * fail or send money it should not. Pure, for tests.
 */
export function constrainRecommendation(parsed: ParsedSummary, preview: RefundPreview): ParsedSummary {
  if (parsed.recommendation === 'REFUND' && !preview.refundable) return { ...parsed, recommendation: 'NEEDS_REVIEW' };
  return parsed;
}
