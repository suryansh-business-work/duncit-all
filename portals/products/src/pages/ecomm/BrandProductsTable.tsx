import { useEffect, useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { Avatar, Chip } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '@duncit/app-settings';
import { MARKETPLACE_BRAND_PRODUCTS_TABLE, type BrandProductRow } from './queries';

interface Props {
  brandId: string;
}

const getRowId = (p: BrandProductRow) => p.id;

const renderCover = (p: BrandProductRow) => (
  <Avatar src={p.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {p.product_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

const priceValue = (p: BrandProductRow) => formatMoney(p.selling_price || p.unit_cost, { decimals: 2 });

const dimensionsLabel = (p: BrandProductRow) =>
  `${p.length_cm}×${p.breadth_cm}×${p.height_cm} cm · ${p.weight_kg}kg`;

const renderDimensions = (p: BrandProductRow) => (
  <Chip size="small" variant="outlined" label={dimensionsLabel(p)} />
);

export default function BrandProductsTable({ brandId }: Readonly<Props>) {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { formatDate } = useDateFormat();

  const fetchRows = useApolloTableFetch<BrandProductRow>(
    client,
    MARKETPLACE_BRAND_PRODUCTS_TABLE,
    'marketplaceBrandProductsTable',
    { extraVariables: { brand_doc_id: brandId } },
    [brandId],
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
