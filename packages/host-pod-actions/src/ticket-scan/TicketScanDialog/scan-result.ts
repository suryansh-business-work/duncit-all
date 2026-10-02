import type { HostPodActionLabels } from '../../labels';
import type { HostTicketScanResult, PodCompanionRecord } from '../../types';

/**
 * How a result should read.
 *
 * A ticket that needs the rest of the group is not an error — it is the next
 * step, and colouring it red made a working scan look broken.
 */
export function resultSeverity(result: HostTicketScanResult): 'success' | 'info' | 'error' {
  if (result.ok) return 'success';
  return result.requires_companions ? 'info' : 'error';
}

/**
 * What a successful scan actually says.
 *
 * The server's `message` is written for the failure cases; on success it left
 * the host reading the same neutral line whether one person or a group of four
 * had just been checked in.
 */
export function confirmationText(
  result: HostTicketScanResult | null,
  labels: HostPodActionLabels,
): string {
  const seats = result?.ticket?.seats ?? 1;
  const who = result?.attendee?.full_name ?? '';
  if (result?.already_checked_in) return labels.alreadyMarked;
  if (seats > 1) return labels.attendanceMarkedGroup(who, seats - 1);
  if (who) return labels.attendanceMarkedOne(who);
  return labels.attendanceMarked;
}

/**
 * The numbers this booking has already spoken for.
 *
 * The buyer's own phone and WhatsApp, plus everyone already written onto the
 * ticket. A companion row may not repeat one: a single WhatsApp answering a
 * single code must never tick two seats.
 *
 * Takes a SETTLED result, because its only caller sits inside the guard that
 * already proved one. `attendee` stays optional and genuinely is — the scan
 * answers with none when the buyer's account is gone — and then there is
 * simply no number of theirs to reserve. That degrades the check rather than
 * holding the group at the door, which is the trade rule 41 asks for
 * everywhere else.
 */
export function reservedPhones(result: HostTicketScanResult): string[] {
  const { attendee } = result;
  return [attendee?.phone ?? '', attendee?.whatsapp ?? ''].concat(
    result.companions.map((companion) => companion.phone_number),
  );
}

/**
 * What the green-tick roster says under a companion's name.
 *
 * The number on file, plus whether that number actually answered a code — the
 * host verified them one at a time, and this is where they see which of them
 * it worked for.
 */
export function companionLine(companion: PodCompanionRecord, labels: HostPodActionLabels): string {
  if (!companion.verified_at) return companion.phone_number;
  return `${companion.phone_number} · ${labels.companionVerified}`;
}
