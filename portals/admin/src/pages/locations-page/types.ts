import { DEFAULT_LAUNCH_TARGET } from '@duncit/utils';

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
  /** Off: the app opens the city's launch waitlist instead of its feed. */
  is_launched: boolean;
  /** Kept as typed, so a half-edited number is not coerced mid-keystroke. */
  launch_target: string;
  whatsapp_group_url: string;
  zones: ZoneEdit[];
}

/** The launch target range the server accepts. */
const MAX_LAUNCH_TARGET = 1_000_000;
const WHATSAPP_GROUP_LINK = /^https:\/\/chat\.whatsapp\.com\/\S+$/;

/** Translation key for why the launch target cannot be saved; null when it can. */
export function launchTargetError(value: string): string | null {
  const target = Number(value);
  if (value.trim() && Number.isInteger(target) && target >= 1 && target <= MAX_LAUNCH_TARGET) {
    return null;
  }
  return 'admin.locations.launchTargetInvalid';
}

/** Translation key for why the group link cannot be saved; null when it can (it is optional). */
export function whatsappGroupUrlError(value: string): string | null {
  const link = value.trim();
  if (!link || WHATSAPP_GROUP_LINK.test(link)) return null;
  return 'admin.locations.whatsappGroupUrlInvalid';
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
  // The guards above already leave at least one zone, every one with a
  // pincode — cleanZones[0].pincode always exists once we get here.
  const primaryPincode = form.location_pincode.trim() || cleanZones[0].pincode!;

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
    // The dialog keeps Save disabled while either launch field is invalid.
    is_launched: form.is_launched,
    launch_target: Number(form.launch_target),
    whatsapp_group_url: form.whatsapp_group_url.trim(),
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
  is_launched: true,
  launch_target: String(DEFAULT_LAUNCH_TARGET),
  whatsapp_group_url: '',
  zones: [{ zone_name: '', zone_code: '', pincode: '' }],
};
