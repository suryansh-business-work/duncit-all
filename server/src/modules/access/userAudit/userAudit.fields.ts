/**
 * The profile-related fields the user change log watches, and how each one is
 * rendered into the "Old Data" / "New Data" columns.
 *
 * This list is the whole definition of "profile-related data". A field that is
 * not here is invisible to the trail, so anything an admin or the person
 * themselves can edit about the account belongs in it. Relations that live in
 * their own collections (interests, saved pods, the follow graph) deliberately
 * do NOT: they are not fields of the profile and have their own admin views.
 */

export interface TrackedUserField {
  /** Document dot-path on the user document. */
  path: string;
  /** What the admin table calls it. */
  label: string;
  /** Array order carries meaning (so re-ordering is a real change). */
  ordered?: boolean;
}

export const TRACKED_USER_FIELDS: readonly TrackedUserField[] = [
  // Identity
  { path: 'profile.first_name', label: 'First Name' },
  { path: 'profile.last_name', label: 'Last Name' },
  { path: 'profile.dob', label: 'Date of Birth' },
  { path: 'profile.profile_photo', label: 'Profile Photo' },
  { path: 'profile.bio', label: 'Bio' },
  { path: 'profile_links', label: 'Profile Links', ordered: true },

  // Contact
  { path: 'auth.email', label: 'Email' },
  { path: 'auth.is_email_verified', label: 'Email Verified' },
  { path: 'auth.phone.number', label: 'Phone Number' },
  { path: 'auth.phone.extension', label: 'Phone Country Code' },
  { path: 'auth.phone.is_verified', label: 'Phone Verified' },
  { path: 'communication.whatsapp.number', label: 'WhatsApp Number' },
  { path: 'communication.whatsapp.extension', label: 'WhatsApp Country Code' },
  { path: 'communication.whatsapp.verified_at', label: 'WhatsApp Verified At' },

  // Where they are
  { path: 'profile.country', label: 'Country' },
  { path: 'profile.city', label: 'City' },
  { path: 'profile.state', label: 'State' },
  { path: 'profile.pincode', label: 'Pincode' },
  { path: 'profile.zone', label: 'Zone' },
  { path: 'profile.selected_location_id', label: 'Selected Location' },

  // Saved main address
  { path: 'profile.address.line1', label: 'Address Line 1' },
  { path: 'profile.address.line2', label: 'Address Line 2' },
  { path: 'profile.address.landmark', label: 'Address Landmark' },
  { path: 'profile.address.city', label: 'Address City' },
  { path: 'profile.address.state', label: 'Address State' },
  { path: 'profile.address.pincode', label: 'Address Pincode' },
  { path: 'profile.address.country', label: 'Address Country' },

  // Preferences
  { path: 'profile.locale', label: 'Language' },
  { path: 'profile.timezone', label: 'Timezone' },
  { path: 'metadata.profile_visibility', label: 'Profile Visibility' },

  // Pet profile
  { path: 'pet_profile.name', label: 'Pet Name' },
  { path: 'pet_profile.species', label: 'Pet Species' },
  { path: 'pet_profile.breed', label: 'Pet Breed' },
  { path: 'pet_profile.age', label: 'Pet Age' },
  { path: 'pet_profile.photo_url', label: 'Pet Photo' },
  { path: 'pet_profile.bio', label: 'Pet Bio' },

  // Access + account state
  { path: 'metadata.status', label: 'Account Status' },
  { path: 'metadata.role_keys', label: 'Roles' },
  { path: 'metadata.assigned_zones', label: 'Assigned Zones' },
  { path: 'profile.assigned_city', label: 'Assigned City' },
  { path: 'metadata.deleted_at', label: 'Deleted At' },

  // Payout overrides
  { path: 'finance.host_share_pct', label: 'Host Share %' },
  { path: 'finance.host_commission_pct', label: 'Host Commission %' },
];

/** Walk a dot-path on a user document (hydrated or lean). */
export function readPath(doc: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]),
      doc
    );
}

/** The stored shapes that are not plain scalars: an ObjectId, a profile link. */
interface ValueShape {
  label?: unknown;
  url?: unknown;
  toHexString?: () => string;
}

/** True for the values that are safe to hand straight to `String()`. */
function isScalar(value: unknown): value is string | number | boolean | bigint {
  const kind = typeof value;
  return kind === 'string' || kind === 'number' || kind === 'boolean' || kind === 'bigint';
}

/** One value as text. A profile link reads as its label + url, an id as hex. */
function itemText(item: unknown): string {
  if (isScalar(item)) return String(item);
  if (item instanceof Date) return item.toISOString();
  if (item === null || typeof item !== 'object') return '';
  const shape = item as ValueShape;
  if (typeof shape.toHexString === 'function') return shape.toHexString();
  if (typeof shape.url === 'string') {
    const label = typeof shape.label === 'string' ? shape.label : '';
    return `${label} (${shape.url})`;
  }
  // Anything else object-shaped would render as [object Object] (S6551).
  return JSON.stringify(item);
}

/**
 * A field value as the single string the log stores and the table renders.
 *
 * Unordered arrays (roles, zones) are sorted first: the same set arriving in a
 * different order is not a change, and reporting it as one would fill the
 * trail with edits nobody made.
 */
export function valueText(value: unknown, field: TrackedUserField): string {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    // `items` is already a fresh array off `.map`, so sorting it in place
    // mutates nothing the caller can see.
    const items: string[] = value.map(itemText).filter(Boolean);
    if (!field.ordered) items.sort((a, b) => a.localeCompare(b));
    return items.join(', ');
  }
  return itemText(value);
}
