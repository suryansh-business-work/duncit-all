import { formatDateTime as adminDateTime } from '@duncit/app-settings';

/** The admin's configured date-time pattern (rule 11), with a dash for "never". */
export function formatDateTime(iso?: string | null): string {
  return adminDateTime(iso) || '—';
}
