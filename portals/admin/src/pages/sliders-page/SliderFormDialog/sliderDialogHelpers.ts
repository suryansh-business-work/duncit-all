import type { FieldErrors } from 'react-hook-form';
import type { SliderForm } from '../queries';

export function fieldError(
  values: SliderForm,
  errors: FieldErrors<SliderForm>,
  submitCount: number,
  key: keyof SliderForm,
) {
  const value = values[key];
  const hasValue = typeof value === 'boolean' || typeof value === 'number' ? true : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || hasValue));
}

export function firstNestedError(errors: FieldErrors<SliderForm>) {
  const skip = new Set(['title', 'media_url', 'sort_order', 'starts_at', 'ends_at']);
  return Object.entries(errors)
    .filter(([key]) => !skip.has(key))
    .map(([, entry]) => (typeof entry?.message === 'string' ? entry.message : null))
    .find(Boolean);
}
