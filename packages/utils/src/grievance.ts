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

/** A field on the grievance form, in the order every surface renders them. */
export type GrievanceField = 'name' | 'email' | 'phone' | 'address' | 'subject' | 'description';

export const GRIEVANCE_FIELDS: readonly GrievanceField[] = [
  'name',
  'email',
  'phone',
  'address',
  'subject',
  'description',
];

/** Maximum accepted length per field. Mirrors the server's schema exactly. */
export const GRIEVANCE_MAX_LENGTH: Readonly<Record<GrievanceField, number>> = {
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
  name: string;
  email: string;
  phone: string;
  address: string;
  subject: string;
  description: string;
}

export const EMPTY_GRIEVANCE_DRAFT: GrievanceDraft = {
  name: '',
  email: '',
  phone: '',
  address: '',
  subject: '',
  description: '',
};

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
