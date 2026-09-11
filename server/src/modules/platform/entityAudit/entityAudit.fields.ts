import type { DiffField } from '@utils/doc-diff';
import type { EntityAuditType } from './entityAudit.model';

/**
 * What the entity change log watches, per entity.
 *
 * These lists ARE the definition of "the record" for reporting: a field that is
 * not here is invisible to the trail, and a field that is here is compared on
 * every write no matter which mutation, portal or job made it. So anything an
 * admin or a partner can edit belongs in it — that is the whole point of the
 * consoles this feeds, where every field of a venue, host, club, club admin and
 * region is editable.
 *
 * Rows that live in their OWN collections (a venue's slots, a club's pods, a
 * region's clubs) are deliberately out: they are not fields of this record and
 * each already has its own list, its own history and its own screen.
 */

/** How one entity's record is found, named and attributed. */
export interface EntityAuditConfig {
  /** Dot-path to the human name shown beside a row, e.g. `venue_name`. */
  labelPath: string;
  /**
   * Dot-path to the account the record BELONGS to, so a partner editing their
   * own venue is recorded as OWNER and anybody else as ADMIN. Omitted for a
   * record nobody owns.
   */
  ownerPath?: string;
  fields: readonly DiffField[];
}

/** Payout details — the same five fields on a venue and on a host. */
const bankFields = (prefix: string): DiffField[] => [
  { path: `${prefix}.payout_method`, label: 'Payout Method' },
  { path: `${prefix}.account_holder_name`, label: 'Account Holder Name' },
  { path: `${prefix}.account_number`, label: 'Account Number' },
  { path: `${prefix}.ifsc_code`, label: 'IFSC Code' },
  { path: `${prefix}.upi_id`, label: 'UPI ID' },
];

/** Review trail — every application-shaped entity carries the same four. */
const reviewFields: DiffField[] = [
  { path: 'reviewer_notes', label: 'Reviewer Notes' },
  { path: 'submitted_at', label: 'Submitted At' },
  { path: 'approved_at', label: 'Approved At' },
  { path: 'rejected_at', label: 'Rejected At' },
];

const VENUE_FIELDS: readonly DiffField[] = [
  // Identity + lifecycle
  { path: 'venue_no', label: 'Venue ID' },
  { path: 'venue_name', label: 'Venue Name' },
  { path: 'venue_type', label: 'Venue Type' },
  { path: 'status', label: 'Status' },
  { path: 'is_active', label: 'Active' },
  { path: 'step_completed', label: 'Steps Completed' },
  { path: 'owner_user_id', label: 'Owner Account' },

  // What the space is
  { path: 'description', label: 'Description' },
  { path: 'capacity', label: 'Total Capacity' },
  { path: 'capacity_items', label: 'Capacity Breakdown', ordered: true },
  { path: 'venue_category.super_category_name', label: 'Super Category' },
  { path: 'venue_category.category_name', label: 'Category' },
  { path: 'venue_category.sub_category_name', label: 'Sub Category' },
  { path: 'amenities', label: 'Amenities' },
  { path: 'facilities', label: 'Facilities' },
  { path: 'security', label: 'Security' },
  { path: 'tags', label: 'Tags' },
  { path: 'cover_image_url', label: 'Cover Image' },
  { path: 'gallery', label: 'Gallery', ordered: true },

  // Where it is
  { path: 'location_id', label: 'Location' },
  { path: 'address_line1', label: 'Address Line 1' },
  { path: 'address_line2', label: 'Address Line 2' },
  { path: 'locality', label: 'Locality' },
  { path: 'city', label: 'City' },
  { path: 'state', label: 'State' },
  { path: 'state_code', label: 'State Code' },
  { path: 'country', label: 'Country' },
  { path: 'country_code', label: 'Country Code' },
  { path: 'postal_code', label: 'Postal Code' },
  { path: 'lat', label: 'Latitude' },
  { path: 'lng', label: 'Longitude' },

  // Paperwork
  { path: 'documents', label: 'Documents', ordered: true },
  { path: 'gstin', label: 'GSTIN' },
  { path: 'pan', label: 'PAN' },
  ...bankFields('bank_account'),

  // Who runs it
  { path: 'owner_name', label: 'Owner Name' },
  { path: 'owner_email', label: 'Owner Email' },
  { path: 'owner_phone', label: 'Owner Phone' },
  { path: 'owner_dob', label: 'Owner Date of Birth' },
  { path: 'owner_address', label: 'Owner Address' },

  // Money
  { path: 'venue_share_pct', label: 'Venue Share %' },
  { path: 'venue_commission_pct', label: 'Venue Commission %' },

  // How it operates
  { path: 'settings.operating_hours.open', label: 'Opens At' },
  { path: 'settings.operating_hours.close', label: 'Closes At' },
  { path: 'settings.weekly_off_days', label: 'Weekly Off Days' },
  { path: 'settings.holidays', label: 'Holidays' },
  { path: 'settings.rules.buffer_minutes', label: 'Buffer Between Slots (min)' },
  { path: 'settings.rules.min_notice_minutes', label: 'Minimum Notice (min)' },
  { path: 'settings.rules.max_advance_days', label: 'Maximum Advance (days)' },
  { path: 'settings.rules.max_bookings_per_slot', label: 'Max Bookings Per Slot' },
  { path: 'settings.rules.allow_instant_booking', label: 'Instant Booking Allowed' },
  { path: 'settings.rules.allow_waitlist', label: 'Waitlist Allowed' },
  { path: 'settings.rules.booking_approval_required', label: 'Booking Approval Required' },
  { path: 'settings.rules.allow_multiple_bookings', label: 'Multiple Bookings Allowed' },
  { path: 'settings.auto_extend.enabled', label: 'Auto-Extend Enabled' },
  { path: 'settings.auto_extend.template_id', label: 'Auto-Extend Template' },
  { path: 'settings.auto_extend.horizon_days', label: 'Auto-Extend Horizon (days)' },
  { path: 'settings.auto_extend.until', label: 'Auto-Extend Until' },
  { path: 'settings.cancellation.reschedule_only', label: 'Reschedule Only' },
  { path: 'settings.cancellation.tiers', label: 'Cancellation Charges', ordered: true },
  { path: 'settings.cancellation.trigger_hours', label: 'Auto-Cancel Trigger (hours)' },
  { path: 'settings.cancellation.refund_tiers', label: 'Auto-Cancel Refund Ladder', ordered: true },

  ...reviewFields,
];

