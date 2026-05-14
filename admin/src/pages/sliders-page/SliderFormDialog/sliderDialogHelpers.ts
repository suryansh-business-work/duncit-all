import type { FormikErrors, FormikTouched } from 'formik';
import type { SliderForm } from '../queries';

export function fieldError(
  values: SliderForm,
  errors: FormikErrors<SliderForm>,
  touched: FormikTouched<SliderForm>,
  submitCount: number,
  key: keyof SliderForm,
) {
  const value = values[key];
  const hasValue = typeof value === 'boolean' || typeof value === 'number' ? true : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || hasValue));
}

export function firstNestedError(errors: FormikErrors<SliderForm>) {
  return Object.entries(errors)
    .filter(([key]) => !['title', 'media_url', 'sort_order', 'starts_at', 'ends_at'].includes(key))
    .map(([, message]) => (typeof message === 'string' ? message : null))
    .find(Boolean);
}