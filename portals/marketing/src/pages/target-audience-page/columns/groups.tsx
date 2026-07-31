import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { AudienceRow } from '../helpers';
import { dash, renderPerson, renderPush, renderRoles, yesNo } from './cells';
import type { AudienceColumnDeps } from './types';

type Column = DuncitColumn<AudienceRow>;

/**
 * No column carries a `filter`: every filter lives in the sidebar, which can
 * combine ten conditions at once where a column popover only ever shows one.
 */

/** Who they are. */
export const identityColumns = (): Column[] => [
  {
    field: 'first_name',
    headerName: 'Person',
    minWidth: 220,
    flex: 1,
    cellRenderer: renderPerson,
    valueGetter: (row) => row.full_name,
  },
  {
    field: 'phone',
    headerName: 'Phone',
    sortable: false,
    minWidth: 130,
    valueGetter: (row) => dash(row.phone),
  },
  {
    field: 'age',
    headerName: 'Age',
    width: 90,
    valueGetter: (row) => row.age ?? EM_DASH,
  },
];

/** Where they are — the browse-location fields, not the postal address. */
export const placeColumns = (): Column[] => [
  { field: 'city', headerName: 'City', minWidth: 130, valueGetter: (row) => dash(row.city) },
  { field: 'state', headerName: 'State', minWidth: 130, valueGetter: (row) => dash(row.state) },
  {
    field: 'zone',
    headerName: 'Zone',
    minWidth: 130,
    hide: true,
    valueGetter: (row) => dash(row.zone),
  },
  {
    field: 'pincode',
    headerName: 'Pincode',
    sortable: false,
    width: 120,
    hide: true,
    valueGetter: (row) => dash(row.pincode),
  },
  {
    field: 'country',
    headerName: 'Country',
    sortable: false,
    minWidth: 120,
    hide: true,
    valueGetter: (row) => dash(row.country),
  },
];

/** How you can reach them. */
export const reachColumns = (): Column[] => [
  {
    field: 'push_platform',
    headerName: 'Push reachable',
    sortable: false,
    minWidth: 160,
    cellRenderer: renderPush,
    valueGetter: (row) => row.push_platforms.join(', '),
  },
  {
    field: 'whatsapp',
    headerName: 'WhatsApp',
    sortable: false,
    width: 110,
    valueGetter: (row) => yesNo(row.whatsapp_reachable),
  },
  {
    field: 'role',
    headerName: 'Roles',
    sortable: false,
    minWidth: 160,
    cellRenderer: renderRoles,
    valueGetter: (row) => row.roles.join(', '),
  },
];

/** Rule 11: dates follow the admin-configured format, never a literal. */
export const activityColumns = (deps: Readonly<AudienceColumnDeps>): Column[] => [
  dateColumn<AudienceRow>({
    field: 'last_login_at',
    headerName: 'Last active',
    hide: false,
    width: 160,
    formatDate: deps.formatDate,
  }),
  dateColumn<AudienceRow>({
    field: 'created_at',
    headerName: 'Joined',
    hide: false,
    width: 160,
    formatDate: deps.formatDate,
  }),
];
