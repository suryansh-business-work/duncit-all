import { format, isValid } from 'date-fns';

/** HH:mm for a message timestamp; empty string when missing or unparseable. */
export function formatMessageTime(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return isValid(date) ? format(date, 'HH:mm') : '';
}
