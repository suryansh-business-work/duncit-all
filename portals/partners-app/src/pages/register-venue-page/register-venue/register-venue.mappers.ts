import { EMPTY_CATEGORY, isCompleteCategory, type AdminCategoryValue } from '@duncit/category';
import {
  foodDishToValues,
  foodLicencesToValues,
  foodOrderingToValues,
  foodTablesToValues,
  toVenueFoodInput,
  venueCategoryList,
  type VenueCategoryEntry,
} from '@duncit/utils';
import { blankRegisterVenueValues, type RegisterVenueValues } from './register-venue.types';

const cityName = (location: any) => location.city || location.location_name || '';

/** Match a saved venue to its admin Location doc — by id first, then by
 * city/state/country when the id is missing (legacy venues). */
const findSelectedLocation = (locations: any[], values: RegisterVenueValues) =>
  locations.find((item) => item.id === values.location_id) ??
  locations.find(
    (item) =>
      cityName(item) === values.city &&
      (!values.state || item.state === values.state) &&
      item.country_code === values.country_code
  ) ??
  null;

/** Re-derives location_id / zone / postal_code from the locations list so the
 * cascading dropdowns line up with what the server stored. */
const hydrateLocation = (values: RegisterVenueValues, locations: any[]): RegisterVenueValues => {
  const location = findSelectedLocation(locations, values);
  const zones = location?.location_zones ?? [];
  const zone = zones.find(
    (item: any) => item.zone_name === values.locality || item.zone_code === values.locality
  );
  const fallbackLocality = location && zones.length === 0 ? location.city || location.location_name : '';
  return {
    ...values,
    location_id: values.location_id || location?.id || '',
    country: location?.country || values.country,
    country_code: location?.country_code || values.country_code,
    state: location?.state || values.state,
    state_code: location?.state_code || values.state_code,
    city: location ? location.city || location.location_name : values.city,
    locality: zone?.zone_name || values.locality || fallbackLocality,
    postal_code: zone?.pincode || location?.location_pincode || values.postal_code,
  };
};

const toCategoryRow = (category: VenueCategoryEntry): AdminCategoryValue => ({
  super_id: category.super_category_id || '',
  super_name: category.super_category_name || '',
  category_id: category.category_id || '',
  category_name: category.category_name || '',
  sub_id: category.sub_category_id || '',
  sub_name: category.sub_category_name || '',
});

/** One picker row per category the venue has, primary first — read from
 * `venue_categories`, or from the lone `venue_category` of a venue stored
 * before the list existed. A venue with none starts on one blank row. */
const toCategoryRows = (venue: Parameters<typeof venueCategoryList>[0]): AdminCategoryValue[] => {
  const rows = venueCategoryList(venue).map(toCategoryRow);
  return rows.length > 0 ? rows : [{ ...EMPTY_CATEGORY }];
};

export function venueToValues(
  venue: any,
  locations: any[],
  account: { name: string; email: string }
): RegisterVenueValues {
  if (!venue) {
    return {
      ...blankRegisterVenueValues,
      venue_categories: toCategoryRows(null),
      owner_name: account.name,
      owner_email: account.email,
    };
  }
  const base: RegisterVenueValues = {
    venue_name: venue.venue_name || '',
    description: venue.description || '',
    cover_image_url: venue.cover_image_url || '',
    gallery: venue.gallery || [],
    videos: venue.videos || [],
    venue_categories: toCategoryRows(venue),
    address_line1: venue.address_line1 || '',
    address_line2: venue.address_line2 || '',
    location_id: venue.location_id || '',
    country: venue.country || 'India',
    country_code: venue.country_code || 'IN',
    state: venue.state || '',
    state_code: venue.state_code || '',
    city: venue.city || '',
    locality: venue.locality || '',
    postal_code: venue.postal_code || '',
    venue_type: venue.venue_type || '',
    capacity_items: (venue.capacity_items ?? []).map((item: any) => ({
      label: item.label,
      capacity: item.capacity,
    })),
    offers_food: Boolean(venue.offers_food),
    food_menu: (venue.food_menu ?? []).map(foodDishToValues),
    // What the server resolved — the venue's own GST, or Finance's default while it follows it.
    food_ordering: foodOrderingToValues(venue.food_ordering),
    food_licences: foodLicencesToValues(venue.food_licences),
    food_tables: foodTablesToValues(venue.food_tables),
    food_gstin: '',
    amenities: venue.amenities || [],
    facilities: venue.facilities || [],
    security: venue.security || [],
    documents: (venue.documents ?? []).map((doc: any) => ({ type: doc.type, url: doc.url })),
    gstin: venue.gstin || '',
    pan: venue.pan || '',
    has_gstin: Boolean(venue.gstin),
    has_pan: Boolean(venue.pan),
    owner_name: venue.owner_name || account.name,
    owner_email: account.email || venue.owner_email || '',
    owner_phone: venue.owner_phone || '',
    owner_dob: venue.owner_dob ? venue.owner_dob.slice(0, 10) : '',
    owner_address: venue.owner_address || '',
    payout_method: venue.bank_account?.payout_method || '',
    account_holder_name: venue.bank_account?.account_holder_name || '',
    account_number: venue.bank_account?.account_number || '',
    ifsc_code: venue.bank_account?.ifsc_code || '',
    upi_id: venue.bank_account?.upi_id || '',
  };
  return hydrateLocation(base, locations);
}

