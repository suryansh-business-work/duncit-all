import { z } from 'zod';
import {
  isOtpCodeShape,
  isOtpExtensionShape,
  isOtpPhoneShape,
  type PodAttendanceLabels,
  type PodAttendanceRow,
} from '@duncit/utils';

import type { AttendanceOtpValues } from './attendance-otp.types';

/** WhatsApp first: it is the channel this platform actually talks on. */
const DEFAULT_MEDIUMS: AttendanceOtpValues['mediums'] = ['WHATSAPP', 'SMS'];

/**
 * What the sheet starts with.
 *
 * The number is pre-filled from the attendee's account so the common case is
 * "confirm", not "type" — and it stays editable, because a wrong number on file
 * is exactly the case that needs fixing at the door.
 */
export const attendanceOtpInitialValues = (row: PodAttendanceRow | null): AttendanceOtpValues => ({
  name: row?.name ?? '',
  extension: row?.phone_extension || '+91',
  number: row?.phone_number ?? '',
  mediums: [...DEFAULT_MEDIUMS],
  code: '',
});

/**
 * The verify-the-attendee schema — the native twin of
 * `@duncit/host-pod-actions`' `buildAttendanceOtpSchema` (rule 27).
 *
 * The two are separate files because that package is MUI and this app cannot
 * consume it, but both read their shape rules from `@duncit/utils`, so what
 * counts as a phone number is still decided in exactly one place.
 *
 * `code` is validated separately: it is only filled in after a challenge
 * exists, so folding it in here would block Send until the host typed a code
 * they have not been sent yet.
 */
export const buildAttendanceOtpSchema = (labels: PodAttendanceLabels) =>
  z.object({
    name: z.string().trim().min(2, labels.otpNameRequired),
    extension: z.string().refine(isOtpExtensionShape, labels.otpExtensionInvalid),
    number: z.string().refine(isOtpPhoneShape, labels.otpPhoneInvalid),
    mediums: z.array(z.enum(['SMS', 'WHATSAPP'])).min(1, labels.otpMediumRequired),
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
