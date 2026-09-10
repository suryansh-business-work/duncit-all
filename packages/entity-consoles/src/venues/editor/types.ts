import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import { EMPTY_LOCATION, type AdminLocationValue } from '@duncit/location';
import type { VenueStatus } from '../detail/queries';

/**
 * Everything a venue record holds, as one form.
 *
 * The server splits a venue's writes across five mutations — the three
 * onboarding steps, the settings form, the deductions form and the active
 * switch — because five different people write them in production. An admin is
 * not one of those five: they are looking at the whole record, so the EDITOR is
 * one form and the split is handled on submit (see `submitVenue`).
 */

export interface VenueDocEntry {
  type: string;
  url: string;
}

export interface VenueCapacityRow {
  label: string;
  capacity: number;
}

export interface VenueChargeTierRow {
  hours_before: number;
  charge_type: 'PERCENT' | 'AMOUNT';
  value: number;
}

export interface VenueRefundTierRow {
  hours_before: number;
  refund_pct: number;
}

export interface VenueBankValues {
  payout_method: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

export interface VenueRulesValues {
  buffer_minutes: number;
  min_notice_minutes: number;
  max_advance_days: number;
  max_bookings_per_slot: number;
  allow_instant_booking: boolean;
  allow_waitlist: boolean;
  booking_approval_required: boolean;
  allow_multiple_bookings: boolean;
}

export interface VenueSettingsValues {
  open: string;
  close: string;
  weekly_off_days: number[];
  holidays: string[];
  rules: VenueRulesValues;
  auto_extend_enabled: boolean;
  auto_extend_horizon_days: number;
  auto_extend_until: string;
  reschedule_only: boolean;
  charge_tiers: VenueChargeTierRow[];
  trigger_hours: number;
  refund_tiers: VenueRefundTierRow[];
}

export interface VenueFormValues {
  /** Empty while creating; the venue's doc id while editing. */
  id: string;
  owner_user_id: string;

  venue_name: string;
  venue_type: string;
  capacity: number;
  capacity_items: VenueCapacityRow[];
  category: AdminCategoryValue;
  description: string;
  amenities: string[];
  facilities: string[];
  security: string[];
  tags: string[];

  cover_image_url: string;
  gallery: string[];

  location: AdminLocationValue;
  address_line1: string;
  address_line2: string;

  documents: VenueDocEntry[];
  gstin: string;
  pan: string;

  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_dob: string;
  owner_address: string;
  bank_account: VenueBankValues;

  venue_share_pct: number;
  venue_commission_pct: number;

  status: VenueStatus;
  is_active: boolean;

  settings: VenueSettingsValues;
}

export const blankBankValues: VenueBankValues = {
  payout_method: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
};

/**
 * A new venue's starting point.
 *
 * The operating defaults mirror the server's own (`venue.constants.ts`), so an
 * admin creating a venue and an owner registering one land on the same rules
 * rather than on two different ideas of "normal".
 */
export const blankVenueValues: VenueFormValues = {
  id: '',
  owner_user_id: '',
  venue_name: '',
  venue_type: '',
  capacity: 1,
  capacity_items: [],
  category: EMPTY_CATEGORY,
  description: '',
  amenities: [],
  facilities: [],
  security: [],
  tags: [],
  cover_image_url: '',
  gallery: [],
  location: EMPTY_LOCATION,
  address_line1: '',
  address_line2: '',
  documents: [],
  gstin: '',
  pan: '',
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  owner_dob: '',
  owner_address: '',
  bank_account: blankBankValues,
  venue_share_pct: 0,
  venue_commission_pct: 0,
  status: 'DRAFT',
  is_active: true,
  settings: {
    open: '09:00',
    close: '23:00',
    weekly_off_days: [],
    holidays: [],
    rules: {
      buffer_minutes: 0,
      min_notice_minutes: 0,
      max_advance_days: 60,
      max_bookings_per_slot: 1,
      allow_instant_booking: true,
      allow_waitlist: false,
      booking_approval_required: false,
      allow_multiple_bookings: false,
    },
    auto_extend_enabled: false,
    auto_extend_horizon_days: 30,
    auto_extend_until: '',
    reschedule_only: false,
    charge_tiers: [],
    trigger_hours: 6,
    refund_tiers: [],
  },
};
