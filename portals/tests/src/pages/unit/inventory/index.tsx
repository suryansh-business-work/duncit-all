import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useApolloTableFetch } from '@duncit/table';
import FilesTable from '../components/FilesTable';
import { UNIT_INVENTORY, UNIT_INVENTORY_SUMMARY, type InventorySummary as Summary, type UnitFileRow } from '../queries';
import InventorySummary from './InventorySummary';

/**
 * Unit Tests → Mocks & Cypress: every test file the latest finished run saw —
 * Vitest, Jest, and the Cypress specs no unit run executes — with what each
 * one mocks. The table and the summary read the same run.
 */
export default function UnitInventoryPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const summary = useQuery<{ unitTestInventorySummary: Summary | null }>(UNIT_INVENTORY_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const fetchRows = useApolloTableFetch<UnitFileRow>(client, UNIT_INVENTORY, 'unitTestInventory');
  const data = summary.data?.unitTestInventorySummary ?? null;
  const noRun = !summary.loading && !summary.error && !data;

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t('testsUnit.inventory.title')} subtitle={t('testsUnit.inventory.subtitle')} />
      <QueryGuard loading={summary.loading && !data} error={summary.error} errorText={t('testsUnit.common.loadFailed')}>
        {noRun ? <Alert severity="info">{t('testsUnit.inventory.noRun')}</Alert> : null}
        {data ? <InventorySummary summary={data} /> : null}
      </QueryGuard>
      {!noRun && <FilesTable tableId="tests-unit-inventory" fetchRows={fetchRows} />}
    </Stack>
  );
}
