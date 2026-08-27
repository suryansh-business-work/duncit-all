/**
 * The account-verification shapes every surface reads.
 *
 * These mirror the server's `myVerifications` payload exactly. They live here
 * rather than beside each page because mWeb, the partner console and the native
 * app all render the same three rows, and three hand-kept copies of one union is
 * how "Under review" ends up spelt two ways (CLAUDE.md rules 27 and 40).
 */

/** The three things an account can verify. EMAIL is settled by signing in. */
export type VerificationType = 'IDENTITY' | 'ADDRESS' | 'EMAIL';

/** Where one verification currently stands. */
export type VerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'VERIFIED_BY_APP';

/**
 * The visual weight of a status, named by meaning rather than by colour.
 *
 * A framework-free tone is what lets one status table serve MUI and Tamagui:
 * each surface maps the tone onto its own palette instead of the package
 * shipping a hex code MUI cannot theme or a palette name Tamagui cannot read.
 */
export type VerificationTone = 'neutral' | 'pending' | 'success' | 'error';

/** The residential address behind an ADDRESS verification. */
export interface VerificationAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
}

/** One row of `myVerifications`. */
export interface Verification {
  type: VerificationType;
  status: VerificationStatus;
  document_url: string | null;
  reject_reason: string | null;
  address: VerificationAddress | null;
}

/** The address form's own state — always strings, because RN inputs are. */
export interface AddressValues {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/** The `submitAddressVerification` input — blanks dropped. */
export interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

/**
 * The translator a caller hands in.
 *
 * Typed locally so the root entrypoint stays dependency-free: the native app,
 * mWeb and the portals each resolve `t` through their own provider, and all
 * three satisfy this signature.
 */
export type VerificationTranslate = (key: string) => string;
