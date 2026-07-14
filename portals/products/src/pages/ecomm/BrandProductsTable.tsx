import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { Avatar, Chip } from '@mui/material';
import {
  DuncitTable,
  tableQueryToGql,
  type DuncitColumn,
  type TableQueryState,
} from '@duncit/table';
import { useDateFormat } from '../../utils/dateFormat';
import { MARKETPLACE_BRAND_PRODUCTS_TABLE, type BrandProductRow } from './queries';

interface Props {
  brandId: string;
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

const getRowId = (p: BrandProductRow) => p.id;

const renderCover = (p: BrandProductRow) => (
  <Avatar src={p.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {p.product_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const priceValue = (p: BrandProductRow) => money.format(p.selling_price || p.unit_cost);

const dimensionsLabel = (p: BrandProductRow) =>
  `${p.length_cm}×${p.breadth_cm}×${p.height_cm} cm · ${p.weight_kg}kg`;

const renderDimensions = (p: BrandProductRow) => (
  <Chip size="small" variant="outlined" label={dimensionsLabel(p)} />
);

export default function BrandProductsTable({ brandId }: Readonly<Props>) {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { formatDate } = useDateFormat();

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: MARKETPLACE_BRAND_PRODUCTS_TABLE,
        variables: { brand_doc_id: brandId, ...tableQueryToGql(q) },
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.marketplaceBrandProductsTable.rows as BrandProductRow[],
        total: data.marketplaceBrandProductsTable.total as number,
      };
    },
    [client, brandId],
  );

  // Same route pattern → the component stays mounted when the brand param
  // changes, so reload the page-1 rows for the new brand explicitly.
  const lastBrandRef = useRef(brandId);
  useEffect(() => {
    if (lastBrandRef.current === brandId) return;
    lastBrandRef.current = brandId;
    refetchRef.current?.();
  }, [brandId]);

  const columns = useMemo<DuncitColumn<BrandProductRow>[]>(
    () => [
      { field: 'cover', headerName: '', sortable: false, width: 64, cellRenderer: renderCover },
      { field: 'product_name', headerName: 'Product', flex: 1, minWidth: 200 },
      { field: 'sku', headerName: 'SKU', width: 140 },
      {
        field: 'selling_price',
        headerName: 'Price',
        filter: { type: 'number' },
        width: 120,
        valueGetter: priceValue,
      },
      {
        field: 'available',
        headerName: 'Available',
        sortable: false,
        width: 100,
        valueGetter: (p) => p.available_count ?? p.inventory_count,
      },
      {
        field: 'commission_pct',
        headerName: 'Commission',
        filter: { type: 'number' },
        width: 120,
        valueGetter: (p) => `${p.commission_pct}%`,
      },
      {
        field: 'dimensions',
        headerName: 'Dimensions',
        sortable: false,
        minWidth: 180,
        cellRenderer: renderDimensions,
        valueGetter: dimensionsLabel,
      },
      {
        field: 'created_at',
        headerName: 'Added',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: (p) => (p.created_at ? formatDate(p.created_at) : '—'),
      },
    ],
    [formatDate],
  );

  return (
    <DuncitTable<BrandProductRow>
      tableId="products-brand-products"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText="This brand has no approved products yet."
      defaultSort={{ field: 'product_name', dir: 'asc' }}
      searchPlaceholder="Search product or SKU"
      refetchRef={refetchRef}
    />
  );
}
