import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { formatDay } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { HrEmployeeRecord } from '@duncit/utils';
import { HR_EMPLOYEES_TABLE } from '../../../lib/employee-queries';
import { getEmployeeColumns } from './employee-columns';

const getRowId = (row: HrEmployeeRecord) => row.id;

/** Every employment record, newest joiners first; a row opens the profile. Search, sort and filters run on the server. */
export default function EmployeesTable() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<HrEmployeeRecord>(client, HR_EMPLOYEES_TABLE, 'hrEmployeesTable');
  const columns = useMemo(() => getEmployeeColumns(t, formatDay), [t]);

  return (
    <DuncitTable<HrEmployeeRecord>
      ariaLabel={t('hrEmployee.list.title')}
      tableId="hr-employees"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={(row) => navigate(`/employees/${row.id}`)}
      emptyText={t('hrEmployee.list.empty')}
      defaultSort={{ field: 'date_of_joining', dir: 'desc' }}
      searchPlaceholder={t('hrEmployee.list.search')}
    />
  );
}
