import type { DuncitColumn } from '@duncit/table';
import {
  PROVIDER_OPTIONS,
  STATUS_OPTIONS,
  VISIBILITY_OPTIONS,
  type AudienceRow,
} from '../helpers';
import { dash, filterOnly, yesNo } from './cells';

/** Account state — mostly hidden by default, all filterable. */
export const accountColumns = (): DuncitColumn<AudienceRow>[] => [
  {
    field: 'status',
    headerName: 'Status',
    filter: { type: 'select', options: STATUS_OPTIONS },
    width: 120,
    valueGetter: (row) => dash(row.status),
  },
  {
    field: 'email_verified',
    headerName: 'Email verified',
    filter: { type: 'boolean' },
    sortable: false,
    width: 140,
    hide: true,
    valueGetter: (row) => yesNo(row.email_verified),
  },
  {
    field: 'phone_verified',
    headerName: 'Phone verified',
    filter: { type: 'boolean' },
    sortable: false,
    width: 140,
    hide: true,
    valueGetter: (row) => yesNo(row.phone_verified),
  },
  {
    field: 'locale',
    headerName: 'Language',
    filter: { type: 'text' },
    width: 120,
    hide: true,
    valueGetter: (row) => dash(row.locale),
  },
  {
    field: 'last_login_provider',
    headerName: 'Signed in with',
    filter: { type: 'select', options: PROVIDER_OPTIONS },
    minWidth: 140,
    hide: true,
    valueGetter: (row) => dash(row.last_login_provider),
  },
  {
    field: 'profile_visibility',
    headerName: 'Profile',
    filter: { type: 'select', options: VISIBILITY_OPTIONS },
    sortable: false,
    width: 120,
    hide: true,
    valueGetter: filterOnly,
  },
  {
    field: 'survey_completed',
    headerName: 'Survey done',
    filter: { type: 'boolean' },
    sortable: false,
    width: 130,
    hide: true,
    valueGetter: filterOnly,
  },
  {
    field: 'first_time_user',
    headerName: 'Never engaged',
    filter: { type: 'boolean' },
    sortable: false,
    width: 140,
    hide: true,
    valueGetter: filterOnly,
  },
];
