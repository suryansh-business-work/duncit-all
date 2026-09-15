/**
 * What a grievance form accepts — the one spec every surface validates against.
 *
 * mWeb, the native app, the website and the server all gate this form, and a
 * limit that disagrees between them is a field the user can fill in on one
 * surface and be rejected for on another. So the limits and the required/
 * optional split live here, once, and each surface builds its own schema from
 * them (Zod on the two apps, plain checks on the server and the website) —
 * framework-free, because the native app cannot import a package that pulls in
 * React or MUI.
 *
 * The value SHAPES (email, phone) are not repeated here: they come from
 * `@duncit/regex`, which already owns them.
 */

import { formatPhoneLine } from './contact-change';

/** A field on the grievance form, in the order every surface renders them. */
export type GrievanceField =
  | 'support_ticket_ref'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'subject'
  | 'description';

export const GRIEVANCE_FIELDS: readonly GrievanceField[] = [
  'support_ticket_ref',
  'name',
  'email',
  'phone',
  'address',
  'subject',
  'description',
];

/** Maximum accepted length per field. Mirrors the server's schema exactly. */
export const GRIEVANCE_MAX_LENGTH: Readonly<Record<GrievanceField, number>> = {
  support_ticket_ref: 60,
  name: 120,
  email: 200,
  phone: 30,
  address: 500,
  subject: 200,
  description: 5000,
};

/**
 * Address is the only optional field.
 *
 * A grievance is answerable by email and phone; demanding a postal address
 * would turn a legally-required channel into an obstacle.
 */
export const GRIEVANCE_OPTIONAL_FIELDS: readonly GrievanceField[] = ['address'];

export function isGrievanceFieldRequired(field: GrievanceField): boolean {
  return !GRIEVANCE_OPTIONAL_FIELDS.includes(field);
}

/** The localization key holding this field's label, on every surface. */
export function grievanceFieldLabelKey(field: GrievanceField): string {
  return `grievance.field.${field}`;
}

export interface GrievanceDraft {
  /**
   * The support ticket this grievance escalates — `ST-A1B2C3`, `CB-…`, `CH-…`
   * or `SOS-…`.
   *
   * A grievance is the LAST step, not the first: support gets the issue first,
   * and only what support could not settle reaches the Grievance Officer. The
   * reference is how the officer finds that history, and a grievance arriving
   * without one is what gets rejected — which is why every form demands it and
   * says so before the person starts typing.
   *
   * It leads the form for the same reason: somebody who has not been to support
   * should find that out before writing five paragraphs, not after.
   */
  support_ticket_ref: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  subject: string;
  description: string;
}

export const EMPTY_GRIEVANCE_DRAFT: GrievanceDraft = {
  support_ticket_ref: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  subject: '',
  description: '',
};

/** The parts of the signed-in account a grievance form can open with. */
export interface GrievanceUserSource {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_extension?: string | null;
  phone_number?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    landmark?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
  } | null;
}

/**
 * The draft a signed-in person's grievance form opens with: their name, email,
 * phone and address already filled in from the account, the complaint left
 * blank. mWeb and native both seed from this so the two forms open identically.
 */
export function grievanceDraftFromUser(user: Readonly<GrievanceUserSource>): GrievanceDraft {
  const name =
    user.full_name?.trim() ||
    [user.first_name, user.last_name].map((part) => part?.trim()).filter(Boolean).join(' ');
  const { line1, line2, landmark, city, state, pincode, country } = user.address ?? {};
  const address = [line1, line2, landmark, city, state, pincode, country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  return {
    ...EMPTY_GRIEVANCE_DRAFT,
    name,
    email: user.email ?? '',
    phone: formatPhoneLine(user.phone_extension, user.phone_number),
    address,
  };
}

/**
 * Where a grievance is in its redressal — the same four states the server
 * stores, so a client never invents a fifth.
 */
export type GrievanceStatus = 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

export const GRIEVANCE_STATUSES: readonly GrievanceStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
];

/** Grievances still owed an answer — what the redressal clock runs on. */
export function isGrievanceOpen(status: GrievanceStatus): boolean {
  return status === 'RECEIVED' || status === 'IN_REVIEW';
}

/**
 * The steps a complainant has to have walked before a grievance is accepted.
 *
 * Rendered as a numbered timeline above the form on mWeb, native AND the
 * website. The order is the policy, so it lives here rather than three times
 * in three layouts — and the copy for each step is resolved from
 * `grievanceEscalationCopy` in @duncit/i18n, which owns the words.
 */
export type GrievanceEscalationStep = 'raise' | 'wait' | 'escalate';

export const GRIEVANCE_ESCALATION_STEPS: readonly GrievanceEscalationStep[] = [
  'raise',
  'wait',
  'escalate',
];

/**
 * One row of the support-ticket dropdown, as mWeb and native both render it.
 *
 * Two surfaces showing the same list is exactly what rule 40 asks to share, and
 * the value is what lands in `support_ticket_ref` — so the reference the
 * officer reads is byte-identical whichever app raised it.
 */
export interface GrievanceSupportTicketOption {
  /** Stored on the grievance: the prefixed ticket number, e.g. `ST-A1B2C3`. */
  value: string;
  /** Shown in the dropdown: `ST-A1B2C3 · Refund not received`. */
  label: string;
}

/** What a unified support row has to carry to become a dropdown option. */
export interface GrievanceSupportTicketSource {
  ticket_no: string;
  title: string;
}

/**
 * Turn the user's support history into dropdown options.
 *
 * Rows with no ticket number are dropped rather than rendered blank: an option
 * that stores an empty reference is the same as not choosing one, and the whole
 * point of the field is that the officer can find the ticket behind it.
 */
export function grievanceSupportTicketOptions(
  rows: readonly GrievanceSupportTicketSource[]
): GrievanceSupportTicketOption[] {
  return rows
    .filter((row) => row.ticket_no.trim().length > 0)
    .map((row) => {
      const value = row.ticket_no.trim();
      const title = row.title.trim();
      return { value, label: title ? `${value} · ${title}` : value };
    });
}
