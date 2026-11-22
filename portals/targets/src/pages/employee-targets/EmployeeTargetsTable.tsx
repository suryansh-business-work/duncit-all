import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { EmployeeTargetRecord } from '@duncit/utils';
import { EMPLOYEE_TARGETS_TABLE } from '../../lib/employee-target-queries';
import { getTargetColumns, type TargetRowActions } from './employee-target-columns';

const getRowId = (row: EmployeeTargetRecord) => row.id;

interface Props extends TargetRowActions {
  refetchRef: MutableRefObject<(() => void) | null>;
  /** The month picked above the table (`YYYY-MM`), or null for every month. */
  month: string | null;
}

/**
 * Every live assignment, newest month first. Search, sort, filters and paging
 * are answered by the server; the month picker pins an exact-month filter.
 * Clicking a row opens its goals, report and review.
 */
export default function EmployeeTargetsTable({ refetchRef, month, ...actions }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<EmployeeTargetRecord>(client, EMPLOYEE_TARGETS_TABLE, 'employeeTargetsTable');
  const { onView, onEdit, onReopen, onDelete } = actions;
  const columns = useMemo(
    () => getTargetColumns({ t, locale, formatDateTime, onView, onEdit, onReopen, onDelete }),
    [t, locale, formatDateTime, onView, onEdit, onReopen, onDelete]
  );
  const externalFilters = useMemo<TableFilterValue[]>(
    () => (month ? [{ field: 'month', op: 'eq', value: month }] : []),
    [month]
  );

  return (
    <DuncitTable<EmployeeTargetRecord>
      ariaLabel={t('employeeTargets.admin.title')}
      tableId="targets-employee-targets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onView}
      externalFilters={externalFilters}
      emptyText={t('employeeTargets.admin.empty')}
      defaultSort={{ field: 'month', dir: 'desc' }}
      searchPlaceholder={t('employeeTargets.admin.search')}
      refetchRef={refetchRef}
    />
  );
}
