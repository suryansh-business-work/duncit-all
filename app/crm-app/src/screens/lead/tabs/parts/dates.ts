import { formatDate } from '@duncit/datetime';

/** A day in the admin-configured date format (the portal's `formatDate`); empty when there is none. */
export const displayDate = (iso: string | null | undefined): string =>
  iso ? formatDate(iso) || '' : '';
