import * as yup from 'yup';

export const locationSelectFormSchema = yup.object({
  city: yup
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(80, 'City must be 80 characters or fewer')
    .required('City is required'),
  zone: yup
    .string()
    .trim()
    .min(2, 'Zone must be at least 2 characters')
    .max(80, 'Zone must be 80 characters or fewer')
    .required('Zone is required'),
});

export type LocationSelectFormValues = yup.InferType<typeof locationSelectFormSchema>;

export const locationSelectInitialValues: LocationSelectFormValues = { city: '', zone: '' };

export function toLocationSelectInput(values: LocationSelectFormValues) {
  return locationSelectFormSchema.cast(values, { stripUnknown: true });
}
