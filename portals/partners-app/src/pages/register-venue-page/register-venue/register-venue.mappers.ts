import { findSelectedLocation } from '../VenueLocationFields';
import { blankRegisterVenueValues, type RegisterVenueValues } from './register-venue.types';

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

export function venueToValues(
  venue: any | null,
  locations: any[],
  account: { name: string; email: string }
): RegisterVenueValues {
  if (!venue) {
    return {
      ...blankRegisterVenueValues,
      owner_name: account.name,
      owner_email: account.email,
    };
  }
  const base: RegisterVenueValues = {
    venue_name: venue.venue_name || '',
    description: venue.description || '',
    cover_image_url: venue.cover_image_url || '',
    gallery: venue.gallery || [],
    super_category_id: venue.venue_category?.super_category_id || '',
    category_id: venue.venue_category?.category_id || '',
    sub_category_id: venue.venue_category?.sub_category_id || '',
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
    documents: (venue.documents ?? []).map((doc: any) => ({ type: doc.type, url: doc.url })),
    gstin: venue.gstin || '',
    pan: venue.pan || '',
    owner_name: venue.owner_name || account.name,
    owner_email: account.email || venue.owner_email || '',
    owner_phone: venue.owner_phone || '',
    owner_dob: venue.owner_dob ? venue.owner_dob.slice(0, 10) : '',
    owner_address: venue.owner_address || '',
  };
  return hydrateLocation(base, locations);
}

const toCapacityItems = (values: RegisterVenueValues) =>
  values.capacity_items
    .filter((item) => item.label.trim() || item.capacity !== '')
    .map((item) => ({ label: item.label.trim(), capacity: Number(item.capacity) || 0 }));

export function toStep1Input(values: RegisterVenueValues) {
  const capacityItems = toCapacityItems(values);
  const hasCategory = values.super_category_id && values.category_id && values.sub_category_id;
  return {
    venue_name: values.venue_name,
    venue_type: values.venue_type,
    capacity: capacityItems.reduce((sum, item) => sum + item.capacity, 0),
    capacity_items: capacityItems,
    venue_category: hasCategory
      ? {
          super_category_id: values.super_category_id,
          category_id: values.category_id,
          sub_category_id: values.sub_category_id,
        }
      : null,
    description: values.description,
    cover_image_url: values.cover_image_url,
    gallery: values.gallery,
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
    documents: values.documents.filter((doc) => doc.type && doc.url),
    gstin: values.gstin,
    pan: values.pan,
  };
}

export function toStep3Input(values: RegisterVenueValues, accountEmail: string) {
  return {
    owner_name: values.owner_name,
    owner_email: accountEmail || values.owner_email,
    owner_phone: values.owner_phone,
    owner_dob: values.owner_dob || null,
    owner_address: values.owner_address,
  };
}
