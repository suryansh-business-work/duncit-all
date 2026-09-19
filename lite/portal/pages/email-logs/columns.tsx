import { formatDateTime } from '@duncit/app-settings';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { usePortalT } from '../../../shared/i18n';
import { EnumChip } from '../../components/EnumChip';
import { EMAIL_STATUS_COLORS, EMAIL_STATUS_KEYS, enumLabel, enumOptions } from '../../components/enum-labels';
import type { LiteEmailLogRow } from '../../graphql/email';

type Translate = ReturnType<typeof usePortalT>['t'];

export const emailLogRowId = (row: LiteEmailLogRow): string => row.id;

export function buildEmailLogColumns(t: Translate): DuncitColumn<LiteEmailLogRow>[] {
  return [
    { field: 'to', headerName: t('litePortal.emailLogs.colTo'), type: 'text', flex: 1, minWidth: 200 },
    { field: 'subject', headerName: t('litePortal.emailLogs.colSubject'), type: 'text', flex: 2, minWidth: 240 },
    { field: 'template_key', headerName: t('litePortal.emailLogs.colTemplate'), type: 'text', width: 200 },
    {
      field: 'status',
      headerName: t('litePortal.emailLogs.colStatus'),
      type: 'enum',
      options: enumOptions(EMAIL_STATUS_KEYS, t),
      width: 120,
      cellRenderer: (row) => <EnumChip value={row.status} keys={EMAIL_STATUS_KEYS} colors={EMAIL_STATUS_COLORS} />,
      valueGetter: (row) => enumLabel(EMAIL_STATUS_KEYS, row.status, t),
    },
    { field: 'error', headerName: t('litePortal.emailLogs.colError'), type: 'text', flex: 1, minWidth: 160, sortable: false, filterable: false, valueGetter: (row) => row.error ?? EM_DASH },
    dateColumn({ headerName: t('litePortal.emailLogs.colSent'), hide: false, width: 180, formatDate: formatDateTime }),
  ];
}
