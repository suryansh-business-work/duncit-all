import type { LiteRegistration } from '../../../../shared/graphql/documents';
import { downloadText, toCsv } from '../../../lib/csv';
import type { Translate } from '../../../lib/validation';

const COLUMNS = ['name', 'email', 'ticket', 'quantity', 'status', 'payment', 'reference', 'checkedIn', 'code', 'registered'] as const;

/** The guest list as a spreadsheet, with the column names in the host's language. */
export function exportGuestsCsv(rows: readonly LiteRegistration[], eventSlug: string, t: Translate): void {
  const header = COLUMNS.map((column) => t(`liteWeb.manage.guests.columns.${column}`));
  const body = rows.map((row) => [
    row.user.name,
    row.user.email,
    row.ticket.name,
    row.quantity,
    t(`lite.status.${row.status}`),
    t(`lite.payment.${row.payment_status}`),
    row.payment_reference ?? '',
    row.checked_in_at ?? '',
    row.code,
    row.created_at,
  ]);
  downloadText(`${eventSlug}-guests.csv`, toCsv([header, ...body]));
}
