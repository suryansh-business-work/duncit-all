import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { PUSH_OPTIONS, type AudienceRow } from '../helpers';
import { dash, filterOnly, renderPerson, renderPush, renderRoles, yesNo } from './cells';
import type { AudienceColumnDeps } from './types';

type Column = DuncitColumn<AudienceRow>;

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
    // Age is derived from the birthdate server-side; the min/max control here
    // is translated into a date range by the audience service.
    field: 'age',
    headerName: 'Age',
    filter: { type: 'number' },
    width: 100,
    valueGetter: (row) => row.age ?? EM_DASH,
  },
];

/** Where they are — the browse-location fields, not the postal address. */
export const placeColumns = (deps: Readonly<AudienceColumnDeps>): Column[] => [
  {
    field: 'city',
    headerName: 'City',
    filter: { type: 'select', options: deps.cityOptions, multiple: true },
    minWidth: 130,
    valueGetter: (row) => dash(row.city),
  },
  {
    field: 'state',
    headerName: 'State',
    filter: { type: 'select', options: deps.stateOptions, multiple: true },
    minWidth: 130,
    valueGetter: (row) => dash(row.state),
  },
  {
    field: 'zone',
    headerName: 'Zone',
    filter: { type: 'select', options: deps.zoneOptions, multiple: true },
    minWidth: 130,
    hide: true,
    valueGetter: (row) => dash(row.zone),
  },
  {
    field: 'pincode',
    headerName: 'Pincode',
    filter: { type: 'text' },
    sortable: false,
    width: 120,
    hide: true,
    valueGetter: (row) => dash(row.pincode),
  },
  {
    field: 'country',
    headerName: 'Country',
    filter: { type: 'select', options: deps.countryOptions, multiple: true },
    sortable: false,
    minWidth: 120,
    hide: true,
    valueGetter: (row) => dash(row.country),
  },
];

/** How you can reach them, and what they care about. */
export const reachColumns = (deps: Readonly<AudienceColumnDeps>): Column[] => [
  {
    field: 'push_platform',
    headerName: 'Push reachable',
    filter: { type: 'select', options: PUSH_OPTIONS },
    sortable: false,
    minWidth: 160,
    cellRenderer: renderPush,
    valueGetter: (row) => row.push_platforms.join(', '),
  },
  {
    field: 'whatsapp',
    headerName: 'WhatsApp',
    filter: { type: 'boolean' },
    sortable: false,
    width: 120,
    valueGetter: (row) => yesNo(row.whatsapp_reachable),
  },
  {
    field: 'interest_category',
    headerName: 'Interest',
    filter: { type: 'select', options: deps.interestOptions, multiple: true },
    sortable: false,
    hide: true,
    minWidth: 160,
    valueGetter: filterOnly,
  },
  {
    field: 'role',
    headerName: 'Roles',
    filter: { type: 'select', options: deps.roleOptions, multiple: true },
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
