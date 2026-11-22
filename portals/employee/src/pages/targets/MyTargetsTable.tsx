import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, EM_DASH, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  EMPLOYEE_TARGET_STATUS_COLORS,
  EMPLOYEE_TARGET_STATUS_KEYS,
  employeeTargetStatusOptions,
  formatMonthKey,
  type EmployeeTargetRecord,
} from '@duncit/utils';
import { MY_EMPLOYEE_TARGETS_TABLE } from './queries';

const getRowId = (row: EmployeeTargetRecord) => row.id;

/** The employee's own months, newest first; a row opens that month's goals and report. */
export default function MyTargetsTable({ onOpen }: Readonly<{ onOpen: (row: EmployeeTargetRecord) => void }>) {
  const { t, locale } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<EmployeeTargetRecord>(client, MY_EMPLOYEE_TARGETS_TABLE, 'myEmployeeTargetsTable');

  const columns = useMemo<DuncitColumn<EmployeeTargetRecord>[]>(() => {
    const statusLabel = (row: EmployeeTargetRecord) => t(EMPLOYEE_TARGET_STATUS_KEYS[row.status]);
    return [
      {
        field: 'month',
        headerName: t('employeeTargets.col.month'),
        type: 'text',
        flex: 1,
        minWidth: 160,
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
        width: 150,
        options: employeeTargetStatusOptions(t),
        valueGetter: statusLabel,
        cellRenderer: (row) => <StatusChip status={row.status} colorMap={EMPLOYEE_TARGET_STATUS_COLORS} label={statusLabel(row)} />,
      },
      {
        field: 'completion_percent',
        headerName: t('employeeTargets.col.completion'),
        type: 'number',
        width: 130,
        valueGetter: (row) =>
          row.submission ? t('employeeTargets.submission.percent', { vars: { percent: row.submission.completion_percent } }) : EM_DASH,
      },
      dateColumn<EmployeeTargetRecord>({
        field: 'submitted_at',
        headerName: t('employeeTargets.col.submittedAt'),
        hide: false,
        width: 160,
        getDate: (row) => row.submission?.submitted_at ?? null,
      }),
    ];
  }, [t, locale]);

  return (
    <DuncitTable<EmployeeTargetRecord>
      ariaLabel={t('shell.nav.myTargets')}
      tableId="employee-my-targets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('employeeTargets.mine.empty')}
      defaultSort={{ field: 'month', dir: 'desc' }}
      searchPlaceholder={t('employeeTargets.mine.search')}
    />
  );
}
