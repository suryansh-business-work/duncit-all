import { z } from 'zod';
import {
  isOtpCodeShape,
  isOtpExtensionShape,
  isOtpPhoneShape,
  type OtpMedium,
  type PodAttendanceLabels,
  type PodAttendanceRow,
} from '@duncit/utils';

export interface AttendanceOtpValues {
  name: string;
  extension: string;
  number: string;
  mediums: OtpMedium[];
  code: string;
}

/** WhatsApp first: it is the channel this platform actually talks on. */
const DEFAULT_MEDIUMS: OtpMedium[] = ['WHATSAPP', 'SMS'];

/**
 * What the sheet starts with.
 *
 * The number is pre-filled from the attendee's account so the common case is
 * "confirm", not "type" — and it stays editable, because a wrong number on file
 * is exactly the case that needs fixing at the door.
 */
export const attendanceOtpInitialValues = (
  row: PodAttendanceRow | null,
): AttendanceOtpValues => ({
  name: row?.name ?? '',
  extension: row?.phone_extension || '+91',
  number: row?.phone_number ?? '',
  mediums: [...DEFAULT_MEDIUMS],
  code: '',
});

/**
 * The verify-the-attendee schema.
 *
 * Built from the labels rather than from literal strings so the messages are
 * translated, and from `@duncit/utils`' shape helpers so what counts as a phone
 * number is decided in ONE place — the native twin
 * (`app/mobile-app/src/forms/attendance-otp`) reads the same helpers.
 *
 * `code` is validated separately (`attendanceOtpCodeSchema`): it is only filled
 * in after a challenge exists, so folding it into this schema would block the
 * Send button until the host typed a code they have not been sent yet.
 */
export const buildAttendanceOtpSchema = (labels: PodAttendanceLabels) =>
  z.object({
    name: z.string().trim().min(2, labels.otpNameRequired),
    extension: z.string().refine(isOtpExtensionShape, labels.otpExtensionInvalid),
    number: z.string().refine(isOtpPhoneShape, labels.otpPhoneInvalid),
    mediums: z
      .array(z.enum(['SMS', 'WHATSAPP']))
      .min(1, labels.otpMediumRequired),
    code: z.string(),
  });

/** The code box, checked on its own when the host submits it. */
export const attendanceOtpCodeSchema = (labels: PodAttendanceLabels) =>
  z.string().refine(isOtpCodeShape, labels.otpCodeInvalid);

/** Maps the validated values onto `PodAttendanceOtpInput`. */
export function buildAttendanceOtpInput(
  values: AttendanceOtpValues,
  podId: string,
  membershipId: string,
) {
  return {
    pod_doc_id: podId,
    membership_id: membershipId,
    name: values.name.trim(),
    phone_extension: values.extension.trim(),
    phone_number: values.number.trim(),
    mediums: values.mediums,
  };
}
