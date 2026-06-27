import type { ContactType } from '../contact-action.form';

export function buildContactTarget(type: ContactType, user: any) {
  if (type === 'CALL') return `${user.phone_extension || ''}${user.phone_number || ''}`.trim();
  return user.email || '';
}

export function openNativeContact(type: ContactType, target: string, subject: string) {
  if (!target) return;
  const url =
    type === 'CALL'
      ? `tel:${target}`
      : `mailto:${target}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  globalThis.open(url, '_self');
}
