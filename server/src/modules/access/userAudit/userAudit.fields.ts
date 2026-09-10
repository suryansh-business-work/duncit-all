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

import type { DiffField } from '@utils/doc-diff';

/** One watched field of the user document — the shared watched-field shape. */
export type TrackedUserField = DiffField;

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

/**
 * Reading and rendering a value is not user-specific — the entity change log
 * (venues, hosts, clubs, club admins, regions) renders its columns the same
 * way — so both trails share one implementation in `@utils/doc-diff` and this
 * module re-exports it for the callers that already knew it by this name.
 */
export { readPath, valueText } from '@utils/doc-diff';
