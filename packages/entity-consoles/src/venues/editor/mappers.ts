import type { AdminVenueDetail } from '../detail/queries';
import { blankVenueValues, type VenueFormValues } from './types';

/**
 * The two directions between the stored venue and the form.
 *
 * Kept apart from the page so both are testable without React, and so the
 * mapping is one place: a field added to the record is added here once and the
 * form, the save and the reset all learn about it together.
 */

/** The stored record as form values. */
export function venueToValues(venue: AdminVenueDetail): VenueFormValues {
  const settings = venue.settings;
  return {
    id: venue.id,
    owner_user_id: venue.owner_user_id,

    venue_name: venue.venue_name ?? '',
    venue_type: venue.venue_type ?? '',
    capacity: venue.capacity ?? 1,
    capacity_items: (venue.capacity_items ?? []).map((item) => ({
      label: item.label,
      capacity: item.capacity,
    })),
    category: {
      super_id: venue.venue_category?.super_category_id ?? '',
      super_name: venue.venue_category?.super_category_name ?? '',
      category_id: venue.venue_category?.category_id ?? '',
      category_name: venue.venue_category?.category_name ?? '',
      sub_id: venue.venue_category?.sub_category_id ?? '',
      sub_name: venue.venue_category?.sub_category_name ?? '',
    },
    description: venue.description ?? '',
    amenities: venue.amenities ?? [],
    facilities: venue.facilities ?? [],
    security: venue.security ?? [],
    tags: venue.tags ?? [],

    cover_image_url: venue.cover_image_url ?? '',
    gallery: venue.gallery ?? [],

    location: {
      location_id: venue.location_id ?? '',
      country: venue.country ?? '',
      country_code: venue.country_code ?? '',
      state: venue.state ?? '',
      state_code: venue.state_code ?? '',
      city: venue.city ?? '',
      locality: venue.locality ?? '',
      pincode: venue.postal_code ?? '',
    },
    address_line1: venue.address_line1 ?? '',
    address_line2: venue.address_line2 ?? '',

    documents: (venue.documents ?? []).map((doc) => ({ type: doc.type, url: doc.url })),
    gstin: venue.gstin ?? '',
    pan: venue.pan ?? '',

    owner_name: venue.owner_name ?? '',
    owner_email: venue.owner_email ?? '',
    owner_phone: venue.owner_phone ?? '',
    owner_dob: venue.owner_dob ?? '',
    owner_address: venue.owner_address ?? '',
    bank_account: {
      payout_method: venue.bank_account?.payout_method ?? '',
      account_holder_name: venue.bank_account?.account_holder_name ?? '',
      account_number: venue.bank_account?.account_number ?? '',
      ifsc_code: venue.bank_account?.ifsc_code ?? '',
      upi_id: venue.bank_account?.upi_id ?? '',
    },

    venue_share_pct: venue.venue_share_pct ?? 0,
    venue_commission_pct: venue.venue_commission_pct ?? 0,

    status: venue.status,
    is_active: venue.is_active,

    settings: {
      open: settings?.operating_hours?.open || blankVenueValues.settings.open,
      close: settings?.operating_hours?.close || blankVenueValues.settings.close,
      weekly_off_days: settings?.weekly_off_days ?? [],
      holidays: settings?.holidays ?? [],
      rules: { ...blankVenueValues.settings.rules, ...(settings?.rules ?? {}) },
      auto_extend_enabled: settings?.auto_extend?.enabled ?? false,
      auto_extend_horizon_days:
        settings?.auto_extend?.horizon_days ?? blankVenueValues.settings.auto_extend_horizon_days,
      auto_extend_until: settings?.auto_extend?.until ?? '',
      reschedule_only: settings?.cancellation?.reschedule_only ?? false,
      charge_tiers: (settings?.cancellation?.tiers ?? []).map((tier) => ({
        hours_before: tier.hours_before,
        charge_type: tier.charge_type,
        value: tier.value,
      })),
      trigger_hours:
        settings?.cancellation?.trigger_hours ?? blankVenueValues.settings.trigger_hours,
      refund_tiers: (settings?.cancellation?.refund_tiers ?? []).map((tier) => ({
        hours_before: tier.hours_before,
        refund_pct: tier.refund_pct,
      })),
    },
  };
}

/** Step 1 — what the space is and where it is. */
export const valuesToStep1 = (values: VenueFormValues) => ({
  venue_name: values.venue_name,
  venue_type: values.venue_type,
  capacity: values.capacity,
  capacity_items: values.capacity_items.map((item) => ({
    label: item.label,
    capacity: item.capacity,
  })),
  // The server validates the triple when set, and rejects a partial one — so an
  // unchosen category is omitted rather than sent as three empty ids.
  venue_category: values.category.sub_id
    ? {
        super_category_id: values.category.super_id,
        category_id: values.category.category_id,
        sub_category_id: values.category.sub_id,
      }
    : undefined,
  description: values.description,
  amenities: values.amenities,
  facilities: values.facilities,
  security: values.security,
  cover_image_url: values.cover_image_url,
  gallery: values.gallery,
  location_id: values.location.location_id || undefined,
  country: values.location.country,
  country_code: values.location.country_code,
  address_line1: values.address_line1,
  address_line2: values.address_line2,
  city: values.location.city,
  state: values.location.state,
  state_code: values.location.state_code,
  locality: values.location.locality,
  postal_code: values.location.pincode,
  tags: values.tags,
});

/** Step 2 — the paperwork. */
export const valuesToStep2 = (values: VenueFormValues) => ({
  documents: values.documents.filter((doc) => doc.type && doc.url),
  gstin: values.gstin,
  pan: values.pan,
});

/** Step 3 — who runs it, and where the money goes. */
export const valuesToStep3 = (values: VenueFormValues) => ({
  owner_name: values.owner_name,
  owner_email: values.owner_email,
  owner_phone: values.owner_phone,
  owner_dob: values.owner_dob || undefined,
  owner_address: values.owner_address,
  bank_account: values.bank_account,
});

/** The settings mutation's input — hours, rules, auto-extend, cancellation. */
export const valuesToSettingsInput = (values: VenueFormValues) => ({
  operating_hours: { open: values.settings.open, close: values.settings.close },
  weekly_off_days: values.settings.weekly_off_days,
  holidays: values.settings.holidays,
  rules: values.settings.rules,
  auto_extend: {
    enabled: values.settings.auto_extend_enabled,
    horizon_days: values.settings.auto_extend_horizon_days,
    until: values.settings.auto_extend_until,
  },
  cancellation: {
    reschedule_only: values.settings.reschedule_only,
    tiers: values.settings.charge_tiers,
    trigger_hours: values.settings.trigger_hours,
    refund_tiers: values.settings.refund_tiers,
  },
});
