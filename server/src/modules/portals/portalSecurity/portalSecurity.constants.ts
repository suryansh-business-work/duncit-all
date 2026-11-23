/**
 * Security Verification — the screen every internal console puts between a
 * successful sign-in and the console itself.
 *
 * Everything the rest of the module decides on lives here, so the retention
 * window, the consent wording's version and who may read the records are named
 * once and cannot drift between the model, the service and the tests.
 */

/** Who may read the verification log and decide an alternative-verification request. */
export const PORTAL_SECURITY_REVIEW_ROLES: readonly string[] = ['SUPER_ADMIN', 'TECH_MANAGER'];

/**
 * How long a verification row (location, IP, device) is kept. The TTL index on
 * the model removes older rows; keeping personal data only as long as the
 * security purpose needs it is a retention limit, not a convenience.
 */
export const PORTAL_SECURITY_RETENTION_DAYS = 180;

/** How long the trail of who READ those rows is kept — longer than the rows themselves. */
export const PORTAL_SECURITY_ACCESS_LOG_RETENTION_DAYS = 365;

/**
 * Version of the consent wording shown on the screen (the notice and the four
 * acknowledgements). Bump it whenever `portalSecurity.policy.ts` changes: every
 * signed-in console session is asked again, because what a person agreed to is
 * recorded against this string.
 */
export const PORTAL_SECURITY_NOTICE_VERSION = '2026-11-23.1';

/** The policy types (Legal console) the screen links to as "the full policy". */
export const PORTAL_SECURITY_LINKED_POLICY_TYPES: readonly string[] = [
  'Privacy Policy',
  'Security Policy',
  'Acceptable Use Policy',
  'Data Retention Policy',
  'Grievance Redressal Policy',
];

/** How a verification ended. */
export const VERIFICATION_RESULTS = ['VERIFIED', 'EXCEPTION_APPROVED', 'LOCATION_DENIED'] as const;
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];

/** What proved the person is where they say: a consented GPS fix, or an administrator. */
export const VERIFICATION_METHODS = ['GPS', 'ADMIN_EXCEPTION'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const EXCEPTION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED'] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

/** How long an approved alternative verification can still be used. */
export const EXCEPTION_VALID_HOURS = 24;

/** A reason is required (the reviewer reads it), and bounded (it is stored). */
export const EXCEPTION_REASON_MIN = 10;
export const EXCEPTION_REASON_MAX = 500;

/** What was read from the log, for the access trail. */
export const ACCESS_ACTIONS = ['LIST', 'VIEW'] as const;
export type AccessAction = (typeof ACCESS_ACTIONS)[number];

/** How a failed browser location request is reported (GeolocationPositionError.code). */
export const LOCATION_ERROR_CODES = ['PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT', 'UNSUPPORTED'] as const;
export type LocationErrorCode = (typeof LOCATION_ERROR_CODES)[number];
