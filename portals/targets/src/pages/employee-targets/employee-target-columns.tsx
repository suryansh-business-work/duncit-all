import { Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ReplayIcon from '@mui/icons-material/Replay';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { EM_DASH, dateColumn, rowMenuColumn, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  EMPLOYEE_TARGET_STATUS_COLORS,
  EMPLOYEE_TARGET_STATUS_KEYS,
  employeeTargetStatusOptions,
  canEditTargetGoals,
  formatMonthKey,
  type EmployeeTargetRecord,
} from '@duncit/utils';
import type { Translate } from './assign-target/assign-target.types';

export interface TargetRowActions {
  onView: (row: EmployeeTargetRecord) => void;
  onEdit: (row: EmployeeTargetRecord) => void;
  onReopen: (row: EmployeeTargetRecord) => void;
  onDelete: (row: EmployeeTargetRecord) => void;
}

interface ColumnArgs extends TargetRowActions {
  t: Translate;
  locale: string;
  formatDateTime: (iso: string) => string;
}

const renderEmployee = (row: EmployeeTargetRecord) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 600 }}>
      {row.employee.name || EM_DASH}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.employee.email ?? ''}
    </Typography>
  </Stack>
);

/**
 * The Employee Targets columns. Fields are the server's sort and filter keys
 * (employeeTargetsTable), so filtering by month or status runs over every
 * assignment, not just the page on screen.
 */
export function getTargetColumns({ t, locale, formatDateTime, ...actions }: ColumnArgs): DuncitColumn<EmployeeTargetRecord>[] {
  const statusLabel = (row: EmployeeTargetRecord) => t(EMPLOYEE_TARGET_STATUS_KEYS[row.status]);
  const percent = (row: EmployeeTargetRecord) =>
    row.submission ? t('employeeTargets.submission.percent', { vars: { percent: row.submission.completion_percent } }) : EM_DASH;
  return [
    {
      field: 'employee_name',
      headerName: t('employeeTargets.col.employee'),
      type: 'text',
      flex: 1,
      minWidth: 200,
      valueGetter: (row) => row.employee.name,
      cellRenderer: renderEmployee,
    },
    {
      field: 'month',
      headerName: t('employeeTargets.col.month'),
      type: 'text',
      width: 160,
      // Filtered by the month picker above the table, which sends the exact YYYY-MM key.
      filterable: false,
      valueGetter: (row) => formatMonthKey(row.month, locale),
    },
    {
      field: 'goal_count',
      headerName: t('employeeTargets.col.goals'),
      type: 'number',
      width: 100,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.goal_count,
    },
    {
      field: 'status',
      headerName: t('employeeTargets.col.status'),
      type: 'enum',
      width: 140,
      options: employeeTargetStatusOptions(t),
      valueGetter: statusLabel,
      cellRenderer: (row) => <StatusChip status={row.status} colorMap={EMPLOYEE_TARGET_STATUS_COLORS} label={statusLabel(row)} />,
    },
    {
      field: 'completion_percent',
      headerName: t('employeeTargets.col.completion'),
      type: 'number',
      width: 130,
      valueGetter: percent,
    },
    dateColumn<EmployeeTargetRecord>({
      field: 'submitted_at',
      headerName: t('employeeTargets.col.submittedAt'),
      hide: false,
      width: 180,
      getDate: (row) => row.submission?.submitted_at ?? null,
      formatDate: (date) => formatDateTime(date.toISOString()),
    }),
    rowMenuColumn<EmployeeTargetRecord>({
      ariaLabel: (row) => t('employeeTargets.admin.rowActions', { vars: { name: row.employee.name } }),
      items: (row) => [
        { key: 'view', label: t('employeeTargets.admin.view'), icon: <VisibilityIcon fontSize="small" />, onClick: () => actions.onView(row) },
        {
          key: 'edit',
          label: t('employeeTargets.admin.editGoals'),
          icon: <EditIcon fontSize="small" />,
          disabled: !canEditTargetGoals(row.status),
          onClick: () => actions.onEdit(row),
        },
        {
          key: 'reopen',
          label: t('employeeTargets.admin.reopen'),
          icon: <ReplayIcon fontSize="small" />,
          disabled: row.status !== 'REVIEWED',
          onClick: () => actions.onReopen(row),
        },
        {
          key: 'delete',
          label: t('employeeTargets.admin.delete'),
          icon: <DeleteOutlineIcon fontSize="small" />,
          destructive: true,
          onClick: () => actions.onDelete(row),
        },
      ],
    }),
  ];
}
