import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { SectionCard } from '@duncit/ui';
import ClientTable from '../../components/ClientTable';
import ProductCardRow from '../../components/ProductCardRow';
import { money } from '../../lib/format';
import type { StoreTopProduct } from './queries';

const productName = (row: StoreTopProduct) => row.name;
const productId = (row: StoreTopProduct) => row.product_id;

/** The period's best sellers by revenue — each row opening its listing. */
export default function TopProducts({ products }: Readonly<{ products: readonly StoreTopProduct[] }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const title = t('ecommPortal.dashboard.topProducts');
  const columns = useMemo<DuncitColumn<StoreTopProduct>[]>(
    () => [
      {
        field: 'name',
        headerName: t('ecommPortal.common.product'),
        type: 'text',
        flex: 1,
        minWidth: 220,
        cellRenderer: (row) => <ProductCardRow title={row.name} imageUrl={row.image_url} price={row.revenue} />,
      },
      { field: 'units', headerName: t('ecommPortal.dashboard.units'), type: 'number', width: 100 },
      { field: 'revenue', headerName: t('ecommPortal.dashboard.revenue'), type: 'number', width: 140, valueGetter: (row) => money(row.revenue) },
    ],
    [t],
  );
  return (
    <SectionCard title={title}>
      <ClientTable<StoreTopProduct>
        tableId="ecomm-dashboard-top-products"
        rows={products}
        columns={columns}
        searchOf={productName}
        getRowId={productId}
        ariaLabel={title}
        emptyText={t('ecommPortal.dashboard.noSales')}
        searchPlaceholder={t('ecommPortal.products.search')}
        onRowClick={(row) => navigate(`/products/${row.product_id}`)}
      />
    </SectionCard>
  );
}
