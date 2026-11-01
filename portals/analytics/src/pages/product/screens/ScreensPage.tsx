import { useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import ProductPage from '../ProductPage';
import { PAGE_COPY } from '../page-copy';
import ProductFilterBar from '../ProductFilterBar';
import { useProductFilter } from '../useProductFilter';
import { PRODUCT_SCREENS_TABLE, type ProductScreenRow } from '../queries';
import { screenColumns } from './screen-columns';
import ScreenDetail from './ScreenDetail';

/** Analytics > Product > Screens — every screen people opened, read from the events; a row opens its detail. */
export default function ScreensPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { period, setPeriod, filter } = useProductFilter();
  const [selected, setSelected] = useState<string | null>(null);
  const columns = useMemo(() => screenColumns(t), [t]);
  const fetchRows = useApolloTableFetch<ProductScreenRow>(
    client,
    PRODUCT_SCREENS_TABLE,
    'productScreensTable',
    { extraVariables: { filter } },
    [filter]
  );
  return (
    <ProductPage
      copy={PAGE_COPY.screens}
      actions={<ProductFilterBar value={period} onChange={setPeriod} />}
      testId="product-screens"
    >
      <DuncitTable
        tableId="analytics-product-screens"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.screen_name}
        onRowClick={(row) => setSelected(row.screen_name)}
        defaultSort={{ field: 'views', dir: 'desc' }}
        searchPlaceholder={t('analytics.product.screens.search')}
        emptyText={t('analytics.product.empty')}
        ariaLabel={t('analytics.product.screens.title')}
      />
      <ScreenDetail screen={selected} filter={filter} onClose={() => setSelected(null)} />
    </ProductPage>
  );
}
