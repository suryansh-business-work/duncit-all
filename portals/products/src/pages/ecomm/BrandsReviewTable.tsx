import { useMemo, type MutableRefObject } from 'react';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { BRAND_STATUS_OPTIONS } from './brandStatus';
import {
  completionValue,
  integrationsValue,
  locationValue,
  pickupValue,
  renderBrand,
  renderCompletion,
  renderIntegrations,
  renderLogo,
  renderPickup,
  renderStatus,
} from './brandReviewCells';
import type { EcommBrandRow } from './queries';

interface Props {
  fetchRows: TableFetch<EcommBrandRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onView: (b: EcommBrandRow) => void;
  onReview: (b: EcommBrandRow) => void;
}

const getRowId = (b: EcommBrandRow) => b.id;

export default function BrandsReviewTable({
  fetchRows,
  refetchRef,
  onView,
  onReview,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const columns = useMemo<DuncitColumn<EcommBrandRow>[]>(() => {
    // Rows open the brand, so the action must not also trigger the row click.
    const renderReview = (b: EcommBrandRow) => (
      <DuncitButton
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onReview(b);
        }}
      >
        {t('products.review.action')}
      </DuncitButton>
    );
    return [
      // A decorative thumbnail — no value to order or match.
      { field: 'logo', headerName: '', type: 'actions', width: 64, cellRenderer: renderLogo },
      {
        field: 'brand_name',
        headerName: t('products.brands.colBrand'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderBrand,
        valueGetter: (b) => b.brand_name,
      },
      {
        field: 'city',
        headerName: t('products.brands.colLocation'),
        type: 'text',
        minWidth: 150,
        valueGetter: locationValue,
      },
      {
        field: 'completion',
        headerName: t('products.brandReview.colCompletion'),
        type: 'number',
        // Resolved per row from the wizard's step checks — no stored path to order or match.
        sortable: false,
        filterable: false,
        width: 150,
        cellRenderer: (row: EcommBrandRow) => renderCompletion(row, t),
        valueGetter: completionValue,
      },
      {
        field: 'integrations',
        headerName: t('products.brandReview.colIntegration'),
        type: 'text',
        // Two vendor checks resolved per row — nothing stored to match a filter against.
        sortable: false,
        filterable: false,
        width: 140,
        cellRenderer: (row: EcommBrandRow) => renderIntegrations(row, t),
        valueGetter: (row: EcommBrandRow) => integrationsValue(row, t),
      },
      {
        field: 'approved_product_count',
        headerName: t('products.brands.colApprovedProducts'),
        type: 'number',
        // A count of the products collection resolved per row — the brand document holds no path to order or match.
        sortable: false,
        filterable: false,
        width: 150,
      },
      {
        field: 'pickup',
        headerName: t('products.review.colPickup'),
        type: 'boolean',
        // Derived from whether a pickup-location id is set — a yes/no filter cannot match an ObjectId path.
        filterable: false,
        width: 130,
        cellRenderer: (row: EcommBrandRow) => renderPickup(row, t),
        valueGetter: (row: EcommBrandRow) => pickupValue(row, t),
      },
      {
        // No column filter: the page's status tabs own the status scope and are
        // appended AFTER the column filters, so a column filter here would be
        // silently overridden on every tab but ALL. Mirrors ProductsReviewTable.
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        type: 'enum',
        options: BRAND_STATUS_OPTIONS,
        filterable: false,
        cellRenderer: renderStatus,
        valueGetter: (b) => b.status,
      },
      {
        field: 'submitted_at',
        headerName: t('products.review.colSubmitted'),
        type: 'date',
        width: 130,
        valueGetter: (b) => (b.submitted_at ? formatDate(b.submitted_at) : '—'),
      },
      {
        field: 'created_at',
        headerName: t('shell.common.created'),
        type: 'date',
        hide: true,
        width: 130,
        valueGetter: (b) => (b.created_at ? formatDate(b.created_at) : '—'),
      },
      { field: 'review', headerName: t('products.review.action'), type: 'actions', width: 110, cellRenderer: renderReview },
    ];
  }, [onReview, formatDate, t]);

  return (
    <DuncitTable<EcommBrandRow>
      ariaLabel={t('shell.nav.brandsReview')}
      tableId="products-ecomm-brands"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onView}
      emptyText={t('products.review.brandsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search brand, contact or city"
      refetchRef={refetchRef}
    />
  );
}
