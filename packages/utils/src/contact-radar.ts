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

/** Ring radius as a fraction of the radar's HALF width, innermost first. */
export const RADAR_RINGS: readonly number[] = [0.34, 0.56, 0.78, 0.96];
/** How many faces a ring holds before the next ring takes over. */
export const RADAR_RING_CAPACITY: readonly number[] = [5, 9, 13, 17];
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
  RADAR_RING_CAPACITY.forEach((capacity, ring) => {
    const slice = ordered.slice(start, start + capacity);
    start += capacity;
    const radius = (RADAR_RINGS[ring] ?? 0) / 2;
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