const HOST_FIELDS: readonly DiffField[] = [
  { path: 'host_no', label: 'Host ID' },
  { path: 'user_id', label: 'Host Account' },
  { path: 'full_name', label: 'Full Name' },
  { path: 'email', label: 'Email' },
  { path: 'phone', label: 'Phone' },
  { path: 'dob', label: 'Date of Birth' },
  { path: 'aadhar_number', label: 'Aadhaar Number' },
  { path: 'pan_number', label: 'PAN Number' },
  { path: 'passport_photo_url', label: 'Passport Photo' },
  { path: 'police_verification_url', label: 'Police Verification' },
  { path: 'full_address', label: 'Address' },
  ...bankFields('bank_account'),
  { path: 'host_categories', label: 'Operating Categories', ordered: true },
  { path: 'tags', label: 'Tags' },
  { path: 'step_completed', label: 'Steps Completed' },
  { path: 'status', label: 'Status' },
  { path: 'is_active', label: 'Active' },
  ...reviewFields,
];

const CLUB_FIELDS: readonly DiffField[] = [
  { path: 'club_id', label: 'Club Slug' },
  { path: 'club_name', label: 'Club Name' },
  { path: 'club_description', label: 'Description' },
  { path: 'club_feature_images_and_videos', label: 'Cover Media', ordered: true },
  { path: 'club_moments', label: 'Club Moments', ordered: true },
  { path: 'club_whats_app_community_link', label: 'WhatsApp Community Link' },
  { path: 'club_whats_app_announcement_link', label: 'WhatsApp Announcement Link' },
  { path: 'club_whats_app_group_link', label: 'WhatsApp Group Link' },
  { path: 'who_we_are', label: 'Who We Are', ordered: true },
  { path: 'what_we_do', label: 'What We Do', ordered: true },
  { path: 'perks', label: 'Perks', ordered: true },
  { path: 'values', label: 'Values', ordered: true },
  { path: 'faqs', label: 'FAQs', ordered: true },
  { path: 'location_id', label: 'City' },
  { path: 'locality', label: 'Locality' },
  { path: 'super_category_id', label: 'Super Category' },
  { path: 'category_id', label: 'Category' },
  { path: 'host_ids', label: 'Linked Hosts' },
  { path: 'admin_user_ids', label: 'Club Admins' },
  { path: 'is_verified', label: 'Verified' },
  { path: 'is_active', label: 'Active' },
];

const CLUB_ADMIN_FIELDS: readonly DiffField[] = [
  { path: 'club_admin_no', label: 'Club Admin ID' },
  { path: 'user_id', label: 'Account' },
  { path: 'full_name', label: 'Full Name' },
  { path: 'email', label: 'Email' },
  { path: 'phone', label: 'Phone' },
  { path: 'super_category_id', label: 'Super Category' },
  { path: 'category_id', label: 'Category' },
  { path: 'sub_category_id', label: 'Sub Category' },
  { path: 'status', label: 'Status' },
  { path: 'is_active', label: 'Active' },
  { path: 'commission_pct', label: 'Commission %' },
  { path: 'joined_at', label: 'Joined At' },
  { path: 'request_no', label: 'Meeting Request' },
  { path: 'reviewer_notes', label: 'Reviewer Notes' },
  { path: 'approved_at', label: 'Approved At' },
];

const REGION_FIELDS: readonly DiffField[] = [
  { path: 'region_no', label: 'Region ID' },
  { path: 'region_name', label: 'Region Name' },
  { path: 'manager_user_id', label: 'Regional Club Admin' },
  { path: 'club_admin_user_ids', label: 'Club Admins In Region' },
  { path: 'is_active', label: 'Active' },
];

/** Every entity's config, keyed by the type stored on the log row. */
export const ENTITY_AUDIT_CONFIG: Record<EntityAuditType, EntityAuditConfig> = {
  VENUE: { labelPath: 'venue_name', ownerPath: 'owner_user_id', fields: VENUE_FIELDS },
  HOST: { labelPath: 'full_name', ownerPath: 'user_id', fields: HOST_FIELDS },
  CLUB: { labelPath: 'club_name', fields: CLUB_FIELDS },
  CLUB_ADMIN: { labelPath: 'full_name', ownerPath: 'user_id', fields: CLUB_ADMIN_FIELDS },
  REGION: { labelPath: 'region_name', ownerPath: 'manager_user_id', fields: REGION_FIELDS },
};
