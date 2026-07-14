export interface ZoneEdit {
  zone_name: string;
  zone_code: string;
  pincode: string;
}

export interface LocForm {
  id?: string;
  location_id: string;
  location_name: string;
  country: string;
  country_code: string;
  state: string;
  state_code: string;
  city: string;
  location_image: string;
  location_pincode: string;
  is_active: boolean;
  zones: ZoneEdit[];
}

/** Validates the dialog form and shapes the create/update mutation input.
 * Throws Error with a user-facing message on the first failed rule. */
export function buildLocationInput(form: LocForm) {
  const cleanZones = form.zones
    .map((z) => ({
      zone_name: z.zone_name.trim(),
      pincode: z.pincode.trim() || undefined,
    }))
    .filter((z) => z.zone_name);

  if (!form.country_code.trim()) throw new Error('Country is required');
  if (!form.state.trim()) throw new Error('State is required');
  if (!form.city.trim()) throw new Error('City is required');
  if (cleanZones.length === 0) throw new Error('At least one locality / area is required');
  if (cleanZones.some((zone) => !zone.pincode)) {
    throw new Error('PIN code is required for every locality / area');
  }
  if (!form.location_image.trim()) throw new Error('Location image URL is required');
  const primaryPincode = form.location_pincode.trim() || cleanZones[0]?.pincode || '';
  if (!primaryPincode) throw new Error('PIN code is required');

  return {
    location_name: form.city.trim(),
    country: form.country,
    country_code: form.country_code,
    state: form.state,
    state_code: form.state_code,
    city: form.city,
    location_image: form.location_image,
    location_pincode: primaryPincode,
    location_zones: cleanZones,
  };
}

export const blankForm: LocForm = {
  location_id: '',
  location_name: '',
  country: 'India',
  country_code: 'IN',
  state: '',
  state_code: '',
  city: '',
  location_image: '',
  location_pincode: '',
  is_active: true,
  zones: [{ zone_name: '', zone_code: '', pincode: '' }],
};
