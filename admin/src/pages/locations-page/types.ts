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
