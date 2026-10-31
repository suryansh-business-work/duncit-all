import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatDay, useTranslation } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { AnalyticsGranularity, ProductCohortBasis } from '@duncit/gql-types';
import ProductPage from '../ProductPage';
import { PAGE_COPY } from '../page-copy';
import ProductFilterBar from '../ProductFilterBar';
import { useProductFilter } from '../useProductFilter';
import { PRODUCT_RETENTION } from '../queries';
import { cohortColumns, type CohortRow } from './cohort-columns';

const AVERAGE_ID = 'average';

/**
 * Analytics > Product > Retention — of the people who started in each day or
 * week of the period (first seen in the app, or signed up), the share who came
 * back N days or weeks later.
 */
export default function RetentionPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { period, setPeriod, filter } = useProductFilter();
  const [basis, setBasis] = useState<ProductCohortBasis>('FIRST_SEEN');
  const [granularity, setGranularity] = useState<AnalyticsGranularity>('WEEK');
  const { data, loading, error } = useQuery(PRODUCT_RETENTION, { variables: { basis, granularity, filter } });
  const table = data?.productRetention;
  const rows = useMemo<CohortRow[]>(() => {
    if (!table) return [];
    const average = { id: AVERAGE_ID, cohort: AVERAGE_ID, size: table.rows.reduce((sum, row) => sum + row.size, 0), retained: table.average };
    return [average, ...table.rows.map((row) => ({ id: row.cohort, ...row }))];
  }, [table]);
  const columns = useMemo(
    () =>
      cohortColumns(t, theme, table?.offsets ?? [], table?.granularity === 'DAY', (row) =>
        row.id === AVERAGE_ID ? t('analytics.product.retention.average') : formatDay(row.cohort)
      ),
    [t, theme, table]
  );
  const fetchRows = useMemo(() => clientTableFetch(rows, (row) => row.cohort, columns), [rows, columns]);
  const controls = (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
      <ProductFilterBar value={period} onChange={setPeriod} />
      <ToggleButtonGroup size="small" exclusive value={basis} onChange={(_e, next: ProductCohortBasis | null) => next && setBasis(next)} aria-label={t('analytics.product.retention.basis')}>
        <ToggleButton value="FIRST_SEEN">{t('analytics.product.retention.firstSeen')}</ToggleButton>
        <ToggleButton value="SIGNED_UP">{t('analytics.product.retention.signedUp')}</ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup size="small" exclusive value={granularity} onChange={(_e, next: AnalyticsGranularity | null) => next && setGranularity(next)} aria-label={t('analytics.product.retention.granularity')}>
        <ToggleButton value="DAY">{t('analytics.product.retention.byDay')}</ToggleButton>
        <ToggleButton value="WEEK">{t('analytics.product.retention.byWeek')}</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
  return (
    <ProductPage
      copy={PAGE_COPY.retention}
      actions={controls}
      testId="product-retention"
    >
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {loading && !table && <Loader variant="page" />}
      {table && granularity === 'DAY' && table.granularity === 'WEEK' && (
        <Alert severity="info">{t('analytics.product.retention.readByWeek')}</Alert>
      )}
      {table && (
        <DuncitTable
          key={`${table.granularity}-${table.offsets.length}`}
          tableId={`analytics-product-retention-${table.granularity.toLowerCase()}`}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={(row) => row.id}
          defaultPageSize={50}
          emptyText={t('analytics.product.empty')}
          ariaLabel={t('analytics.product.retention.title')}
        />
      )}
    </ProductPage>
  );
}