const toCapacityItems = (values: RegisterVenueValues) =>
  values.capacity_items
    .filter((item) => item.label.trim() || item.capacity !== '')
    .map((item) => ({ label: item.label.trim(), capacity: Number(item.capacity) || 0 }));

/** The food fields of a step-1 save or an approved venue's Food Menu save — the shared mapping
 * every venue form sends (the owner picks the Razorpay account here, so it is named). */
export const toFoodInput = (values: RegisterVenueValues) => toVenueFoodInput(values, { sendAccount: true });

export function toStep1Input(values: RegisterVenueValues) {
  const capacityItems = toCapacityItems(values);
  return {
    venue_name: values.venue_name,
    venue_type: values.venue_type,
    capacity: capacityItems.reduce((sum, item) => sum + item.capacity, 0),
    capacity_items: capacityItems,
    ...toFoodInput(values),
    // Primary first. Only whole triples go: a row still being picked is not a
    // category yet (the section's validation is what refuses to save one).
    venue_categories: values.venue_categories.filter(isCompleteCategory).map((category) => ({
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
    location_id: values.location_id || null,
    country: values.country,
    country_code: values.country_code,
    address_line1: values.address_line1,
    address_line2: values.address_line2,
    city: values.city,
    state: values.state,
    state_code: values.state_code,
    locality: values.locality,
    postal_code: values.postal_code,
  };
}

export function toStep2Input(values: RegisterVenueValues) {
  return {
    documents: values.documents
      .filter((doc) => doc.type && doc.url)
      .map((doc) => ({ type: doc.type, url: doc.url })),
    gstin: values.has_gstin ? values.gstin : '',
    pan: values.has_pan ? values.pan : '',
  };
}

/** The sections an approved venue can save through updateApprovedVenue. */
export type ApprovedSectionKey = 'details' | 'type-capacity' | 'food' | 'documents' | 'owner';

/** Payload for updateApprovedVenue — only the active section's editable
 * fields. Documents are append-only: rows past `originalDocCount` are the new
 * uploads (existing rows render locked, so indices below it never change).
 * The server leaves alone whatever a payload does not name, so a capacity save
 * carries no food keys and cannot touch the menu, and the other way round. */
export function toApprovedUpdateInput(
  section: ApprovedSectionKey,
  values: RegisterVenueValues,
  originalDocCount: number
) {
  if (section === 'details') {
    return {
      description: values.description,
      cover_image_url: values.cover_image_url,
      gallery: values.gallery,
      videos: values.videos,
    };
  }
  if (section === 'type-capacity') {
    return { capacity_items: toCapacityItems(values) };
  }
  if (section === 'food') {
    // A GST number goes only when the owner typed one; the server takes it only while the venue has none.
    const gstin = values.food_gstin.trim().toUpperCase();
    return { ...toFoodInput(values), ...(gstin ? { gstin } : {}) };
  }
  if (section === 'documents') {
    return {
      add_documents: values.documents
        .slice(originalDocCount)
        .filter((doc) => doc.type && doc.url)
        .map((doc) => ({ type: doc.type, url: doc.url })),
    };
  }
  return {
    owner_name: values.owner_name,
    owner_phone: values.owner_phone,
    owner_dob: values.owner_dob || null,
    owner_address: values.owner_address,
  };
}

export function toStep3Input(values: RegisterVenueValues, accountEmail: string) {
  const isUpi = values.payout_method === 'UPI';
  return {
    owner_name: values.owner_name,
    owner_email: accountEmail || values.owner_email,
    owner_phone: values.owner_phone,
    owner_dob: values.owner_dob || null,
    owner_address: values.owner_address,
    bank_account: {
      payout_method: values.payout_method || null,
      account_holder_name: values.account_holder_name,
      account_number: isUpi ? '' : values.account_number,
      ifsc_code: isUpi ? '' : values.ifsc_code.toUpperCase(),
      upi_id: isUpi ? values.upi_id : '',
    },
  };
}
