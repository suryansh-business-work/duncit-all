/**
 * The Venue Kit interest form's five server calls, and the one way their
 * errors are read. Kept apart from the DOM half (`venue-kit-interest.ts`) so
 * each stays small enough to read.
 */
import { postGraphql } from './dom';

/** A code that went out: when it lapses, and the test code ONLY while no provider is set up. */
export interface CodeRequest {
  expires_in_minutes: number;
  resend_after_seconds: number;
  sent: boolean;
  test_code: string | null;
}

export interface SubmitResult {
  ok: boolean;
  already_registered: boolean;
}

export const VENUE_KIT_OPS = {
  requestEmail:
    'mutation VenueKitEmailOtp($input: VenueKitEmailOtpInput!) { requestVenueKitEmailOtp(input: $input) { expires_in_minutes resend_after_seconds sent test_code } }',
  verifyEmail: 'mutation VenueKitVerifyEmail($input: VenueKitEmailVerifyInput!) { verifyVenueKitEmailOtp(input: $input) { token } }',
  requestPhone:
    'mutation VenueKitPhoneOtp($input: VenueKitPhoneOtpInput!) { requestVenueKitPhoneOtp(input: $input) { expires_in_minutes resend_after_seconds sent test_code } }',
  verifyPhone: 'mutation VenueKitVerifyPhone($input: VenueKitPhoneVerifyInput!) { verifyVenueKitPhoneOtp(input: $input) { token } }',
  submit: 'mutation VenueKitSubmit($input: VenueKitInterestInput!) { submitVenueKitInterest(input: $input) { ok already_registered } }',
} as const;

/** The field each operation answers on. */
const FIELDS: Record<keyof typeof VENUE_KIT_OPS, string> = {
  requestEmail: 'requestVenueKitEmailOtp',
  verifyEmail: 'verifyVenueKitEmailOtp',
  requestPhone: 'requestVenueKitPhoneOtp',
  verifyPhone: 'verifyVenueKitPhoneOtp',
  submit: 'submitVenueKitInterest',
};

/** A GraphQL error as this API sends it: `Validation failed` carries the field messages in `extensions.errors`. */
export interface ApiError {
  message: string;
  extensions?: { errors?: string[] };
}

/** Thrown with the message worth showing; `errors` is kept for the captcha's own handler. */
export class VenueKitApiError extends Error {
  readonly errors: readonly ApiError[];

  constructor(message: string, errors: readonly ApiError[]) {
    super(message);
    this.errors = errors;
  }
}

/** The first field message when there is one, else the error's own message, else the fallback. */
export function apiErrorMessage(errors: readonly ApiError[], fallback: string): string {
  const first = errors[0];
  if (!first) return fallback;
  return first.extensions?.errors?.[0] || first.message || fallback;
}

/** POSTs one operation and returns its field, or throws a `VenueKitApiError` worth showing. */
export async function callVenueKit<T>(
  url: string,
  op: keyof typeof VENUE_KIT_OPS,
  input: Record<string, unknown>,
  fallback: string
): Promise<T> {
  const json = await postGraphql<Record<string, T | null>>(url, VENUE_KIT_OPS[op], { input });
  const errors = (json.errors ?? []) as ApiError[];
  const value = json.data?.[FIELDS[op]];
  if (errors.length > 0 || value === undefined || value === null) {
    throw new VenueKitApiError(apiErrorMessage(errors, fallback), errors);
  }
  return value;
}
