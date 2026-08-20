import type { OtpMedium } from '@duncit/utils';

/**
 * The verify-the-attendee form's values.
 *
 * `OtpMedium` comes from `@duncit/utils` rather than from the generated GraphQL
 * enum: the same union drives the shared roster logic that mWeb reads, and a
 * second definition here is how the two would drift.
 */
export interface AttendanceOtpValues {
  name: string;
  extension: string;
  number: string;
  mediums: OtpMedium[];
  /** Filled in only after a challenge exists; validated on its own. */
  code: string;
}
