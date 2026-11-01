import { useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import ProductPage from '../ProductPage';
import { PAGE_COPY } from '../page-copy';
import ProductFilterBar from '../ProductFilterBar';
import { useProductFilter } from '../useProductFilter';
import { PRODUCT_ELEMENTS_TABLE, type ProductElementRow } from '../queries';
import { elementColumns } from './element-columns';
import ElementDetail from './ElementDetail';

/** Analytics > Product > Clickstream — every control people pressed, per screen; a row opens its trend. */
export default function ClickstreamPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { period, setPeriod, filter } = useProductFilter();
  const [selected, setSelected] = useState<ProductElementRow | null>(null);
  const columns = useMemo(() => elementColumns(t), [t]);
  const fetchRows = useApolloTableFetch<ProductElementRow>(
    client,
    PRODUCT_ELEMENTS_TABLE,
    'productElementsTable',
    { extraVariables: { filter } },
    [filter]
  );
  return (
    <ProductPage
      copy={PAGE_COPY.clickstream}
      actions={<ProductFilterBar value={period} onChange={setPeriod} />}
      testId="product-clickstream"
    >
      <DuncitTable
        tableId="analytics-product-clickstream"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => `${row.screen_name}\u0000${row.key}`}
        onRowClick={setSelected}
        defaultSort={{ field: 'clicks', dir: 'desc' }}
        searchPlaceholder={t('analytics.product.clickstream.search')}
        emptyText={t('analytics.product.empty')}
        ariaLabel={t('analytics.product.clickstream.title')}
      />
      <ElementDetail element={selected} filter={filter} onClose={() => setSelected(null)} />
    </ProductPage>
  );
}
