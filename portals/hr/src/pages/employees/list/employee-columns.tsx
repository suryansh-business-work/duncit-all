import { Stack, Typography } from '@mui/material';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYEE_STATUS_COLORS,
  HR_EMPLOYEE_STATUS_KEYS,
  HR_EMPLOYMENT_TYPES,
  HR_EMPLOYMENT_TYPE_KEYS,
  hrOptions,
  type HrEmployeeRecord,
} from '@duncit/utils';
import type { Translate } from '../fields/employee-fields.types';

const renderEmployee = (row: HrEmployeeRecord) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 600 }}>
      {row.full_name}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.employee_code}
    </Typography>
  </Stack>
);

/**
 * The directory's columns. Fields are the server's sort and filter keys
 * (hrEmployeesTable), so a filter runs over every record, not just the page.
 */
export function getEmployeeColumns(t: Translate, formatDay: (day: string) => string): DuncitColumn<HrEmployeeRecord>[] {
  return [
    { field: 'full_name', headerName: t('hrEmployee.list.colEmployee'), type: 'text', flex: 1, minWidth: 200, valueGetter: (row) => row.full_name, cellRenderer: renderEmployee },
    { field: 'job_title', headerName: t('hrEmployee.list.colTitle'), type: 'text', minWidth: 170, flex: 1, valueGetter: (row) => row.job.job_title },
    { field: 'department', headerName: t('hrEmployee.list.colDepartment'), type: 'text', width: 150, valueGetter: (row) => row.job.department ?? EM_DASH },
    {
      field: 'manager',
      headerName: t('hrEmployee.list.colManager'),
      type: 'text',
      width: 170,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.job.manager?.name ?? EM_DASH,
    },
    {
      field: 'employment_type',
      headerName: t('hrEmployee.list.colType'),
      type: 'enum',
      width: 130,
      options: hrOptions(HR_EMPLOYMENT_TYPES, HR_EMPLOYMENT_TYPE_KEYS, t),
      valueGetter: (row) => t(HR_EMPLOYMENT_TYPE_KEYS[row.job.employment_type]),
    },
    {
      field: 'date_of_joining',
      headerName: t('hrEmployee.list.colJoined'),
      type: 'text',
      width: 140,
      filterable: false,
      valueGetter: (row) => formatDay(row.job.date_of_joining),
    },
    {
      field: 'status',
      headerName: t('hrEmployee.list.colStatus'),
      type: 'enum',
      width: 130,
      options: hrOptions(HR_EMPLOYEE_STATUSES, HR_EMPLOYEE_STATUS_KEYS, t),
      valueGetter: (row) => t(HR_EMPLOYEE_STATUS_KEYS[row.status]),
      cellRenderer: (row) => <StatusChip status={row.status} colorMap={HR_EMPLOYEE_STATUS_COLORS} label={t(HR_EMPLOYEE_STATUS_KEYS[row.status])} />,
    },
  ];
}
