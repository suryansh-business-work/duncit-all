import type { DuncitColumn } from '@duncit/table';
import type { AudienceRow } from '../helpers';
import { dash, yesNo } from './cells';

/** Account state — hidden by default; the sidebar is where these are filtered. */
export const accountColumns = (): DuncitColumn<AudienceRow>[] => [
  { field: 'status', headerName: 'Status', width: 110, valueGetter: (row) => dash(row.status) },
  {
    field: 'email_verified',
    headerName: 'Email verified',
    sortable: false,
    width: 140,
    hide: true,
    valueGetter: (row) => yesNo(row.email_verified),
  },
  {
    field: 'phone_verified',
    headerName: 'Phone verified',
    sortable: false,
    width: 140,
    hide: true,
    valueGetter: (row) => yesNo(row.phone_verified),
  },
  {
    field: 'locale',
    headerName: 'Language',
    width: 120,
    hide: true,
    valueGetter: (row) => dash(row.locale),
  },
  {
    field: 'last_login_provider',
    headerName: 'Signed in with',
    minWidth: 140,
    hide: true,
    valueGetter: (row) => dash(row.last_login_provider),
  },
];
