import type { HostTicketScanResult, PodCompanionRecord } from '../scan.types';

/**
 * How a result should read. A ticket that needs the rest of the group is the
 * next step, not a failure — mWeb applies the same rule.
 */
export function resultTone(result: HostTicketScanResult): string {
  if (result.ok) return '$success';
  return result.requires_companions ? '$color' : '$danger';
}

/**
 * What the green-tick roster says under a companion's name.
 *
 * The number on file, plus whether that number actually answered a code — the
 * host verified them one at a time, and this is where they see which of them
 * it worked for.
 */
/**
 * The numbers this booking has already spoken for. Twin of mWeb's
 * reservedPhones (rule 27).
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

export function companionLine(companion: PodCompanionRecord, verified: string): string {
  if (!companion.verified_at) return companion.phone_number;
  return `${companion.phone_number} · ${verified}`;
}
