import { useCallback, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { MANUAL_TEST_CASES_TABLE } from '../shared/case.queries';
import type { ManualRow } from '../shared/types';
import NewCaseDialog from './NewCaseDialog';
import { useCaseTableColumns } from './useCaseTableColumns';

const getRowId = (row: ManualRow) => row.id;

/** Manual Testing > Cases — every case as a server-paged table, and "New case". */
export default function ManualCasesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const [creating, setCreating] = useState(false);
  const columns = useCaseTableColumns();
  const fetchRows = useApolloTableFetch<ManualRow>(client, MANUAL_TEST_CASES_TABLE, 'manualTestCasesTable');
  const open = useCallback(
    (row: ManualRow) => navigate(`/manual/cases/${encodeURIComponent(row.key)}`),
    [navigate]
  );

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('testsManual.cases.title')}
        subtitle={t('testsManual.cases.subtitle')}
        actions={
          <DuncitButton component={RouterLink} to="/manual/board" startIcon={<ViewKanbanOutlinedIcon />}>
            {t('testsManual.cases.board')}
          </DuncitButton>
        }
      />
      <DuncitTable<ManualRow>
        ariaLabel={t('testsManual.cases.title')}
        tableId="tests-manual-cases"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('testsManual.cases.empty')}
        defaultSort={{ field: 'updated_at', dir: 'desc' }}
        searchPlaceholder={t('testsManual.cases.searchPlaceholder')}
        refetchRef={refetchRef}
        onRowClick={open}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            {t('testsManual.cases.newCase')}
          </DuncitButton>
        }
      />
      {creating ? <NewCaseDialog onClose={() => setCreating(false)} /> : null}
    </Stack>
  );
}
