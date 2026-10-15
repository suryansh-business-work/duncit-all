import { isCompleteCategory, type AdminCategoryValue } from '@duncit/category';
import {
  foodDishToValues,
  foodLicencesToValues,
  foodOrderingToValues,
  foodTablesToValues,
  toVenueFoodInput,
  venueCategoryList,
} from '@duncit/utils';
import type { AdminVenueDetail, VenueCategoryRecord } from '../detail/queries';
import { podRequestOverrideText } from '../../shared/podRequestLimit';
import { blankVenueValues, type VenueFormValues } from './types';

/**
 * The two directions between the stored venue and the form.
 *
 * Kept apart from the page so both are testable without React, and so the
 * mapping is one place: a field added to the record is added here once and the
 * form, the save and the reset all learn about it together.
 *
 * There are DELIBERATELY few `??` fallbacks. Every field the query selects is
 * `String!` / `[X!]!` / `Float!` except the eleven listed below, so a fallback on
 * any of the others is a branch nothing can reach — dead code that reads as
 * caution. The nullable ones, which DO get a fallback:
 *   venue_no · location_id · lat · lng · owner_dob · each category's three ids ·
 *   bank_account.payout_method · settings.auto_extend.template_id · the review
 *   timestamps.
 * The `||` on the operating hours is different and stays: an empty stored string
 * is a real value there, and it should open on the same default a new venue gets.
 */
const toCategoryRow = (entry: VenueCategoryRecord): AdminCategoryValue => ({
  super_id: entry.super_category_id ?? '',
  super_name: entry.super_category_name,
  category_id: entry.category_id ?? '',
  category_name: entry.category_name,
  sub_id: entry.sub_category_id ?? '',
  sub_name: entry.sub_category_name,
});

/**
 * What the venue seats, from its named spaces.
 *
 * The server derives the scalar `capacity` from `capacity_items` whenever a
 * save carries any (`buildStep1Patch`), so the form shows and sends the same
 * sum instead of a second number that could disagree with it.
 */
export const capacityTotal = (items: readonly { capacity: number | string }[]): number =>
  items.reduce((sum, item) => sum + (Number(item.capacity) || 0), 0);

export function venueToValues(venue: AdminVenueDetail): VenueFormValues {
  const { settings } = venue;
  return {
    id: venue.id,
    owner_user_id: venue.owner_user_id,

    venue_name: venue.venue_name,
    venue_type: venue.venue_type,
    capacity: venue.capacity,
    capacity_items: venue.capacity_items.map((item) => ({
      label: item.label,
      capacity: item.capacity,
    })),
    offers_food: venue.offers_food,
    food_menu: venue.food_menu.map(foodDishToValues),
    // What the server resolved: the venue's own GST, or Finance's default while it follows it.
    food_ordering: foodOrderingToValues(venue.food_ordering),
    food_licences: foodLicencesToValues(venue.food_licences),
    food_tables: foodTablesToValues(venue.food_tables),
    // Primary first: the list, or the lone legacy triple of a venue stored
    // before the list existed. A venue with none opens on no row at all.
    categories: venueCategoryList(venue).map(toCategoryRow),
    description: venue.description,
    amenities: venue.amenities,
    facilities: venue.facilities,
    security: venue.security,
    tags: venue.tags,

    cover_image_url: venue.cover_image_url,
    gallery: venue.gallery,
    videos: venue.videos ?? [],

    location: {
      location_id: venue.location_id ?? '',
      country: venue.country,
      country_code: venue.country_code,
      state: venue.state,
      state_code: venue.state_code,
      city: venue.city,
      locality: venue.locality,
      pincode: venue.postal_code,
    },
    address_line1: venue.address_line1,
    address_line2: venue.address_line2,

    documents: venue.documents.map((doc) => ({ type: doc.type, url: doc.url })),
    gstin: venue.gstin,
    pan: venue.pan,

    owner_name: venue.owner_name,
    owner_email: venue.owner_email,
    owner_phone: venue.owner_phone,
    owner_dob: venue.owner_dob ?? '',
    owner_address: venue.owner_address,
    bank_account: {
      payout_method: venue.bank_account.payout_method ?? '',
      account_holder_name: venue.bank_account.account_holder_name,
      account_number: venue.bank_account.account_number,
      ifsc_code: venue.bank_account.ifsc_code,
      upi_id: venue.bank_account.upi_id,
    },

    venue_share_pct: venue.venue_share_pct,
    venue_commission_pct: venue.venue_commission_pct,
    host_requests_limit_override: podRequestOverrideText(venue.host_requests_limit_override),

    status: venue.status,
    is_active: venue.is_active,

    settings: {
      // A venue stored before the window existed carries '', and it should open
      // on the same hours a venue registered today gets.
      open: settings.operating_hours.open || blankVenueValues.settings.open,
      close: settings.operating_hours.close || blankVenueValues.settings.close,
      weekly_off_days: settings.weekly_off_days,
      holidays: settings.holidays,
      rules: { ...blankVenueValues.settings.rules, ...settings.rules },
      auto_extend_enabled: settings.auto_extend.enabled,
      auto_extend_horizon_days: settings.auto_extend.horizon_days,
      auto_extend_until: settings.auto_extend.until,
      reschedule_only: settings.cancellation.reschedule_only,
      charge_tiers: settings.cancellation.tiers.map((tier) => ({
        hours_before: tier.hours_before,
        charge_type: tier.charge_type,
        value: tier.value,
      })),
      trigger_hours: settings.cancellation.trigger_hours,
      refund_tiers: settings.cancellation.refund_tiers.map((tier) => ({
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
  // With named spaces the total IS their sum (the server derives the same); the
  // typed scalar is only what a venue without any is saved with.
  capacity: values.capacity_items.length > 0 ? capacityTotal(values.capacity_items) : values.capacity,
  capacity_items: values.capacity_items.map((item) => ({
    label: item.label,
    capacity: item.capacity,
  })),
  // The shared food mapping. The Razorpay account is DELIBERATELY never named:
  // it is the owner's, linked from the Partners portal, and leaving the key out
  // is what leaves the link alone. Switched off, only the switch goes — the
  // server keeps the menu for when the kitchen reopens.
  ...toVenueFoodInput(values, { sendAccount: false }),
  // Primary first. Only whole triples go — the server rejects a partial one, and
  // a row left blank (or a legacy row whose ids are gone) is not a category. An
  // EMPTY list names none, which the server reads as "leave the venue's
  // categories alone": a venue's last category cannot be removed from here.
  venue_categories: values.categories.filter(isCompleteCategory).map((category) => ({
    super_category_id: category.super_id,
    category_id: category.category_id,
    sub_category_id: category.sub_id,
  })),
  description: values.description,
  amenities: values.amenities,
  facilities: values.facilities,
  security: values.security,
  cover_image_url: values.cover_image_url,
  gallery: values.gallery,
  videos: values.videos,
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
  // `BankPayoutMethod` is an enum: an unchosen method is omitted, never sent as
  // the select's empty "None" value, which the server rejects outright.
  bank_account: {
    ...values.bank_account,
    payout_method: values.bank_account.payout_method || undefined,
  },
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
