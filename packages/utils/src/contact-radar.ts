import type { FollowStatus } from './follow-status';
import { phoneKey } from './pod-attendance';

/**
 * Your Contacts on Duncit — the logic both the MUI page and the Tamagui
 * screen share: reducing a phone book to what the server matches on, and
 * laying matched people out on the radar. The rendering stays per surface.
 */

/** One phone-book person as the device hands it over: a name and its numbers. */
export interface PhoneBookPerson {
  name?: string | null;
  phones: readonly (string | null | undefined)[];
}

/** What `syncContacts` takes: the comparable key of a number and who it is saved as. */
export interface ContactEntry {
  phone_key: string;
  label: string;
}

/** Shorter than this is a short code or a typo, never a subscriber number. */
export const CONTACT_KEY_MIN_DIGITS = 7;

/**
 * The phone book as sync entries: one per distinct number, keyed the way the
 * server compares numbers (`phoneKey`, last ten digits), so the raw numbers
 * never leave the device. The first name seen for a number is kept.
 */
export function contactEntriesFromPhoneBook(people: readonly PhoneBookPerson[]): ContactEntry[] {
  const byKey = new Map<string, string>();
  for (const person of people) {
    const label = (person.name ?? '').trim();
    for (const phone of person.phones) {
      const key = phoneKey(phone ?? '');
      if (key.length < CONTACT_KEY_MIN_DIGITS) continue;
      const seen = byKey.get(key);
      if (seen === undefined || (!seen && label)) byKey.set(key, label);
    }
  }
  return [...byKey.entries()].map(([phone_key, label]) => ({ phone_key, label }));
}

/** Where one matched person sits on the radar, as fractions of its width. */
export interface RadarPoint {
  x: number;
  y: number;
  ring: number;
}

export interface RadarItem {
  id: string;
  nearby: boolean;
}

/** One ring: its radius as a fraction of the radar's HALF width, and how many
 * faces it holds before the next ring takes over. Innermost first. */
const RADAR_RING_LAYOUT: readonly { radius: number; capacity: number }[] = [
  { radius: 0.34, capacity: 5 },
  { radius: 0.56, capacity: 9 },
  { radius: 0.78, capacity: 13 },
  { radius: 0.96, capacity: 17 },
];
/** Ring radii, innermost first — what a surface draws the dashed circles from. */
export const RADAR_RINGS: readonly number[] = RADAR_RING_LAYOUT.map((ring) => ring.radius);
/** How many faces each ring holds. */
export const RADAR_RING_CAPACITY: readonly number[] = RADAR_RING_LAYOUT.map((ring) => ring.capacity);
/** Everything the radar can show at once; the list under it shows the rest. */
export const RADAR_MAX_ITEMS = RADAR_RING_CAPACITY.reduce((sum, n) => sum + n, 0);

/**
 * Lay matched people out on concentric rings — the people nearby on the inner
 * rings, everyone else further out — spread evenly around each ring. Beyond
 * `RADAR_MAX_ITEMS` a person has no point and is listed instead of plotted.
 */
export function radarPositions(items: readonly RadarItem[]): Map<string, RadarPoint> {
  const ordered = [...items].sort((a, b) => Number(b.nearby) - Number(a.nearby));
  const points = new Map<string, RadarPoint>();
  let start = 0;
  RADAR_RING_LAYOUT.forEach(({ capacity, radius: ringRadius }, ring) => {
    const slice = ordered.slice(start, start + capacity);
    start += capacity;
    const radius = ringRadius / 2;
    // Each ring starts a little further round than the last so faces on
    // neighbouring rings do not line up into spokes.
    const offset = ring * 0.7;
    slice.forEach((item, index) => {
      const angle = offset + (index / slice.length) * Math.PI * 2;
      points.set(item.id, {
        x: 0.5 + radius * Math.cos(angle),
        y: 0.5 + radius * Math.sin(angle),
        ring,
      });
    });
  });
  return points;
}

/** One phone-book number that reached nobody, as `contactsToInvite` returns it. */
export interface InvitableContact {
  phone_key: string;
  contact_label: string;
  /** When an invite last went to it; null while none has. */
  invited_at?: string | null;
}

/** Whether this number has already been texted an invite. One invite per
 * number per inviter is the server's rule, so an invited row never sends again. */
export const isInvited = (row: InvitableContact): boolean => Boolean(row.invited_at);

/** What a row is called: the phone-book name, or the number when it has none. */
export const invitableName = (row: InvitableContact): string =>
  row.contact_label.trim() || row.phone_key;

/**
 * One key in or out of the selection.
 *
 * Returned as a new array rather than mutated: both surfaces hold the selection
 * in state, and a mutated array is the same reference React skips re-rendering.
 */
export function toggleInviteKey(selected: readonly string[], key: string): string[] {
  return selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];
}

/**
 * The rows with the numbers an invite press sent marked invited at `at` — what
 * both surfaces show instead of re-reading a phone book's worth of rows.
 */
export function markInvited<T extends InvitableContact>(
  rows: readonly T[],
  sentKeys: readonly string[],
  at: string
): T[] {
  const sent = new Set(sentKeys);
  return rows.map((row) => (sent.has(row.phone_key) ? { ...row, invited_at: at } : row));
}

/** The words a contact to invite is found by: the saved name, and the number. */
export const invitableSearchText = (row: InvitableContact): string[] => [
  row.contact_label,
  row.phone_key,
];

/** The part of a matched contact's row the helpers below read. */
export interface MatchedContactLike {
  contact_label: string;
  profile: {
    user_id: string;
    full_name?: string | null;
    first_name?: string | null;
    username?: string | null;
  };
}

/** The words a matched contact is found by — both surfaces search on exactly these. */
export const contactSearchText = (row: MatchedContactLike): (string | null | undefined)[] => [
  row.profile.full_name,
  row.profile.first_name,
  row.profile.username,
  row.contact_label,
];

/**
 * The list after one follow tap settled on `status` — only that person's row
 * changes, so a follow never re-reads the whole list.
 */
export function withFollowStatus<T extends MatchedContactLike>(
  rows: readonly T[],
  userId: string,
  status: FollowStatus
): T[] {
  return rows.map((row) => {
    if (row.profile.user_id !== userId) return row;
    const profile = { ...row.profile, follow_status: status, is_following: status === 'FOLLOWING' };
    return { ...row, profile };
  });
}

/** What one invite press reported back. */
export interface InviteOutcome {
  sent: number;
  failed: number;
}

/**
 * Which sentence an invite press earns — the copy key, not the copy.
 *
 * Nothing sent is not the same as nothing happening: the platform holds invites
 * back (WhatsApp switched off, everyone already invited) as readily as AiSensy
 * refuses them, and a silent button reads as a broken one. Both surfaces pick
 * their line through here so they can never disagree about which it was.
 */
export function inviteOutcomeKey(result: InviteOutcome): string {
  if (result.sent > 0) return 'mweb.contacts.invitesSent';
  return result.failed > 0 ? 'mweb.contacts.invitesFailed' : 'mweb.contacts.invitesSkipped';
}
