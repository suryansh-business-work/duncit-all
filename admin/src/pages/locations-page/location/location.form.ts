import * as yup from 'yup';

const POSTAL_CODE_PATTERN = /^[0-9A-Za-z -]{3,12}$/;

export const locationZoneSchema = yup.object({
  zone_name: yup.string().trim().max(80, 'Zone name must be 80 characters or fewer').default(''),
  zone_code: yup.string().trim().max(20, 'Zone code must be 20 characters or fewer').default(''),
  pincode: yup
    .string()
    .trim()
    .default('')
    .test('pin', 'Enter a valid PIN code (3–12 alphanumerics)', (value) => {
      if (!value) return true;
      return POSTAL_CODE_PATTERN.test(value);
    }),
});

export const locationFormSchema = yup.object({
  country: yup.string().trim().required('Country is required'),
  state: yup.string().trim().required('State is required'),
  location_name: yup
    .string()
    .trim()
    .min(2, 'Location name must be at least 2 characters')
    .max(120, 'Location name must be 120 characters or fewer')
    .required('Location name is required'),
  location_pincode: yup
    .string()
    .trim()
    .matches(POSTAL_CODE_PATTERN, 'Enter a valid primary PIN code (3–12 alphanumerics)')
    .required('Primary PIN code is required'),
  is_active: yup.boolean().default(true),
  location_image: yup
    .string()
    .trim()
    .min(1, 'Location image is required')
    .max(1000)
    .required('Location image is required'),
  zones: yup.array(locationZoneSchema).default([]),
});

export type LocationZoneValues = yup.InferType<typeof locationZoneSchema>;
export type LocationFormValues = yup.InferType<typeof locationFormSchema>;

export function toLocationInput(values: LocationFormValues) {
  const cast = locationFormSchema.cast(values, { stripUnknown: true });
  return {
    country: cast.country,
    state: cast.state,
    location_name: cast.location_name,
    location_pincode: cast.location_pincode,
    is_active: cast.is_active,
    location_image: cast.location_image,
    location_zones: (cast.zones ?? []).filter((zone) => zone.zone_name || zone.zone_code || zone.pincode),
  };
}
