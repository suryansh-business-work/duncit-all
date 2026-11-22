import { FINANCE_READER } from '@middleware/rbac';

/**
 * The vocabulary of the failed-payment workflow, shared by its models, rules,
 * services and GraphQL mapping so the enums are written exactly once.
 */

export const PAYMENT_EVENT_TYPES = [
  'ORDER_CREATED',
  'CLIENT_FAILURE_REPORTED',
  'RETRY_ATTEMPT',
  'VERIFY_FAILED',
  'CAPTURED',
  'SETTLED',
  'FINALIZE_FAILED',
  'WEBHOOK_PAYMENT_FAILED',
  'WEBHOOK_PAYMENT_CAPTURED',
  'CLAIM_SUBMITTED',
  'EVIDENCE_VERIFIED',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
  'REFUND_REQUESTED',
  'REFUND_INITIATED',
  'REFUND_PROCESSED',
  'REFUND_FAILED',
  'TICKET_RESOLVED',
  'MARKED_NOT_REFUNDABLE',
  'BOOKING_CONFIRMED',
] as const;
export type PaymentEventType = (typeof PAYMENT_EVENT_TYPES)[number];

export const PAYMENT_EVENT_SOURCES = ['CLIENT', 'SERVER', 'WEBHOOK', 'FINANCE', 'SYSTEM'] as const;
export type PaymentEventSource = (typeof PAYMENT_EVENT_SOURCES)[number];

export const CASE_SOURCES = ['CLIENT_REPORT', 'WEBHOOK', 'FINALIZE_FAILED', 'CLAIM'] as const;
export type CaseSource = (typeof CASE_SOURCES)[number];

export const EVIDENCE_TYPES = ['SCREENSHOT', 'BANK_STATEMENT', 'TRANSACTION_ID'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_KINDS = ['IMAGE', 'PDF', 'OTHER'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const VERIFICATION_STATUSES = ['PENDING', 'MATCHED', 'UNMATCHED', 'NOT_CAPTURED', 'ERROR'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const REVIEW_DECISIONS = ['APPROVED', 'REJECTED'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/** '' = no refund was ever started (GraphQL shows it as NONE). */
export const REFUND_STATUSES = ['', 'PENDING', 'PROCESSED', 'FAILED'] as const;
export type CaseRefundStatus = (typeof REFUND_STATUSES)[number];

export const RESOLUTION_STATES = ['OPEN', 'REFUNDED', 'NOT_REFUNDABLE', 'REJECTED', 'BOOKED'] as const;
export type ResolutionState = (typeof RESOLUTION_STATES)[number];

export type Highlight = 'GREEN' | 'YELLOW' | 'NONE';

/** Who did something, frozen at the moment they did it. */
export interface ActorSnapshot {
  id: string;
  name: string;
  roles: string[];
}

/**
 * Who reads and who acts. Reading follows Payment Logs' finance read set (and
 * Support, who own the linked ticket, may open evidence); acting is Finance's
 * managers only — FINANCE_USER is read-only by decision.
 */
export const FAILED_PAYMENT_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER', 'ZONAL_ADMIN', FINANCE_READER];
export const FAILED_PAYMENT_WRITE = ['SUPER_ADMIN', 'FINANCE_MANAGER'];
/** The evidence itself (a bank screenshot) is narrower still: Finance and Support only. */
export const EVIDENCE_READ = ['SUPER_ADMIN', 'FINANCE_MANAGER', FINANCE_READER, 'SUPPORT_MANAGER', 'SUPPORT_USER'];

/** At most this many files per claim (contract: 1–5). */
export const MAX_EVIDENCE_FILES = 5;
/** How long a signed evidence link (Finance's, or the one the AI reads) stays valid. */
export const EVIDENCE_LINK_SECONDS = 10 * 60;
