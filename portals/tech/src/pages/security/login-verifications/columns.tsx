import { Chip, Stack, Typography } from '@mui/material';
import { EM_DASH, type DuncitColumn, type Translate } from '@duncit/table';
import { ChipList, StatusChip } from '@duncit/ui';
import EmployeeChip from '../EmployeeChip';
import { METHOD_KEY, RESULT_COLOR, RESULT_KEY, enumLabel, enumOptions, joinParts, orDash, timeOf } from '../labels';
import type { LogRow } from './queries';

// Cells that need no copy live at module scope, so a re-render does not hand the
// grid a new component type per column (S6478). The ones that read copy are
// written inline in the builder, which already holds `t`.
const renderPerson = (row: LogRow) => (
  <Stack sx={{ minWidth: 0 }}>
    <Typography variant="subtitle2" noWrap>
      {row.user_name || row.user_email}
    </Typography>
    <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
      {row.user_email}
    </Typography>
  </Stack>
);

const renderEmployee = (row: LogRow) => (
  <Stack sx={{ alignItems: 'flex-start', gap: 0.25, minWidth: 0 }}>
    <EmployeeChip isEmployee={row.is_employee} />
    {row.employee_title && (
      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', maxWidth: '100%' }}>
        {row.employee_title}
      </Typography>
    )}
  </Stack>
);

const renderRoles = (row: LogRow) => <ChipList items={row.roles} empty={EM_DASH} />;

/**
 * The log table's columns.
 *
 * Only what the server can answer is offered to sort or filter on: an address
 * and a position are sealed on the server, so the masked address, the roles and
 * the device are shown but never searched by column. (The search box does find
 * an exact address.) A control the server silently ignores would look like a
 * filter that matched nothing.
 */
export function buildLogColumns(t: Translate): DuncitColumn<LogRow>[] {
  const yes = t('shell.common.yes');
  const no = t('shell.common.no');
  return [
    {
      field: 'created_at',
      headerName: t('tech.loginVerifications.colTime'),
      width: 190,
      type: 'date',
      valueGetter: (row) => timeOf(row.created_at),
    },
    {
      field: 'user_name',
      headerName: t('tech.loginVerifications.colPerson'),
      flex: 1,
      minWidth: 230,
      type: 'text',
      filterable: false,
      cellRenderer: renderPerson,
      valueGetter: (row) => joinParts([row.user_name, row.user_email], ' · '),
    },
    {
      field: 'is_employee',
      headerName: t('tech.loginVerifications.colEmployee'),
      width: 180,
      type: 'boolean',
      cellRenderer: renderEmployee,
    },
    {
      field: 'roles',
      headerName: t('tech.loginVerifications.colRoles'),
      width: 220,
      type: 'text',
      sortable: false,
      filterable: false,
      cellRenderer: renderRoles,
      valueGetter: (row) => row.roles.join(', '),
    },
    { field: 'portal_key', headerName: t('tech.loginVerifications.colPortal'), width: 140, type: 'text' },
    {
      field: 'result',
      headerName: t('tech.loginVerifications.colResult'),
      width: 190,
      type: 'enum',
      options: enumOptions(t, RESULT_KEY),
      cellRenderer: (row) => (
        <StatusChip status={row.result} colorMap={RESULT_COLOR} label={enumLabel(t, RESULT_KEY, row.result)} />
      ),
      valueGetter: (row) => enumLabel(t, RESULT_KEY, row.result),
    },
    {
      field: 'method',
      headerName: t('tech.loginVerifications.colMethod'),
      width: 200,
      type: 'enum',
      options: enumOptions(t, METHOD_KEY),
      sortable: false,
      valueGetter: (row) => enumLabel(t, METHOD_KEY, row.method),
    },
    {
      field: 'ip_masked',
      headerName: t('tech.loginVerifications.colIp'),
      width: 150,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (row) => orDash(row.ip_masked),
    },
    {
      field: 'ip_country',
      headerName: t('tech.loginVerifications.colPlace'),
      flex: 1,
      minWidth: 200,
      type: 'text',
      valueGetter: (row) => joinParts([row.ip_city, row.ip_region, row.ip_country], ', '),
    },
    {
      field: 'has_location',
      headerName: t('tech.loginVerifications.colLocation'),
      width: 170,
      type: 'boolean',
      sortable: false,
      cellRenderer: (row) => (
        <Chip
          size="small"
          variant="outlined"
          color={row.has_location ? 'success' : 'default'}
          label={row.has_location ? yes : no}
        />
      ),
    },
    {
      field: 'browser',
      headerName: t('tech.loginVerifications.colDevice'),
      flex: 1,
      minWidth: 200,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (row) => joinParts([row.browser, row.os], ' · '),
    },
  ];
}
