import type { FormikErrors, FormikTouched } from 'formik';
import type { ContactActionValues, ContactType } from '../contact-action.form';

export function buildContactTarget(type: ContactType, user: any) {
  if (type === 'CALL') return `${user.phone_extension || ''}${user.phone_number || ''}`.trim();
  return user.email || '';
}

export function openNativeContact(type: ContactType, target: string, subject: string) {
  if (!target) return;
  const url = type === 'CALL' ? `tel:${target}` : `mailto:${target}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  window.open(url, '_self');
}

export function shouldShowContactError(
  values: ContactActionValues,
  errors: FormikErrors<ContactActionValues>,
  touched: FormikTouched<ContactActionValues>,
  submitCount: number,
  key: keyof ContactActionValues,
) {
  const value = values[key];
  const hasValue = typeof value === 'number' ? value > 0 : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || hasValue));
}