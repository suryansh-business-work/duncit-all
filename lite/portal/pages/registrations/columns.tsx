import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { SITE_URL } from '../../../shared/env';
import type { usePortalT } from '../../../shared/i18n';
import { EnumChip } from '../../components/EnumChip';
import { ExternalLink } from '../../components/ExternalLink';
import {
  enumLabel,
  enumOptions,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_KEYS,
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_KEYS,
} from '../../components/enum-labels';
import type { LiteAdminRegistrationRow } from '../../graphql/registrations';

type Translate = ReturnType<typeof usePortalT>['t'];

export const registrationRowId = (row: LiteAdminRegistrationRow): string => row.id;

/** Sort keys are the server's denormalised copies (`user_name`, `event_title`); the rest read off the nested objects. */
export function buildRegistrationColumns(t: Translate): DuncitColumn<LiteAdminRegistrationRow>[] {
  return [
    { field: 'user_name', headerName: t('litePortal.registrations.colGuest'), type: 'text', flex: 1, minWidth: 160, filterable: false, valueGetter: (row) => row.user.name },
    { field: 'user.email', headerName: t('litePortal.registrations.colEmail'), type: 'text', flex: 1, minWidth: 200, sortable: false, filterable: false },
    {
      field: 'event_title',
      headerName: t('litePortal.registrations.colEvent'),
      type: 'text',
      flex: 1,
      minWidth: 200,
      filterable: false,
      cellRenderer: (row) => (
        <ExternalLink
          href={`${SITE_URL}/e/${row.event.slug}`}
          label={row.event.title}
          ariaLabel={t('litePortal.common.viewOnSite', { vars: { name: row.event.title } })}
          testId={`registration-event-${row.id}`}
        />
      ),
      valueGetter: (row) => row.event.title,
    },
    { field: 'ticket.name', headerName: t('litePortal.registrations.colTicket'), type: 'text', width: 140, sortable: false, filterable: false },
    { field: 'quantity', headerName: t('litePortal.registrations.colQuantity'), type: 'number', width: 80, sortable: false, filterable: false },
    { field: 'amount_due', headerName: t('litePortal.registrations.colAmount'), type: 'number', width: 130, valueGetter: (row) => formatMoney(row.amount_due) },
    {
      field: 'status',
      headerName: t('litePortal.registrations.colStatus'),
      type: 'enum',
      options: enumOptions(REGISTRATION_STATUS_KEYS, t),
      width: 150,
      cellRenderer: (row) => <EnumChip value={row.status} keys={REGISTRATION_STATUS_KEYS} colors={REGISTRATION_STATUS_COLORS} />,
      valueGetter: (row) => enumLabel(REGISTRATION_STATUS_KEYS, row.status, t),
    },
    {
      field: 'payment_status',
      headerName: t('litePortal.registrations.colPayment'),
      type: 'enum',
      options: enumOptions(PAYMENT_STATUS_KEYS, t),
      width: 150,
      cellRenderer: (row) => <EnumChip value={row.payment_status} keys={PAYMENT_STATUS_KEYS} colors={PAYMENT_STATUS_COLORS} />,
      valueGetter: (row) => enumLabel(PAYMENT_STATUS_KEYS, row.payment_status, t),
    },
    { field: 'payment_reference', headerName: t('litePortal.registrations.colReference'), type: 'text', width: 150, sortable: false, filterable: false, valueGetter: (row) => row.payment_reference ?? EM_DASH },
    { field: 'code', headerName: t('litePortal.registrations.colCode'), type: 'text', width: 110, sortable: false, filterable: false },
    dateColumn({ headerName: t('litePortal.common.created'), hide: false }),
  ];
}
